import { ETHER, Percent, Router, Token, Trade } from "@godtoy/pancakeswap-sdk-v2";
import { MaxUint256 } from '@ethersproject/constants'
import { abi as IUniswapV2Router02ABI } from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import ERC20 from './abis/ERC20.json'
import { activateAccount, wallet, web3 } from './wallet'
import { getContractToken, useAllCommonPairs } from "./helper";
import { config, provider, WBNB } from "./config";
import { parseUnits } from '@ethersproject/units'
import { logger } from "./utils/logger";
import { Contract, ethers } from "ethers";
import isZero from "./utils/int";
import { tryParseAmount } from "./utils/wrappedCurrency";

const JSBI = require('jsbi')

const BIPS_BASE = JSBI.BigInt(10000)
// const ROUTER_ADDRESS = '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F';//PancakeSwap: Router v1
// const ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';//PancakeSwap: Router v2
const ROUTER_ADDRESS = config.ROUTE_ADDRESS

// @ts-ignore
const routerContract = new web3.eth.Contract(IUniswapV2Router02ABI, ROUTER_ADDRESS); //路由合约

const outputAddress = config.SWAP_OUTPUT_TOKEN;

const ERROR = 'Insufficient liquidity for this trade.';
export class Swapper {
    private outputToken: any;
    private readonly outputTokenAddress: string;
    private outputTokenContract
    private inputTokenContract;

    private inputToken: Token = WBNB;
    private tradeOptions = {
        maxHops: 3,
        maxNumResults: 1,
        // ...task.tradeOptions
    };
    private swapOptions = {
        feeOnTransfer: false,
        allowedSlippage: new Percent(JSBI.BigInt(Math.floor(1200)), BIPS_BASE), //滑动万分之..
        recipient: activateAccount.address, //account address
        ttl: 60 * 2, //2min,
        // ...task.swapOptions
    }

    private accountContract: Contract;
    private accountSwapContract: Contract;

    private isTrading = false;
    private cached: any = { route: "", price: "", };

    constructor(outAddress: string) {
        this.outputTokenAddress = outAddress
        this.accountContract = new ethers.Contract(this.inputToken.address, ERC20, provider)
        this.accountContract = this.accountContract.connect(wallet)
        this.accountSwapContract = new ethers.Contract(ROUTER_ADDRESS, IUniswapV2Router02ABI, provider).connect(wallet)
    }

    async init() {
        //init contract
        const { tokenOutput } = await getContractToken(this.outputTokenAddress)
        this.outputToken = tokenOutput
        logger.info(`OutputToken loaded:${this.outputTokenAddress} / ${this.outputToken.symbol} / ${this.outputToken.decimals}`)

        //1.授权output Token交易
        await this.approve(this.inputToken.address, MaxUint256)
        await this.approve(this.outputToken.address, MaxUint256)
        // await this.approve(BUSD.address, MaxUint256) //授权

        // this.inputTokenContract = new ethers.Contract(WBNB, ERC20, provider)
        this.outputTokenContract = new ethers.Contract(this.outputToken.address, ERC20, provider)
    }

    private async approve(spender: string, amount: any) {
        const add = await this.accountContract.allowance(wallet.address, spender)
        const apped = ethers.BigNumber.from(add)
        if (!apped.gt(0)) {
            const res = await this.accountContract.approve(spender, amount) //授权
            logger.warn(`approved: ${spender}`, apped.toString())
        }
    }

    //获取交易pairs列表
    async getPairs(): Promise<any> {
        return useAllCommonPairs(this.inputToken, this.outputToken)
    }

    //获取账户的现金余额
    async getBalances(): Promise<any> {
        const walletAddress = await wallet.getAddress()
        const outputBalance = await this.outputTokenContract.balanceOf(walletAddress) ///输出token的金额
        const valB = ethers.utils.formatUnits(outputBalance, this.outputToken.decimals).toString() //余额1
        return { output: outputBalance, outputAmount: valB }
    }

    async GetBuyTrade(amount) {
        const pairsList = await useAllCommonPairs(this.inputToken, this.outputToken)
        const curr = tryParseAmount(amount, ETHER) //parse amount 使用默认 ETHER 才会调用 swapExactETHForTokens
        return Trade.bestTradeExactIn(pairsList, curr, this.outputToken, this.tradeOptions)[0] ?? null
    }

    async GetSellTrade(amount) {
        const pairsList = await this.getPairs()
        const ip = this.outputToken
        // const op = this.inputToken //将什么给换出来
        const op = ETHER //BNB换出来
        const curr = tryParseAmount(amount, ip) //换出来
        return Trade.bestTradeExactIn(pairsList, curr, op, this.tradeOptions)[0] ?? null
    }

    tradeInfo(trade) {
        const executionPrice = trade.executionPrice.invert().toSignificant(6);
        const nextMidPrice = trade.nextMidPrice.invert().toSignificant(6);
        const outputAmount = trade.outputAmount.toSignificant(6);
        const inputAmount = trade.inputAmount.toSignificant(6);
        const priceImpact = trade.priceImpact.toSignificant(6);
        return { executionPrice, nextMidPrice, outputAmount, inputAmount, priceImpact }
    }

    private async gas(parameters, options): Promise<any> {
        return await this.accountSwapContract.estimateGas[parameters.methodName](...parameters.args, options);
    }

    async execSwap(amount: string, trade) {
        try {
            const info = this.tradeInfo(trade) //交易信息
            const startTime = Date.now()
            const parameters = Router.swapCallParameters(trade, this.swapOptions)
            const encoded_tx = routerContract.methods[parameters.methodName](...parameters.args).encodeABI();
            amount = ethers.utils.formatEther(parameters.value)
            const value = parseUnits(amount, trade.inputAmount.decimals)
            let transactionObject: any = {
                gasLimit: 2062883, //gas费用
                // value: value,//转账金额
                data: encoded_tx,
                from: activateAccount.address,
                to: ROUTER_ADDRESS,
                value: value,
            };
            let routeTag = `Swap:[${trade.inputAmount.currency.symbol}->${trade.outputAmount.currency.symbol}][price=]`
            let gas: any = "";
            try {
                const value = parameters.value;
                const options = !value || isZero(value) ? {} : { value }
                gas = await this.gas(parameters, options)
            } catch (e) {
                logger.error("gas.error:", e.reason)
            }
            if (gas) {
                // transactionObject.gasLimit = gas.toNumber() * 3 //使用3倍gas费
            }
            const wasteGas = Date.now() - startTime
            logger.trace(`Start.swap: ${routeTag} | ${parameters.methodName}, gasLimit:${gas.toString()} / Time:${wasteGas}ms,value: ${ethers.utils.formatUnits(value, trade.inputAmount.decimals).toString()}`)
            const res = await wallet.sendTransaction(transactionObject);
            const receipt = await res.wait();//等待区块确认
            const transTime = Date.now() - startTime
            if (receipt.status) {
                logger.info(`Transaction.success: ${routeTag} gasUsed:${receipt.gasUsed.toString()},time:${transTime}ms,confirmations:${receipt.confirmations}`);
            } else {
                logger.error("Swap.error:", receipt)
            }
        } catch (e) {
            logger.error("execSwapSell:", e.reason)
        }
        return
    }

    printTrade(tag: string, amount, trade) {
        const info = this.tradeInfo(trade)
        const old = { ...this.cached }
        // this.cached.route = SwapRoutePrint(trade).join('->')
        this.cached.price = info.executionPrice
        if (this.cached.route != old.route || this.cached.price != old.price) {
            // logger.warn(`[${tag}]Route.stateChange: ${SwapRoutePrint(trade).join('->')} / Price:${info.executionPrice},Input:${info.inputAmount},Output:${info.outputAmount}`)
        }
        return info
    }

    //do Sell
    async doBuyTrade(amount, trade) {
        const info = this.tradeInfo(trade)
        amount = info.inputAmount;
        // if (!this.isTrading && this.canBuyMore()) {
        //     this.isTrading = true
        //     await this.execSwap(amount, trade).finally(() => {
        //         this.isTrading = false
        //     })
        // }
    }


    //自动卖出
    private isSelling = false;//是否正在卖出

    public getPrc(currentPrice) {
        return currentPrice
    }


    public async autoSell(amount, info) {
        if (this.isSelling) return; //返回
        this.isSelling = true;
    }
}
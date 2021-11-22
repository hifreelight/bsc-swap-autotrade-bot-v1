import { BigNumber } from "bignumber.js";
import { ETHER, Percent, Router, Token, Trade } from "@godtoy/pancakeswap-sdk-v2";
import { MaxUint256 } from '@ethersproject/constants'
import { abi as IUniswapV2Router02ABI } from '@uniswap/v2-periphery/build/IUniswapV2Router02.json'
import ERC20 from '../abis/ERC20.json'
import { activateAccount, wallet, web3 } from '../wallet'
import { getContractToken, useAllCommonPairs } from "../helper";
import { config, provider, WBNB } from "../config";
import { parseUnits } from '@ethersproject/units'
import { logger } from "../utils/logger";
import { Contract, ethers } from "ethers";
import isZero from "../utils/int";
import { tryParseAmount } from "../utils/wrappedCurrency";
import { sleep } from "../utils/utils";
import EventEmitter from "events";

const schedule = require('node-schedule');
const JSBI = require('jsbi')

const BIPS_BASE = JSBI.BigInt(10000)
// const ROUTER_ADDRESS = '0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F';//PancakeSwap: Router v1
// const ROUTER_ADDRESS = '0x10ED43C718714eb63d5aA57B78B54704E256024E';//PancakeSwap: Router v2
const ROUTER_ADDRESS = config.ROUTE_ADDRESS

// @ts-ignore
const routerContract = new web3.eth.Contract(IUniswapV2Router02ABI, ROUTER_ADDRESS); //路由合约

const outputAddress = config.SWAP_OUTPUT_TOKEN;

const ERROR = 'Insufficient liquidity for this trade.';

describe('PriceTest', () => {
    /**
     * yarn ts-mocha -f 'test' src/tests/price.test.ts
     */
    it('test', async () => {

        console.log("test");
    });



});

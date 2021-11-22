
import { ChainId, Fetcher, Route, TokenAmount, Trade, TradeType, WETH } from "@godtoy/pancakeswap-sdk-v2";
import { config, provider, USDT, WBNB } from "../config";
import { Swapper } from "../swapper";

const outputAddress = config.SWAP_OUTPUT_TOKEN;

describe('SwapperTest', () => {
    /**
     * yarn ts-mocha -f 'swap' src/tests/swapper.test.ts --timeout=50000
     */
    it('swap', async () => {
        const swapper = new Swapper(outputAddress);
        swapper.init();
        const amount = "0.002";
        const trade = await swapper.GetBuyTrade(amount);
        console.log("swap trade is %o", trade);
    });

    /**
     * yarn ts-mocha -f 'priceYOUSDT' src/tests/swapper.test.ts --timeout=50000
     */
    it('priceYOUSDT', async () => {
        const chainId = ChainId.MAINNET;
        const yo = await Fetcher.fetchTokenData(chainId, outputAddress, provider);
        const weth = WETH[chainId];
        const usdt = USDT;
        const pairYOWETH = await Fetcher.fetchPairData(yo, weth, provider);
        const pairUSDTWETH = await Fetcher.fetchPairData(usdt, weth, provider);

        const priceYO = pairYOWETH.priceOf(yo).multiply(pairUSDTWETH.priceOf(weth)).toSignificant(6);
        console.log("yo price %s", priceYO);
    });

    /**
     * yarn ts-mocha -f 'priceYOWETH' src/tests/swapper.test.ts --timeout=50000
     */
    it('priceYOWETH', async () => {
        const chainId = ChainId.MAINNET;
        const yo = await Fetcher.fetchTokenData(chainId, outputAddress, provider);
        const weth = WETH[chainId];
        const pair = await Fetcher.fetchPairData(yo, weth, provider);
        const route = new Route([pair], weth);
        // const trade = new Trade(route, new TokenAmount(yo, '100000000000000000'), TradeType.EXACT_INPUT);

        // console.log("route: %s", JSON.stringify(route));
        console.log(route.midPrice.toSignificant(6));
        console.log("yo price %s", pair.priceOf(weth).toSignificant(6));
    });

    /**
     * yarn ts-mocha -f 'priceWETHUSDT' src/tests/swapper.test.ts --timeout=50000
     */
    it('priceWETHUSDT', async () => {
        const chainId = ChainId.MAINNET;
        const weth = WETH[chainId];
        const pair = await Fetcher.fetchPairData(USDT, weth, provider);
        const route = new Route([pair], weth);
        // const trade = new Trade(route, new TokenAmount(yo, '100000000000000000'), TradeType.EXACT_INPUT);

        // console.log("route: %s", JSON.stringify(route));
        console.log(route.midPrice.toSignificant(6));
    });


});

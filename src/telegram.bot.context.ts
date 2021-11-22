import { Telegraf } from 'telegraf'
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
import { sleep } from "./utils/utils";
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

// https://www.cnblogs.com/jameszou/p/10131443.html ERC20合约
//监控区块变动 有503 错误
// (() => {
//   console.log("websocketProvider: %s", websocketProvider);
//   const contract = new ethers.Contract(outputAddress, ERC20, websocketProvider).connect(wallet)
//   contract.on('Transfer', function (from, to, amount) {
//     logger.warn("Transfer.event: ", from, to, amount.toString())
//     console.log('started event1');
//     // console.log("purchaser:" + purchaser);
//     // console.log("value:" + value);
//     console.log("amount:" + amount, typeof amount);
//   })
// })();

const bot = new Telegraf(config.BOT_TOKEN)
console.log("token", config.BOT_TOKEN);

// bot.start((ctx) => ctx.reply('Welcome'))
// bot.help((ctx) => ctx.reply('Send me a sticker'))
// bot.on('sticker', (ctx) => ctx.reply('👍'))
// bot.hears('hi', (ctx) => ctx.reply('Hey there'))
// bot.launch()

bot.telegram.sendMessage(config.CHAT_ID, `Bot start`)
// bot.telegram.sendMessage(353839265, `Hello Frank`)

bot.command('quit', (ctx) => {
  // Explicit usage
  ctx.telegram.leaveChat(ctx.message.chat.id)

  // Using context shortcut
  ctx.leaveChat()
})

bot.command('oldschool', (ctx) => ctx.reply('Hello'))
bot.command('hipster', Telegraf.reply('λ'))

bot.on('text', (ctx) => {
  console.log("ctx.message.chat.id %d", ctx.message.chat.id);
  // console.log("ctx %o", ctx);
  // console.log("ctx.state %o", ctx.state);
  // Explicit usage
  ctx.telegram.sendMessage(ctx.message.chat.id, `Hello ${ctx.state.role}`)

  // Using context shortcut
  ctx.reply(`Hello ${ctx.state.role}`)
})

bot.on('callback_query', (ctx) => {
  // Explicit usage
  ctx.telegram.answerCbQuery(ctx.callbackQuery.id)

  // Using context shortcut
  ctx.answerCbQuery()
})

bot.on('inline_query', (ctx) => {
  const result = []
  // Explicit usage
  ctx.telegram.answerInlineQuery(ctx.inlineQuery.id, result)

  // Using context shortcut
  ctx.answerInlineQuery(result)
})

bot.launch()

// monitor price
const scheduleMonitor = async () => {

}
scheduleMonitor();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

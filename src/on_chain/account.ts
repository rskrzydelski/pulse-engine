import { debug } from '../store';
import { formatUnits } from 'ethers';

import {
    rpc_getPLSBalance,
    rpc_getTokenWalletData,
    rpc_getLPContractData,
    rpc_getMasterChefUserFarmsData,
    rpc_getUserPoolReceipts,
    rpc_getProvidedLiquidity,
} from './rpc/handler';
import { token_contracts, lp_token_contracts, protocol_contracts } from '../constants';
import type { GasPLSCost, Token, LpToken, DataBatch, MasterChefData, ProvidedLiquidity, PoolsReceipts, FirstLiquidityTimestamps } from '../types'

export const pls_hold = (balance: number) => {
    let league = "";
    if (balance >= 130000) league = "🦐";
    if (balance >= 1300000) league = "🦐🦀";
    if (balance >= 13000000) league = "🦐🦀🐢";
    if (balance >= 130000000) league = "🦐🦀🐢🦑";
    if (balance >= 1300000000) league = "🦐🦀🐢🦑🐬";
    if (balance >= 13000000000) league = "🦐🦀🐢🦑🐬🦈";
    if (balance >= 130000000000) league = "🦐🦀🐢🦑🐬🦈🐋";
    return league;
}

export const pulsex_hold = (balance: number) => {
    let league = "";
    if (balance >= 172000) league = "🦐";
    if (balance >= 1720000) league = "🦐🦀";
    if (balance >= 17200000) league = "🦐🦀🐢";
    if (balance >= 172000000) league = "🦐🦀🐢🦑";
    if (balance >= 1720000000) league = "🦐🦀🐢🦑🐬";
    if (balance >= 17200000000) league = "🦐🦀🐢🦑🐬🦈";
    if (balance >= 172000000000) league = "🦐🦀🐢🦑🐬🦈🐋"
    return league;
}

export const inc_hold = (balance: number) => {
  let league = "";
  if (balance > 0) league = "🦐";
  if (balance >= 0.293098417) league = "🦐🦀";
  if (balance >= 2.930984172) league = "🦐🦀🐢";
  if (balance >= 29.30984172) league = "🦐🦀🐢🦑";
  if (balance >= 293.0984172) league = "🦐🦀🐢🦑🐬";
  if (balance >= 2930.984172) league = "🦐🦀🐢🦑🐬🦈";
  if (balance >= 29309.84172) league = "🦐🦀🐢🦑🐬🦈🐋"
  if (balance >= 293098.4172) league = "🦐🦀🐢🦑🐬🦈🐋🔱"
  return league;
}
interface Icons {
  [key: string]: string;
}
  export const icons: Icons = {
    "PLS": "/pls.png",
    "PLSX": "/pulsex.png",
    "INC": "/inc.png",
    "HEX": "/phex.png",
    "PLP": "",
  }

export async function account_getUserWalletTokensData(user_address: string): Promise<Token[]> {
    const token_addr_list = Object.values(token_contracts);

    const tokens: Token[] = [];
    for (let i = 0; i < token_addr_list.length; i++) {
      const token = await rpc_getTokenWalletData(user_address, token_addr_list[i]);
      if (token?.balance === 0n) {
        continue;
      }
      tokens.push(token);
    }
    const balance = await rpc_getPLSBalance(user_address);

    // actually PLS is native coin instead of token, but for simplicity we keep assets in one array
    tokens.push({balance: balance, symbol: 'PLS'});

    if (debug) console.debug("🪙 account_getUserWalletTokensData: wallet tokens: ", tokens);
    return tokens;
}

export async function account_getUserWalletLPsData(user_address: string): Promise<LpToken[]> {
    const lp_list = Object.entries(lp_token_contracts);
    const LP_tokens: LpToken[] = [];
    for (let i = 0; i < lp_list.length; i++) {
      let version = "";
      if (lp_list[i][0].includes("V1")) {version = "V1"};
      if (lp_list[i][0].includes("V2")) {version = "V2"};

      const lp = await rpc_getLPContractData(user_address, lp_list[i][1]);
      lp.version = version;

      if (Number(lp?.balance) === 0.0) {
        continue;
      }
      LP_tokens.push(lp);
    }

    if (debug) console.debug("🪙 account_getUserWalletLPsData: wallet LP tokens: ", LP_tokens);
    return LP_tokens;
}

export async function account_masterChefUserFarmsData(user_address: string): Promise<MasterChefData> {
    const masterchef_data: MasterChefData = await rpc_getMasterChefUserFarmsData(user_address, protocol_contracts.PULSE_X_MASTER_CHEF);

    if (debug) console.debug("👨‍🌾 account_getMasterChefUserFarmsData: user farms data got from masterchef contract: ", masterchef_data);
    return masterchef_data;
}

export async function account_getRelevantReciepts(
  masterchef_data: MasterChefData,
  user_txs: [], 
  ) {

    const pools_receipts: PoolsReceipts = {}
    const pool_addresses = Object.keys(masterchef_data);
    // iterate farms
    for (let i = 0; i < pool_addresses.length; i++) {
      const farm = masterchef_data[pool_addresses[i]];
      const receipts = await rpc_getUserPoolReceipts(farm, pool_addresses[i], user_txs);
      pools_receipts[pool_addresses[i]] = receipts;
    }
    if (debug) console.debug("📜 account_getRelevantReciepts: receipts relevant to pools: ", pools_receipts);
    return pools_receipts;
}

export function account_getFirstLiquidityTimestamp(
  masterchef_data: MasterChefData, 
  pools_receipts: PoolsReceipts
  ) {
    const first_liquidity_timestamps: FirstLiquidityTimestamps = {}
    const pool_addresses = Object.keys(masterchef_data)

    // iterate farms
    for (let i = 0; i < pool_addresses.length; i++) {
      const receipts = pools_receipts[pool_addresses[i]]
      for (let r = 0; r < receipts.length; r++) {
        if (receipts[r].input_data.fragment.name === 'addLiquidityETH') {
          first_liquidity_timestamps[pool_addresses[i]] = receipts[r].timestamp
          break;
        }
      }
    }

    return first_liquidity_timestamps;
}

export async function account_getUserProvidedLiquidity(
  masterchef_data: MasterChefData, 
  pools_receipts: PoolsReceipts, 
  user_address: string
  ): Promise<ProvidedLiquidity> {
    const provided_liquidities: ProvidedLiquidity = {}
    const pool_addresses = Object.keys(masterchef_data)
    // iterate farms
    for (let i = 0; i < pool_addresses.length; i++) {
      const farm = masterchef_data[pool_addresses[i]];
      const receipts = pools_receipts[pool_addresses[i]]
      const add_rm_reciepts = receipts.filter(r => r.input_data?.fragment.name === 'removeLiquidityETHWithPermit').concat(receipts.filter(r => r.input_data?.fragment.name === 'addLiquidityETH'))

      const provided_liquidity = await rpc_getProvidedLiquidity(
        add_rm_reciepts, 
        user_address,
        pool_addresses[i],
        farm.token_A_symbol,
        farm.token_B_symbol,
      );

      if (provided_liquidity === null) {
        // TODO: log warrning
        continue;
      }

      if (debug) console.debug(`👉 Provided ${farm.token_A_symbol} token amount ${formatUnits(provided_liquidity[farm.token_A_symbol], 18)} and ${farm.token_B_symbol} token amount ${formatUnits(provided_liquidity[farm.token_B_symbol], 18)}`);
      provided_liquidities[pool_addresses[i]] = provided_liquidity;
    }

    return provided_liquidities;
}

export function account_collectDataBatch(
  masterchef_data: MasterChefData, 
  provided_liquidity: ProvidedLiquidity, 
  gas_pls_cost: GasPLSCost,
  first_liquidity_timestamps: FirstLiquidityTimestamps,
  ) {
  const pool_addresses = Object.keys(masterchef_data);
  const data_batches: DataBatch[] = [];

  // iterate pools
  for (let i = 0; i < pool_addresses.length; i++) {
    
    const farm = masterchef_data[pool_addresses[i]];
    const data_batch: DataBatch = {
      pool_address: pool_addresses[i],
      farm_name: farm.token_A_symbol + "-" + farm.token_B_symbol,
      farm: farm,
      provided_liquidity: provided_liquidity[pool_addresses[i]],
      gas_pls_cost: gas_pls_cost[pool_addresses[i]],
      first_liquidity_ts: first_liquidity_timestamps[pool_addresses[i]]
    }

    data_batches.push(data_batch);
  }
  if (debug) console.debug(`👉 Collected data batches ${data_batches}`);
  return data_batches;
}

    // for (let f = 0; f < farms_data.length; f++) {
    //   const receipts = await rpc_getUserPoolReceipts(farms_data[f], user_txs);

    //   // for now we support only pairs with WPLS
    //   if ((farms_data[f].token_A_symbol + farms_data[f].token_B_symbol).includes('WPLS')) {
    //     // iterate recepits which are related to particular farm
    //     for (let r = 0; r < receipts.length; r++) {
    //       if (receipts[r].input_data?.name === 'addLiquidityETH' || 
    //           receipts[r].input_data?.name === 'removeLiquidityETHWithPermit') {

    //           const data = await rpc_parseAddRmLiquidityETH(
    //             receipts[r],
    //             user_address,
    //             farms_data[f].pool_address
    //           );

    //           if (data === null || data.length === 0) {
    //             // TODO: add warrning log 
    //             continue;
    //           }

    //           const token_A_obj = data.find(item => item.symbol === farms_data[f].token_A_symbol);
    //           const token_B_obj = data.find(item => item.symbol === farms_data[f].token_B_symbol);
    //           const PLP_obj = data.find(item => item.symbol === 'PLP');

    //           if (token_A_obj === undefined || token_B_obj === undefined || PLP_obj === undefined) {
    //             // TODO: add warrning log
    //             continue;
    //           }

    //           farms_data[f].events.push({
    //             signature: receipts[r].input_data?.name,
    //             block_number: receipts[r].block_number,
    //             timestamp: receipts[r].timestamp,
    //             gas_used: receipts[r].gas_used,
    //             gas_price: receipts[r].gas_price,
    //             token_A: {symbol: token_A_obj.symbol, amount: token_A_obj.amount},
    //             token_B: {symbol: token_B_obj.symbol, amount: token_B_obj.amount},
    //             LP_minted: {symbol: PLP_obj.symbol, amount: PLP_obj.amount},
    //           });
    //       }

    //       if (receipts[r].input_data?.name === 'deposit') {
    //         const LP_deposited = await rpc_parseDeposit(receipts[r]);

    //         farms_data[f].events.push({
    //           signature: receipts[r].input_data?.name,
    //           block_number: receipts[r].block_number,
    //           timestamp: receipts[r].timestamp,
    //           gas_used: receipts[r].gas_used,
    //           gas_price: receipts[r].gas_price,
    //           LP_deposited: BigInt(LP_deposited),
    //         });
    //       }

    //       if (receipts[r].input_data?.name === 'withdraw') {
    //         const LP_withdraw = await rpc_parseWithdraw(receipts[r]);

    //         farms_data[f].events.push({
    //           signature: receipts[r].input_data?.name,
    //           block_number: receipts[r].block_number,
    //           timestamp: receipts[r].timestamp,
    //           gas_used: receipts[r].gas_used,
    //           gas_price: receipts[r].gas_price,
    //           LP_withdraw: BigInt(LP_withdraw),
    //         });
    //       }
    //     }
    //   } else {
    //     if (debug) console.debug(`--> account_assignEventsToFarms: pair: ${farms_data[f].token_A_symbol}-${farms_data[f].token_B_symbol} not supported`);
    //   }
    // }

    // if (debug) console.debug("--> account_assignEventsToFarms: events assigned: ", farms_data);
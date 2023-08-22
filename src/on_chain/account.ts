import { debug as debug_obj } from '../store';
import { formatUnits } from 'ethers';

import {
    rpc_getPLSBalance,
    rpc_getTokenWalletData,
    rpc_getLPContractData,
    rpc_getMasterChefUserFarmsData,
    rpc_getUserPoolReceipts,
    rpc_getProvidedLiquidity,
} from './rpc/handler';
import { abis, token_contracts, lp_token_contracts, lp_token_contracts_lookup, protocol_contracts } from '../constants';
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
    "ETH": "/eth.svg",
    "WETH": "/eth.svg",
    "PLP": "",
  }

let debug: boolean;
debug_obj.subscribe((value) => {
  debug = value;
});

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

function _isFarmSupported(pool_address: string): boolean {
  const pool_name = lp_token_contracts_lookup[pool_address.toLocaleLowerCase()];
  if (abis[pool_name] === undefined) return false;
  return true;
}

export async function account_masterChefUserFarmsData(user_address: string): Promise<MasterChefData> {
    const masterchef_data: MasterChefData = await rpc_getMasterChefUserFarmsData(user_address, protocol_contracts.PULSE_X_MASTER_CHEF);

    if (debug) console.debug("👨‍🌾 account_getMasterChefUserFarmsData: user farms data got from masterchef contract: ", masterchef_data);

    const found_pool_addresses = Object.keys(masterchef_data);
    for (let pool_idx = 0; pool_idx < found_pool_addresses.length; pool_idx++) {
      const status = _isFarmSupported(found_pool_addresses[pool_idx]);
      if (status === false) {
        if (debug) console.debug(`😥 account_getMasterChefUserFarmsData: can't find abi for pool address: ${found_pool_addresses[pool_idx]}, I skip this farm...`);
        if (debug) console.debug(`🚨 I perform rollback for this farm.`);
        delete masterchef_data[found_pool_addresses[pool_idx]]
      }
    }

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
      const farm = masterchef_data[pool_addresses[i]];
      const receipts = pools_receipts[pool_addresses[i]]
      for (let r = 0; r < receipts.length; r++) {
        
        const fr_name = farm.token_A_symbol === 'WPLS' || farm.token_B_symbol === 'WPLS' ? 'addLiquidityETH' : 'addLiquidity';

        if (receipts[r].input_data.fragment.name === fr_name) {
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

      const add_fr_name = farm.token_A_symbol === 'WPLS' || farm.token_B_symbol === 'WPLS' ? 'addLiquidityETH' : 'addLiquidity';
      const rm_fr_name = farm.token_A_symbol === 'WPLS' || farm.token_B_symbol === 'WPLS' ? 'removeLiquidityETHWithPermit' : 'removeLiquidityWithPermit';

      const add_rm_reciepts = receipts.filter(r => r.input_data?.fragment.name === rm_fr_name).concat(receipts.filter(r => r.input_data?.fragment.name === add_fr_name))
      let provided_liquidity = null

      try {
        provided_liquidity = await rpc_getProvidedLiquidity(
          add_rm_reciepts, 
          user_address,
          pool_addresses[i],
          farm.token_A_symbol,
          farm.token_B_symbol,
        );
      } catch (error) {
        if (debug) console.debug(`🚨 can't get provided liquidity for: ${farm.token_A_symbol + "-" + farm.token_B_symbol}.`);
        console.error(error);
        if (debug) console.debug(`🚨 I perform rollback for this farm.`);
        delete masterchef_data[pool_addresses[i]]
      }

      if (provided_liquidity === null) {
        // TODO: log warrning
        continue;
      }

      if (debug) console.debug(`👉 account_getUserProvidedLiquidity: Provided ${farm.token_A_symbol} token amount ${formatUnits(provided_liquidity[farm.token_A_symbol], 18)} and ${farm.token_B_symbol} token amount ${formatUnits(provided_liquidity[farm.token_B_symbol], 18)}`);
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
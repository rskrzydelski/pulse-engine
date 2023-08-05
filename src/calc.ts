import { debug } from './store';
import { formatUnits } from 'ethers';
import type { Token, Prices, Wallet, Farm, AddRmEvent, PoolsReceipts, GasPLSCost } from './types'

export function calc_userWalletValue(tokens: Token[], prices: Prices): Wallet {
    let total: number = 0;
    let wallet: Wallet = {};

    for (let i = 0; i < tokens.length; i++) {
      const price = prices[tokens[i].symbol];
      const balance = tokens[i].balance;
      if (isNaN(price)) {
        continue;
      }
      const dollar_value = price * Number(formatUnits(balance, 18));
      wallet[tokens[i].symbol] = '$' + dollar_value.toFixed(2);
      total = total + dollar_value;
    }
    wallet.total = '$' + total.toFixed(2);
    if (debug) console.debug("💵 calc_userWalletValue: calculated user wallet $: ", wallet);

    return wallet;
}

export function calc_gasConsumption(pools_receipts: PoolsReceipts) {
    const gas_pls_cost: GasPLSCost = {}
    const addrs = Object.keys(pools_receipts)

    // iterate pool addresses
    for (let i = 0; i < addrs.length; i++) {
      // iterate receipts relevant to pool
      let cost = 0n;
      for(let j = 0; j < pools_receipts[addrs[i]].length; j++) {
        const receipt = pools_receipts[addrs[i]][j];
        cost = cost + (receipt.gas_used * receipt.gas_price);
      }
      gas_pls_cost[addrs[i]] = cost;
    }
    return gas_pls_cost;
}

export function calc_LP_mintedSumByPool(farms_data: Farm[]) {
    // iterate farm by farm
    for (let f = 0; f < farms_data.length; f++) {
      let LP_minted = 0;
      // iterage add|rm liquidity events within farm
      for (let e = 0; e < farms_data[f].events.length; e++) {

        // take into account only add and rm liquidity, if not - skip
        if (farms_data[f].events[e].signature !== "addLiquidityETH" && 
        farms_data[f].events[e].signature !== "removeLiquidityETHWithPermit") {
            continue
        }

        // sum all minted LP token within particular farm
        LP_minted = LP_minted + farms_data[f].events[e].LP_minted.amount;
      }

      if (debug) console.debug('--> calc_LP_mintedSumByPool results: 👇');
      if (debug) console.debug(`                                    👉 minted LP ${farms_data[f].token_A_symbol}-${farms_data[f].token_B_symbol} token amount ${formatUnits(BigInt(LP_minted), 18)}`);
      if (debug) console.debug(`                                    👉 staked LP ${farms_data[f].token_A_symbol}-${farms_data[f].token_B_symbol} token amount ${farms_data[f].LP_staked}`);
    }
}

export function calc_LP_depositedSumAndCheckWithMasterChef(farms_data: Farm[]) {
    // iterate farm by farm
    for (let f = 0; f < farms_data.length; f++) {
      let LP_staked = 0n;

      // iterage add|rm liquidity events within farm
      for (let e = 0; e < farms_data[f].events.length; e++) {
        // take into account only add deposited tokens, if not - skip
        if (farms_data[f].events[e].signature !== "deposit") continue;
        LP_staked = LP_staked + farms_data[f].events[e].LP_deposited;
      }
      for (let e = 0; e < farms_data[f].events.length; e++) {
        // take into account only add withdrawed tokens, if not - skip
        if (farms_data[f].events[e].signature !== "withdraw") continue;
        LP_staked = LP_staked - farms_data[f].events[e].LP_withdraw;
      }

      const master_chef_value = farms_data[f].LP_staked.toFixed(4)
      const calc_value = Number(formatUnits(LP_staked, 18)).toFixed(4)
      if (master_chef_value !== calc_value) {
        console.error("🚨 LP tokens from master chef are not equal with calculated from transactions!");
        console.error(`🚨 I remove farm with pool address ${farms_data[f].pool_address}...`);
        farms_data.splice(f, 1);
      }
    }
}
// export function calc_account(farms_metric: Farm[]) {
//     for (let f = 0; f < farms_metric.length; f++) {
//         let LP_minted = 0;
//         // calc
//         for (let s = 0; s < farms_metric[f].states.length; s++) {
//             if (farms_metric[f].states[s].signature !== "addLiquidityETH" && farms_metric[f].states[s].signature !== "removeLiquidityETHWithPermit") continue;

//             LP_minted = LP_minted + farms_metric[f].states[s].LP_tokens.amount;
//             farms_metric[f].token_A_provided = farms_metric[f].token_A_provided + farms_metric[f].states[s].token_A.amount;
//             farms_metric[f].token_B_provided = farms_metric[f].token_B_provided + farms_metric[f].states[s].token_B.amount;
//         }
//         farms_metric[f].token_A_provided = formatUnits(BigInt(farms_metric[f].token_A_provided), 18);
//         farms_metric[f].token_B_provided = formatUnits(BigInt(farms_metric[f].token_B_provided), 18);

//         let LP_staked = 0n;
//         for (let s = 0; s < farms_metric[f].states.length; s++) {
//           if (farms_metric[f].states[s].signature !== "deposit") continue;
//           LP_staked = LP_staked + farms_metric[f].states[s].LP_deposited;
//         }
//         for (let s = 0; s < farms_metric[f].states.length; s++) {
//           if (farms_metric[f].states[s].signature !== "withdraw") continue;
//           LP_staked = LP_staked - farms_metric[f].states[s].LP_withdraw;
//         }

//         // console.log("LP deposited into farm ", Number(formatUnits(LP_staked, 18)).toFixed(4));
//         // console.log("LP readed from farm ", Number(Number(farms_metric[f].LP_staked).toFixed(4)));
//         // console.log("LP calc from add and rm liquidity ", Number(Number(formatUnits(BigInt(LP_minted), 18)).toFixed(4)));

//         if (Number(Number(farms_metric[f].LP_staked).toFixed(4)) !==
//             Number(Number(formatUnits(BigInt(LP_minted), 18)).toFixed(4))) {
//           console.error("LP tokens readed from farm contract and calculated from transactions are not equal!");
//         }

//         if (Number(farms_metric[f].LP_staked) <= 0.0) {
//           console.info("Liquidity from this farm is removed.");
//         }
//     }
// }


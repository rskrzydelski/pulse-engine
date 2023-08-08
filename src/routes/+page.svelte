<script>
  import { onMount } from 'svelte';
  import { prices, basic_metrics, user, debug } from '../store';

  import { graph_getLatestBlock } from '../on_chain/subgraph/blocks'
  import { graph_getTokenPrice } from '../on_chain/subgraph/pulsex'
  import { token_contracts } from '../constants'
  import { 
    account_getUserWalletTokensData, 
    account_getUserWalletLPsData,
    account_masterChefUserFarmsData,
    account_getRelevantReciepts,
    account_getUserProvidedLiquidity,
    account_getFirstLiquidityTimestamp,
    account_collectDataBatch,
  } from '../on_chain/account'
import {
  calc_userWalletValue, 
  calc_gasConsumption,
} from '../calc';

  import Board from '$lib/Board.svelte'
  import Portfolio from '$lib/Portfolio.svelte'

  let metrics = [];
  let user_data_update_timer;

  onMount(async () => {
    const interval_1 = setInterval(async () => {
      const block = await graph_getLatestBlock();
      $basic_metrics.current_block = block.number;
    }, 10000);

    const interval_2 = setInterval(async () => {
      const obj_pulsex = await graph_getTokenPrice(token_contracts.PLSX_TOKEN);
      const obj_phex = await graph_getTokenPrice(token_contracts.pHEX_TOKEN);
      const obj_inc = await graph_getTokenPrice(token_contracts.INC_TOKEN);

      $prices['PLSX'] = obj_pulsex.token_dollar_price;
      $prices['PLS'] = (1/Number(obj_pulsex.token_pls_price)) * Number(obj_pulsex.token_dollar_price);
      $prices['WPLS'] = (1/Number(obj_pulsex.token_pls_price)) * Number(obj_pulsex.token_dollar_price);
      $prices['pHEX'] = obj_phex.token_dollar_price;
      $prices['INC'] = obj_inc.token_dollar_price;
      // TODO: now it hardcoded - fetch proper data
      $prices['DAI'] = 1.0;
      $prices['USDC'] = 1.0;
      $prices['USDT'] = 1.0;
    }, 60000);

    const block = await graph_getLatestBlock();
    const obj_pulsex = await graph_getTokenPrice(token_contracts.PLSX_TOKEN);
    const obj_phex = await graph_getTokenPrice(token_contracts.pHEX_TOKEN);
    const obj_inc = await graph_getTokenPrice(token_contracts.INC_TOKEN);

    $basic_metrics.current_block = block.number;

    $prices['PLSX'] = obj_pulsex.token_dollar_price;
    $prices['PLS'] = (1 / Number(obj_pulsex.token_pls_price)) * Number(obj_pulsex.token_dollar_price);
    $prices['WPLS'] = (1 / Number(obj_pulsex.token_pls_price)) * Number(obj_pulsex.token_dollar_price);
    $prices['pHEX'] = obj_phex.token_dollar_price;
    $prices['INC'] = obj_inc.token_dollar_price;
    // TODO: now it hardcoded - fetch proper data
    $prices['DAI'] = 1.0;
    $prices['USDC'] = 1.0;
    $prices['USDT'] = 1.0;

    return () => {
      clearInterval(interval_1);
      clearInterval(interval_2);
    };
  })

  let fields = {address: ""};
  let errors = {address: ""};
  let valid = false;
  let on_chain = false;
  let data_collected = false;

  let performance_t1 = 0;
  let performance_t2 = 0;

  async function onSubmit() {
    performance_t1 = performance.now()
    valid = true;
    if (fields.address.trim().length !== 42) {
      valid = false;
      errors.address = "Address must be at least 42 characters long";
    } else {
      errors.address = "";
    }

    if (fields.address.trim().slice(0, 2) !== "0x") {
      valid = false;
      errors.address = "Address must start with 0x";
    } else {
      errors.address = "";
    }

    if (!valid) {
      setTimeout(() => {
        errors.address = "";
      }, 5000);
      return;
    }

    const user_address = fields.address.trim();
    fields.address = "";

    if ($debug) console.debug("🔗 start collecting on chain data... 🔗");
    on_chain = true;

    const tokens = await account_getUserWalletTokensData(user_address); // tokens which is not stored in farms
    const LP_tokens = await account_getUserWalletLPsData(user_address); // lp tokens which is not stored in farms
    const masterchef_data = await account_masterChefUserFarmsData(user_address); // farms data where user is participated

    const user_tx = await fetch(`api/user_tx?address=${user_address}`);
    const user_tx_json = await user_tx.json();
    const user_txs = user_tx_json.user_tx;

    const pools_receipts = await account_getRelevantReciepts(masterchef_data, user_txs);
    const prov_liquidities = await account_getUserProvidedLiquidity(masterchef_data, pools_receipts, user_address);
    const first_liquidity_timestamps = account_getFirstLiquidityTimestamp(masterchef_data, pools_receipts);

    const wallet = calc_userWalletValue(tokens, $prices);
    const gas_pls_cost = calc_gasConsumption(pools_receipts);
  
    const data_batches = account_collectDataBatch(
      masterchef_data, 
      prov_liquidities, 
      gas_pls_cost, 
      first_liquidity_timestamps
    );

    $user.user_address = user_address;
    $user.tokens = tokens;
    $user.LP_tokens = LP_tokens;
    $user.wallet = wallet;
    $user.data_batches = data_batches;

    // TODO: for now every interval we recalculate everything - find more efficient way to do this
    user_data_update_timer = setInterval(async () => {
      const tokens = await account_getUserWalletTokensData(user_address); // tokens which is not stored in farms
      const LP_tokens = await account_getUserWalletLPsData(user_address); // lp tokens which is not stored in farms
      const masterchef_data = await account_masterChefUserFarmsData(user_address); // farms data where user is participated

      const user_tx = await fetch(`api/user_tx?address=${user_address}`);
      const user_tx_json = await user_tx.json();
      const user_txs = user_tx_json.user_tx;

      const pools_receipts = await account_getRelevantReciepts(masterchef_data, user_txs);
      const prov_liquidities = await account_getUserProvidedLiquidity(masterchef_data, pools_receipts, user_address);
      const first_liquidity_timestamps = account_getFirstLiquidityTimestamp(masterchef_data, pools_receipts);

      const wallet = calc_userWalletValue(tokens, $prices);
      const gas_pls_cost = calc_gasConsumption(pools_receipts);
    
      const data_batches = account_collectDataBatch(
        masterchef_data, 
        prov_liquidities, 
        gas_pls_cost, 
        first_liquidity_timestamps
      );

      $user.user_address = user_address;
      $user.tokens = tokens;
      $user.LP_tokens = LP_tokens;
      $user.wallet = wallet;
      $user.data_batches = data_batches;
    }, 60000);

    on_chain = false;
    data_collected = true;

    performance_t2 = performance.now()
    if ($debug) console.debug("🔗 on chain journey finish. 🔗");
    if ($debug) console.debug(`🚄 performance time: ${performance_t2 - performance_t1} ms`);
  }

  function clear_account() {
    metrics.length = 0;
    $user.user_address = "";
    $user.tokens = [];
    $user.LP_tokens = [];
    data_collected = false;
    // clear timers
    clearInterval(user_data_update_timer);
  }
</script>

  <div class="dashboard">
    <div class="pulse-box {on_chain === true ? 'active': ''}">
      <svg version="1.1"  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
        viewBox="0 0 200 200" style="enable-background:new 0 0 200 200;" xml:space="preserve">
          <g>
            <polyline class="pulse" points="
            0,100 50,100 
            60,140 
            70,100 80,60 90,20 
            100,60 110,100 120,140 130,180
            140,140 150,100 160,60 
            170,100 210,100 	"/>
          </g>
      </svg>
    </div>

    <div class="logo">
      <p class="pulse-engine {on_chain === false ? 'active': ''}">Pulse Engine</p><span class="ver {on_chain === false ? 'active': ''}">version 0.0.2</span>
    </div>

    <form class="address-box {on_chain === true ? 'on-chain': ''}" on:submit|preventDefault={async (e) => await onSubmit(e)}>
        <div>
          <input
            type="text"
            id="address"
            bind:value={fields.address}
            placeholder="Type your address"
            aria-label="Address"
            disabled={data_collected}
            required
            />
        </div>
        <div>
          <button type="submit" aria-busy={on_chain} class="outline" disabled={data_collected}>look on chain 🔗</button>
        </div>
    </form>
    <div class="error">{ errors.address }</div>

    {#if $user.user_address !== ""}
      <div class="address">
        <div>{$user.user_address}</div>
        <i class="mi mi-circle-remove" on:click={clear_account}>
          <span class="u-sr-only">Circle remove</span>
        </i>
      </div>

      <p class="account-desc">💰 portfolio</p>
      <div class='portfolio-layout'>          
        <Portfolio />
      </div>
      <br />
      <br />
      <p class="account-desc">👨‍🌾 farms</p>
      {#each $user.data_batches as data}
        <div class='board-layout'>
          <Board {data} />
        </div>
      {/each}
    {/if}
  </div>

<style>
/* pulse animation */
.pulse-box {
  display: none;
}
.pulse-box.active {
  display: block;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 0;
  width: 14vh;
  height: 14vh;
}
.pulse-box svg {
	position: relative;
	transition: all 0.5s ease-in-out;
  border-radius: 50px;
}
.pulse-box svg .pulse {
	fill: none;
	stroke: #0080ff;
  filter: drop-shadow(0px 0px 5px #e619e6);
	stroke-width: 5;
	stroke-linecap: round;
	stroke-linejoin: miter;
	opacity: 0;
	stroke-dashoffset: 3000;
	stroke-dasharray: 1000;
	animation: pulse 1.5s linear forwards infinite;
}
@keyframes pulse {
    0% {
      opacity: 0;
    }
    25% {
      opacity: 1;
    }
    50% {
      stroke-dashoffset: 2000;
    }
    99% {
      opacity: 0;
      stroke-dashoffset: 1000;
    }
    100% {
      stroke-dashoffset: 3000;
    }
}

.logo {
  margin: 5vh auto;
  margin-top: 10vh;
}

.ver {
  display: none;
}
.ver.active {
  display: block;
  color: grey;
  font-size: 10px;
}

.pulse-engine {
  display: none;
}
.pulse-engine.active {
  display: block;
  background-size: 100%;
  background-clip: text;
  font-size: 32px;
  color: #ecedee;
  -webkit-background-clip: text;
    -moz-background-clip: text;
    -webkit-text-fill-color: transparent; 
    -moz-text-fill-color: transparent;
  background-image: linear-gradient(45deg, #F5A524 -20%, #F31260 100%);
  text-transform: uppercase;
  font-weight: bold;
}
@media screen and (max-width: 768px) {
  .pulse-engine.active {
    display: block;
    font-size: 28px;
  }
}
@media screen and (max-width: 480px) {
  .pulse-engine.active {
    display: block;
    font-size: 24px;
  }
}

.dashboard {
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.address-box.on-chain {
  display: none;
}
.address-box {
  margin: 10vh auto;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 50vw;
}


@media screen and (max-width: 768px) {
  .address-box {
    flex-direction: column;
  }
}
.address-box div input {
  width: 40vw;
  padding: 10px;
  font-size: 12px;
  border-radius: 10px;
  background: transparent;
  border: 1px solid gray;
  margin: 5px;
  color: white;
}
@media screen and (max-width: 480px) {
  .address-box div input {
    width: 90vw;
  }
}
.address-box button {
  cursor: pointer;
  font-size: 12px;
  padding: 10px;
  border-radius: 10px;
  background: var(--primary);
  text-transform: uppercase;
  background: transparent;
  color: white;
  margin: 5px;
}
.error {
  text-align: center;
  padding: 0;
  margin: 0;
  font-size: 12px;
  color: #f00;
}

.address {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  margin-bottom: 5vh;
}
@media screen and (max-width: 768px) {
  .address {
    font-size: 16px;
  }
}
@media screen and (max-width: 480px) {
  .address {
    font-size: 12px;
  }
}
.mi {
    margin-left: 10px;
		font-size: 1.4rem;
    cursor: pointer;
	}
	.u-sr-only {
		position: absolute;
    left: -10000px;
    top: auto;
    width:1px;
    height:1px;
    overflow:hidden;
	}

.account-desc {
  text-align: center;
}
.portfolio-layout {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  border: 1px solid gray;
  border-radius: 10px;
  font-size: 18px;
  margin: 0 auto;
  position: relative;
}

.board-layout {
  width: 95vw;
  margin: 0 auto;
  border-radius: 10px;
  border: 1px solid grey;  
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.address-box div input[disabled] {
  display: none;
}
.address-box button[disabled] {
  display: none;
}
</style>
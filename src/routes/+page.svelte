<script>
  import { getAddress } from 'ethers'
  import { onMount } from 'svelte';
  import Typewriter from 'svelte-typewriter'

  import { prices, basic_metrics, user, debug, diagnosis } from '../store';

  import { graph_getLatestBlock } from '../on_chain/subgraph/blocks'
  import { graph_getTokenPrice } from '../on_chain/subgraph/pulsex'
  import { getPriceFromEthereum } from '../cp_api';

  import { token_contracts, lp_token_contracts } from '../constants'
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

    const dai_price = await getPriceFromEthereum("dai");
    if (typeof dai_price === 'number' && dai_price > 0.0) {
      $prices['DAI'] = dai_price;
    } else {
      if ($debug) console.debug(`🚨 can't fetch dai price, I assign $1.0 by default.`);
      $prices['DAI'] = 1.0;
    }

    const usdc_price = await getPriceFromEthereum("usdc");
    if (typeof usdc_price === 'number' && usdc_price > 0.0) {
      $prices['USDC'] = usdc_price;
    } else {
      if ($debug) console.debug(`🚨 can't fetch usdc price, I assign $1.0 by default.`);
      $prices['USDC'] = 1.0;
    }

    const usdt_price = await getPriceFromEthereum("usdt");
    if (typeof usdt_price === 'number' && usdt_price > 0.0) {
      $prices['USDT'] = usdt_price;
    } else {
      if ($debug) console.debug(`🚨 can't fetch usdt price, I assign $1.0 by default.`);
      $prices['USDT'] = 1.0;
    }

    const eth_price = await getPriceFromEthereum("eth");
    if (typeof eth_price === 'number' && eth_price > 0.0) {
      $prices['ETH'] = eth_price;
      $prices['WETH'] = eth_price;
    } else {
      if ($debug) console.debug(`🚨 can't fetch eth price, I assign NaN by default.`);
      $prices['ETH'] = NaN;
      $prices['WETH'] = NaN;
    }

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

    const user_address = fields.address.trim();

    try {
      const validated_address = getAddress(user_address);
    } catch (error) {
       valid = false;
       errors.address = String(error);
    }

    if (!valid) {
      setTimeout(() => {
        errors.address = "";
      }, 5000);
      return;
    }

    fields.address = "";

    if ($debug) console.debug("🔗 start collecting on chain data... 🔗");
    on_chain = true;

    $diagnosis = "🪙 collecting wallet tokens...";
    const tokens = await account_getUserWalletTokensData(user_address); // tokens which is not stored in farms

    $diagnosis = "🪙 collecting LP tokens which are not staked...";
    const LP_tokens = await account_getUserWalletLPsData(user_address); // lp tokens which is not stored in farms

    $diagnosis = "👨‍🌾 collecting farms data from masterchef...";
    const masterchef_data = await account_masterChefUserFarmsData(user_address); // farms data where user is participated

    const user_tx = await fetch(`api/user_tx?address=${user_address}`);
    const user_tx_json = await user_tx.json();
    const user_txs = user_tx_json.user_tx;

    $diagnosis = "📜 collecting reciepts related to user account...";
    const pools_receipts = await account_getRelevantReciepts(masterchef_data, user_txs);

    $diagnosis = "👉 collecting provided liquidity by the user...";
    const prov_liquidities = await account_getUserProvidedLiquidity(masterchef_data, pools_receipts, user_address);

    $diagnosis = "⌚ collecting first liquidity timestamps...";
    const first_liquidity_timestamps = account_getFirstLiquidityTimestamp(masterchef_data, pools_receipts);

    $diagnosis = "📈 calculate user wallet value and ⛽ gas consumption...";
    const wallet = calc_userWalletValue(tokens, $prices);
    const gas_pls_cost = calc_gasConsumption(pools_receipts);
  
    $diagnosis = "📚 collecting gather data to data batch...";
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

    <div class="engine-diagnosis {on_chain === true ? 'active': ''}">
      <Typewriter>
        <h1>{$diagnosis}</h1>
      </Typewriter>      
    </div>

    <div class="logo">
      <p class="pulse-engine {on_chain === false ? 'active': ''}">Pulse Engine</p><span class="ver {on_chain === false ? 'active': ''}">version 0.0.3</span>
    </div>

    <div class="info-box {on_chain === false ? 'active': ''}">
      <div class="info">The app now supports the following pools: {Object.keys(lp_token_contracts).map(pool => pool.replace("_POOL", "") + " ")}.</div>
      <div class="info">This is a beta version, notice that it can have bugs and poor performance.</div>
      <div class="info"> I will refine this tool step by step.</div>
      <div class="info">I would appreciate your reporting any bugs, improvements, or new future ideas on my telegram channel 
        <div>
          <a href="https://t.me/+HP5p2Z33JatlZTBk"><img src="/telegram.png" alt="telegram"></a>
        </div>
      </div>
    </div>

    <form class="address-input-box {on_chain === true ? 'on-chain': ''}" on:submit|preventDefault={async (e) => await onSubmit(e)}>
        <div>
          <input
            type="text"
            id="address"
            bind:value={fields.address}
            placeholder="just type your public address to start analysis."
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

      <div class='box-layout'>
        <div class="legend">💰 portfolio</div>
        <Portfolio />
      </div>

      <div class='box-layout'>
        <div class="legend">👨‍🌾 farms</div>
        {#each $user.data_batches as data}
          <Board {data} />
        {/each}
      </div>
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
	stroke: #F5A524;
  filter: drop-shadow(0px 0px 5px #F31260);
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

.engine-diagnosis {
  display: none;
}
.engine-diagnosis.active {
  position: absolute;
  top: 65%;
  left: 50%;
  transform: translateX(-50%);
  display: block;
  color: grey;
  font-size: 10px;
  text-align: center;
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

.info-box {
  display: none;
}
.info-box.active {
  width: 95vw;
  color: grey;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 auto;
}
.info-box .info {
  display: flex;
  line-height: 5vh;
  font-size: 10px;
  text-align: center;
}
.info-box img {
  height: 5vh;
  width: 5vh;
}
@media screen and (max-width: 820px) {
  .info-box.active {
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .info-box .info {
    line-height: 2vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-width: 95vw;
  }
}
@media screen and (max-width: 480px) {
  .info-box.active {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .info-box .info {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 30px;
    text-align: center;
  }
  .info-box img {
    height: 5vh;
    width: 5vh;
  }
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

.address-input-box.on-chain {
  display: none;
}
.address-input-box {
  margin: 5vh auto;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 50vw;
}

.address-input-box button {
  width: 20vw;
}
@media screen and (max-width: 768px) {
  .address-input-box {
    flex-direction: column;
  }
  .address-input-box button {
    width: 40vw;
  }
}
.address-input-box div input {
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
  .address-input-box div input {
    width: 90vw;
  }
}
.address-input-box button {
  cursor: pointer;
  font-size: 12px;
  padding: 5px;
  border-radius: 10px;
  background: var(--primary);
  text-transform: uppercase;
  background: transparent;
  color: white;
  margin: 3px;
}
.address-input-box div input[disabled] {
  filter: blur(1px);
}
.address-input-box button[disabled] {
  filter: blur(1px);
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
  margin: 5vh 0 10vh 0;
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

.box-layout {
  border: 1px solid gray;
  border-radius: 10px;
  width: 95vw;
  margin: 2vh auto;
  text-align: center;
}
.legend {
  font-size: 24px;
  position: relative;
  top: -16px;
  display: inline;
  background: black;
  padding: 5px;
}
@media screen and (max-width: 768px) {
  .legend {
    font-size: 18px;
  }
}
@media screen and (max-width: 480px) {
  .legend {
    font-size: 16px;
  }
}
</style>
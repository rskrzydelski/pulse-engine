<script>
    import { formatUnits } from 'ethers';
    import {getOptions} from '../echart_utils/gauge';
    import { Chart } from 'svelte-echarts'
    import { onMount, onDestroy } from 'svelte';
    import { PricesCls, prices } from '../store';
    import { getUIFormatFromBigInt, getUIFormatNumber } from '../utils'

    export let data;

    let price = new PricesCls();
    const unsubscribe_price = prices.subscribe((obj) => price = obj);
    onDestroy(unsubscribe_price);

    let init_ratio = Number(formatUnits(data.provided_liquidity[data.farm.token_A_symbol], 18)) / Number(formatUnits(data.provided_liquidity[data.farm.token_B_symbol], 18))
    let current_ratio = Number(formatUnits(data.farm.LP_tokens_distribution[data.farm.token_A_symbol], 18)) / Number(formatUnits(data.farm.LP_tokens_distribution[data.farm.token_B_symbol], 18))

    function _normalize(ratio) {
      if (ratio > 1) {
        return ratio
      }
      const result = _normalize(ratio * 10);
      return result;
    }

    init_ratio = _normalize(init_ratio);
    current_ratio = _normalize(current_ratio);
  
    let options = getOptions(init_ratio.toFixed(2), current_ratio.toFixed(2));

    const first_liquidity_timestamp = data.first_liquidity_ts;

    let value_when_hold = (Number(formatUnits(data.provided_liquidity[data.farm.token_A_symbol], 18)) 
                        * Number(price[data.farm.token_A_symbol])) 
                        + (Number(formatUnits(data.provided_liquidity[data.farm.token_B_symbol], 18)) 
                        * Number(price[data.farm.token_B_symbol]))

    let value_in_the_pool = (Number(formatUnits(data.farm.LP_tokens_distribution[data.farm.token_A_symbol], 18)) 
                          * Number(price[data.farm.token_A_symbol])) 
                          + (Number(formatUnits(data.farm.LP_tokens_distribution[data.farm.token_B_symbol], 18)) 
                          * Number(price[data.farm.token_B_symbol])) 
                          -  Number(formatUnits(data.gas_pls_cost, 18)) * Number(price["PLS"]);

    
    let value_delta = value_in_the_pool - value_when_hold;
    let il_percent = ((1 - value_in_the_pool / value_when_hold) * 100).toFixed(3);

    let days = Math.floor(((Date.now() / 1000) - first_liquidity_timestamp)/60/60/24);
    let hours = Math.floor(((Date.now() / 1000) - first_liquidity_timestamp)/60/60) - days*24;
    let minuts = Math.floor(((Date.now() / 1000) - first_liquidity_timestamp)/60) - days*24*60 - hours*60
    let seconds = Math.floor(((Date.now() / 1000) - first_liquidity_timestamp)) - days*24*60*60 - hours*60*60 - minuts*60;

    function updatePoolDuration() {
        days = Math.floor(((Date.now() / 1000) - first_liquidity_timestamp)/60/60/24);
        hours = Math.floor(((Date.now() / 1000) - first_liquidity_timestamp)/60/60) - days*24;
        minuts = Math.floor(((Date.now() / 1000) - first_liquidity_timestamp)/60) - days*24*60 - hours*60
        seconds = Math.floor(((Date.now() / 1000) - first_liquidity_timestamp)) - days*24*60*60 - hours*60*60 - minuts*60;
    }

    function updateCalculations() {
      value_when_hold = (Number(formatUnits(data.provided_liquidity[data.farm.token_A_symbol], 18)) 
                        * Number(price[data.farm.token_A_symbol])) 
                        + (Number(formatUnits(data.provided_liquidity[data.farm.token_B_symbol], 18)) 
                        * Number(price[data.farm.token_B_symbol]))

      value_in_the_pool = (Number(formatUnits(data.farm.LP_tokens_distribution[data.farm.token_A_symbol], 18)) 
                          * Number(price[data.farm.token_A_symbol])) 
                          + (Number(formatUnits(data.farm.LP_tokens_distribution[data.farm.token_B_symbol], 18)) 
                          * Number(price[data.farm.token_B_symbol])) 
                          -  Number(formatUnits(data.gas_pls_cost, 18)) * Number(price["PLS"]);

      value_delta = value_in_the_pool - value_when_hold;
      il_percent = ((1 - value_in_the_pool / value_when_hold) * 100).toFixed(3);
    }

    let token_A_decimals = 18;
    let token_B_decimals = 18;
    

    if (['USDC', 'USDT'].includes(data.farm.token_A_symbol)) token_A_decimals = 6;
    if (['USDC', 'USDT'].includes(data.farm.token_B_symbol)) token_B_decimals = 6;
    if (data.farm.token_A_symbol === 'pHEX') token_A_decimals = 8;
    if (data.farm.token_B_symbol === 'pHEX') token_B_decimals = 8;

    onMount(() => {
          const interval_1 = setInterval(updatePoolDuration, 1000);
          const interval_2 = setInterval(updateCalculations, 60000);

          return () => {
            clearInterval(interval_1);
            clearInterval(interval_2);
          }          
    })
</script>

<div class="separator">
  <p>{data.farm.token_A_symbol}-{data.farm.token_B_symbol}</p>
</div>

<div class="pool-metric">
  <p>{data.pool_address}</p>
  <p>🔒 Deposited: {getUIFormatFromBigInt(data.farm.LP_staked)} LP</p>
  <p>🚜 To harvest: {getUIFormatFromBigInt(data.farm.pending_inc)} INC</p>
</div>

<div class="echart">
  <Chart {options} />
  <div>
    <p class='info'>indicator in the middle means no impermanent loss, more deviation, more impermanent loss.</p>
  </div>
</div>

<div class="pool-metric">
  <p>⛽ fuel consumption: {getUIFormatNumber(formatUnits(data.gas_pls_cost))} PLS</p>
  <p>🕕 pool livetime: {days}d {hours}h {minuts}m {seconds}s</p>
  <p>💸 current impernament loss: {il_percent}%</p>
</div>

<div class="table-container">
  <table class="table table-hover">
    <thead>
      <tr>
        <th></th>              
        <th>when hold 🏛️</th>
        <th>in the pool 🏄‍♂️</th>
        <th>delta</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row" class="cell">$ value</th>
        <td class="cell">$ {value_when_hold.toFixed(2)}</td>
        <td class="cell">$ {value_in_the_pool.toFixed(2)}</td>
        {#if value_delta >= 0}
          <td class="cell delta green">$ {value_delta.toFixed(4)}</td>
        {:else}
          <td class="cell delta red">$ {value_delta.toFixed(4)}</td>
        {/if}
      </tr>
      <tr>
        <th scope="row" class="cell">{data.farm.token_A_symbol} amount</th>
        <td class="cell">
          {getUIFormatFromBigInt(
            data.provided_liquidity[data.farm.token_A_symbol], 4, token_A_decimals)
          }
        </td>
        <td class="cell">
          {getUIFormatFromBigInt(
            data.farm.LP_tokens_distribution[data.farm.token_A_symbol], 4, token_A_decimals)
          }
        </td>

        {#if Number(data.farm.LP_tokens_distribution[data.farm.token_A_symbol]) - Number(data.provided_liquidity[data.farm.token_A_symbol]) >= 0}
          <td class="cell delta green">
            {getUIFormatFromBigInt(
              data.farm.LP_tokens_distribution[data.farm.token_A_symbol] - data.provided_liquidity[data.farm.token_A_symbol], 4, token_A_decimals)
            }
          </td>
        {:else}
          <td class="cell delta red">
            {getUIFormatFromBigInt(
              data.farm.LP_tokens_distribution[data.farm.token_A_symbol] - data.provided_liquidity[data.farm.token_A_symbol], 4, token_A_decimals)
            }
          </td>
        {/if}
      </tr>
      <tr>
        <th scope="row" class="cell">{data.farm.token_B_symbol} amount</th>
        <td class="cell">
          {getUIFormatFromBigInt(
            data.provided_liquidity[data.farm.token_B_symbol], 4, token_B_decimals)
          }
        </td>
        <td class="cell">
          {getUIFormatFromBigInt(
            data.farm.LP_tokens_distribution[data.farm.token_B_symbol], 4, token_B_decimals)
          }
        </td>
        {#if Number(data.farm.LP_tokens_distribution[data.farm.token_B_symbol]) - Number(data.provided_liquidity[data.farm.token_B_symbol]) >= 0}
          <td class="cell delta green">
            {getUIFormatFromBigInt(
              data.farm.LP_tokens_distribution[data.farm.token_B_symbol] - data.provided_liquidity[data.farm.token_B_symbol], 4, token_B_decimals)
            }
          </td>
        {:else}
          <td class="cell delta red">
            {getUIFormatFromBigInt(
              data.farm.LP_tokens_distribution[data.farm.token_B_symbol] - data.provided_liquidity[data.farm.token_B_symbol], 4, token_B_decimals)
            }
          </td>
        {/if}
      </tr>
    </tbody>
  </table>
</div>

<style>
   div {
    font-size: 14px;
    border: 1px solid grey;
    border-radius: 10px;
    margin: 10px;
    flex-basis: 28%;
    padding: 10px;
  }
  .echart {
    position: relative;
    z-index: 6;
    overflow: hidden;
    height: 50vh;
    flex-basis: 20%;
  }
  .pool-metric {
    text-align: center;
  }

  .table-container {
    margin: 0 auto;
  }
  .separator {
  background-size: 100%;
  background-clip: text;
  font-size: 18px;
  color: #ecedee;
  -webkit-background-clip: text;
    -moz-background-clip: text;
    -webkit-text-fill-color: transparent; 
    -moz-text-fill-color: transparent;
  background-image: linear-gradient(45deg, #F5A524 -20%, #F31260 100%);
  text-transform: uppercase;
  font-weight: bold;
  font-style: italic;
}

.info {
  position: absolute;
  top: 85%;
  left: 50%;
  transform: translateX(-50%);
  color: grey;
  font-size: 12px;
}
@media screen and (max-width: 480px) {
  .info {
    top: 83%;
    left: 2%;
    transform: translateX(0%);
  }
}


@media screen and (max-width: 768px) {
  div {
    flex-basis: 33.33%;
    font-size: 16px;
  }
}

@media screen and (max-width: 480px) {
    div {
      flex-basis: 100%;
      font-size: 12px;
    }
}

  table {
    color: white;
    background-color: black;
  }
  th {
    text-align: center;
    border-left: 1px solid white;
  }
  tr {
    border: 1px solid white;
  }
  td {
    border-top: 1px solid white;
    border-left: 1px solid white;
  }
  .cell {
    text-align: center;
  }
  .cell.delta.green {
    color: #0f5;
  }
  .cell.delta.red {
    color: #f00;
  }
</style>
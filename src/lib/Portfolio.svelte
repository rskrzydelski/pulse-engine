<script>
    import { user } from '../store';
    import { getUIFormatFromBigInt } from '../utils'
    import { icons, pls_hold, pulsex_hold, inc_hold } from '../on_chain/account'
    import { formatUnits } from 'ethers'

    let pls_pool_balance = 0n;
    let plsx_pool_balance = 0n;
    let inc_pool_balance = 0n;

    let pls_wallet_balance = $user.tokens.find(item => item.symbol === 'PLS')?.balance;
    let plsx_wallet_balance = $user.tokens.find(item => item.symbol === 'PLSX')?.balance;
    let inc_wallet_balance = $user.tokens.find(item => item.symbol === 'INC')?.balance;

    if (pls_wallet_balance === undefined) pls_wallet_balance = 0n;
    if (plsx_wallet_balance === undefined) plsx_wallet_balance = 0n;
    if (inc_wallet_balance === undefined) inc_wallet_balance = 0n;

    let inc_not_claimed = 0n;
    for (let d = 0; d < $user.data_batches.length; d++) {
      inc_not_claimed = inc_not_claimed + $user.data_batches[d].farm.pending_inc

      if ($user.data_batches[d].farm_name.includes("INC")) {
        inc_pool_balance = inc_pool_balance + $user.data_batches[d].farm.LP_tokens_distribution["INC"]
      }

      if ($user.data_batches[d].farm_name.includes("PLSX")) {
        plsx_pool_balance = plsx_pool_balance + $user.data_batches[d].farm.LP_tokens_distribution["PLSX"]
      }

      if ($user.data_batches[d].farm_name.includes("WPLS")) {
        pls_pool_balance = pls_pool_balance + $user.data_batches[d].farm.LP_tokens_distribution["WPLS"]
      }
    }

    const pls_balance = pls_wallet_balance  + pls_pool_balance;
    const plsx_balance = plsx_wallet_balance + plsx_pool_balance;
    const inc_balance = inc_wallet_balance + inc_pool_balance + inc_not_claimed; 

</script>
  <div class="wallet-box">
    tokens in wallet
    {#each $user.tokens as token}
      <div class="token">
        {getUIFormatFromBigInt(token.balance)}
        <img src={icons[token.symbol]} alt={icons[token.symbol]}/>
      </div>
    {/each}
  </div>

  <div class="status-box">
    Who you are in Pulse Ocean?
    <div class="token">
      <p>{getUIFormatFromBigInt(pls_balance)}</p>
      <img src={icons['PLS']} alt='PLS'/> {pls_hold(Number(formatUnits(pls_balance, 18)))}
    </div>
    <div class="token">
      <p>{getUIFormatFromBigInt(plsx_balance)}</p>
      <img src={icons['PLSX']} alt='PLSX'/> {pulsex_hold(Number(formatUnits(plsx_balance, 18)))}
    </div>
    <div class="token">
      <p>{getUIFormatFromBigInt(inc_balance)}</p>
      <img src={icons['INC']} alt='INC'/> {inc_hold(Number(formatUnits(inc_balance, 18)))}
    </div>
    <p class='info'>wallet + farms + not harvest</p>
  </div>

  {#each $user.LP_tokens as lp}
    <div class="token">{getUIFormatFromBigInt(lp.balance)} {lp.symbol} {lp.version}
      <img src={icons[lp.token_A]} alt={icons[lp.token_A]} />
      <img src={icons[lp.token_B]} alt={icons[lp.token_B]} />
    </div>
  {/each}

  <div class="value-box">
    dollar value:
    {#each $user.tokens as token}
      <div class="token">
        {token.symbol}<img src={icons[token.symbol]} alt={icons[token.symbol]}/> 💲{$user.wallet[token.symbol]}
      </div>
    {/each}
    <div class="token">total: 💲{$user.wallet.total}</div>
    <p class='info'>only wallet</p>
  </div>
<style>
img {
  padding: 0;
  margin: 0 10px;
  height: 3vh;
  width: 3vh;
}
.wallet-box {
  padding: 10px;
  text-align: center;
  border: 1px solid grey;
  border-radius: 10px;
  margin: 10px;
}
.token {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  margin: 8px 20px;
  padding: 6px;
  border-radius: 10px;
  text-align: center;
  flex-basis: 16.66%;
}

.status-box {
  text-align: center;
  border: 1px solid grey;
  border-radius: 10px;
  margin: 10px;
}
.info {
  color: grey;
  font-size: 12px;
}

.value-box {
  text-align: center;
  border: 1px solid grey;
  border-radius: 10px;
}

@media screen and (max-width: 768px) {
  .token {
    flex-basis: 33.33%;
    font-size: 16px;
  }
}

@media screen and (max-width: 480px) {
    .token {
      flex-basis: 100%;
      font-size: 12px;
    }
}
</style>
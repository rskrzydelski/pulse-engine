import { ethers, AbiCoder, keccak256 } from 'ethers';
import {
    abis,
    protocol_contracts_lookup,
    token_contracts_lookup,
    lp_token_contracts_lookup,
    all_contracts_lookup,
    protocol_contracts,
} from '../../constants';
import type {Farm, Token, Receipt, MasterChefData, Liquidity} from '../../types'

const provider = new ethers.JsonRpcProvider('https://rpc.pulsechain.com/');

export async function rpc_getPLSBalance(address: string): Promise<bigint> {
    let balance: bigint = 0n;
    try {
      balance = await provider.getBalance(address);
    } catch (err) {
      console.error(err);
    }
    return balance;
}

export async function rpc_getTokenWalletData(account_address: string, contract_address: string): Promise<Token> {
  let token: Token = {balance: 0n, symbol: ""};
  try {
    const contract = new ethers.Contract(contract_address, abis.TOKEN, provider);
    const balance = await contract.balanceOf(account_address);
    const sym = await contract.symbol();
    token = { balance: balance, symbol: sym }
  } catch (error) {
    console.error('Error:', error);
  }
  return token;
}

function _ifpHEXCustomizeSymbol(token_A: string, token0_addr: string, token_B: string, token1_addr: string) {
  // convert HEX symbol to pHEX is it is on pulsechain - it is needed because internal transactions pHEX symbol is used.
  // if not HEX then return unchanged
  if (token_A === 'HEX') {
    const token = token_contracts_lookup[token0_addr.toLowerCase()];
    token_A = token.replace("_TOKEN", "");
  }
  if (token_B === 'HEX') {
    const token = token_contracts_lookup[token1_addr.toLowerCase()];
    token_B = token.replace("_TOKEN", "");
  }

  return [token_A, token_B];
}

export async function rpc_getLPContractData(account_address: string, contract_address: string) {
  const contract = new ethers.Contract(contract_address, abis.PLSX_WPLS_V1_POOL, provider);
  const balance = await contract.balanceOf(account_address);
  const sym = await contract.symbol();

  const _token0_addr = await contract.token0();
  const _token1_addr = await contract.token1();
  const _con_0 = new ethers.Contract(_token0_addr, abis.TOKEN, provider);
  const _con_1 = new ethers.Contract(_token1_addr, abis.TOKEN, provider);

  let token_A = await _con_0.symbol();
  let token_B = await _con_1.symbol();

  const total_supply = await contract.totalSupply();
  const reserves = await contract.getReserves();

  [token_A, token_B] = _ifpHEXCustomizeSymbol(token_A, _token0_addr, token_B, _token1_addr);

  return {
    balance: balance,
    symbol: sym,
    token_A: token_A,
    token_B: token_B,
    token_A_addres: _token0_addr,
    token_B_addres: _token1_addr,
    total_supply: total_supply,
    reserves: reserves,
    version: '',
  }
}

export async function rpc_getMasterChefUserFarmsData(account_address: string, master_chef_address: string): Promise<MasterChefData> {
  const master_chef_c = new ethers.Contract(master_chef_address, abis.PULSE_X_MASTER_CHEF, provider);
  const len = await master_chef_c.poolLength();

  const masterchef_data: MasterChefData = {};

  for (let i = 0; i < len; i++) {
    const pool_info = await master_chef_c.poolInfo(i);
    const user_info = await master_chef_c.userInfo(i, account_address);
    const LP_staked: bigint = user_info['0'];
    const pool_address = pool_info['0'];

    if(LP_staked > 0) {
      const lp_obj = await rpc_getLPContractData(account_address, pool_address)

      // based on LP tokens calculate token_A and token_B amount
      const token_A_amount = (LP_staked * lp_obj.reserves[0]) / lp_obj.total_supply;
      const token_B_amount = (LP_staked * lp_obj.reserves[1]) / lp_obj.total_supply;

      // get unclaimed INC tokens
      const pending_inc = await master_chef_c.pendingInc(i, account_address);

      masterchef_data[pool_address] = {
        LP_staked: LP_staked,
        token_A_symbol: lp_obj.token_A,
        token_B_symbol: lp_obj.token_B,
        token_A_addres: lp_obj.token_A_addres,
        token_B_addres: lp_obj.token_B_addres,
        LP_tokens_distribution: {
            [lp_obj.token_A]: token_A_amount,
            [lp_obj.token_B]: token_B_amount,
        },
        pending_inc: pending_inc,
      }
    }
  }
  return masterchef_data;
}

function _filter_txs(user_txs: any[], lookup: Object) {
    // get only related to our contract set txs
    const txs: any[] = user_txs.filter((obj: any) => {
      // @ts-ignore
      if (lookup[obj.to.toLowerCase()] === undefined) return false;
      return true;
    })

    // sort - index 0 is oldest, last index is latest
    txs.sort((a: any, b: any) => {
      if (a?.blockNumber > b?.blockNumber) { return 1 }
      if (a?.blockNumber < b?.blockNumber) { return -1 }
      return 0;
    });

    return txs;
}

function _validate_receipt(r: ethers.TransactionReceipt | null, lookup: Object) {
  if (r === null) {
    // TODO: log to warning - can't get reception from this hash
    return false;
  }

  if (r.status !== 1) {
    // TODO: log to warning - can't find contract name from this address
    return false;
  }

  // @ts-ignore
  const to_name = lookup[r.to.toLowerCase()];

  if (to_name === undefined) {
     // TODO: log to warning - can't find contract name from this address
     return false;
  }

  // @ts-ignore
  if (abis[to_name] === undefined) {
     // TODO: log to warning - can't find ABI in my list
     return false;
  }

  return true;
}

function _validate_input(input: ethers.TransactionDescription | null, is_farm_with_wpls: boolean) {
  if (input === null) return false;

  // we look for abi fragment which is a function
  if (input?.fragment.type !== 'function') return false;
  
  // we look for abi fragment function from one of those lists:
  const allowed_fragments = is_farm_with_wpls ? 
  ['addLiquidityETH', 'removeLiquidityETHWithPermit', 'deposit', 'withdraw'] : 
  ['addLiquidity', 'removeLiquidityWithPermit', 'deposit', 'withdraw']
  
  const is_fragment_supported = allowed_fragments.find(item => item === input?.fragment.name);

  if (!is_fragment_supported) return false;
  return true;
}

async function _validate_signature(
  input: ethers.TransactionDescription | null, 
  lookup: Object, 
  lp_token_contracts_lookup: Object,
  pool_address: string, 
  token_A_address: string, 
  token_B_address: string
  ) {

    // TODO: add switch - better performance
  if (input.fragment.name === 'deposit') {
      // deposit request from my address to master_chef contract | text signature: deposit(uint256,uint256) | function deposit(uint256 _pid, uint256 _amount) public {}
      const pid = input.args['0'];
      const LP_addr_from_pid = await _getPairAddress(pid);
      if (lp_token_contracts_lookup[LP_addr_from_pid.toLowerCase()] !== 
          lp_token_contracts_lookup[pool_address.toLowerCase()]) 
      {
        return false;
      }
    }

    if (input.fragment.name === 'withdraw') {
      // withdraw request from my address to master_chef contract | text signature: withdraw(uint256,uint256) | function withdraw(uint256 _pid, uint256 _amount) public {}
      const pid = input.args['0'];
      const LP_addr_from_pid = await _getPairAddress(pid);
      if (lp_token_contracts_lookup[LP_addr_from_pid.toLowerCase()] !== 
          lp_token_contracts_lookup[pool_address.toLowerCase()]) 
      {
        return false;
      }
    }

    if (input.fragment.name === 'addLiquidityETH') {
      // addLiquidityETH request from my address to router contract | text signature: addLiquidityETH(address,uint256,uint256,uint256,address,uint256) | function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)
      if (lookup[token_A_address.toLowerCase()] !== token_contracts_lookup[input.args[0].toLowerCase()] && 
          lookup[token_B_address.toLowerCase()] !== token_contracts_lookup[input.args[0].toLowerCase()]) {
          return false;
      }
    }

    if (input.fragment.name === 'removeLiquidityETHWithPermit') {
      // removeLiquidityETHWithPermit request from my address to router contract | text signature: removeLiquidityETHWithPermit(address,uint256,uint256,uint256,address,uint256,bool,uint8,bytes32,bytes32) | function removeLiquidityETHWithPermit(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) external returns (uint amountToken, uint amountETH);
      if (lookup[token_A_address.toLowerCase()] !== token_contracts_lookup[input.args[0].toLowerCase()] && 
      lookup[token_B_address.toLowerCase()] !== token_contracts_lookup[input.args[0].toLowerCase()]) {
        return false;
      }
    }

  return true;
}

export async function rpc_getUserPoolReceipts(farm: Farm, pool_address: string, user_txs: any[]): Promise<Receipt[]> {
    // create lookup obj which contain provided pool address, all pulseX protocol contracts and token contracts
    let lookup: any = {}

    // @ts-ignore
    lookup[pool_address.toLowerCase()] = lp_token_contracts_lookup[pool_address.toLowerCase()];
    lookup[farm.token_A_addres.toLowerCase()] = token_contracts_lookup[farm.token_A_addres.toLowerCase()]
    lookup[farm.token_B_addres.toLowerCase()] = token_contracts_lookup[farm.token_B_addres.toLowerCase()];
    lookup = {...lookup, ...protocol_contracts_lookup}

    const is_farm_with_wpls = farm.token_A_symbol === 'WPLS' || farm.token_B_symbol === 'WPLS' ? true : false;
    const txs = _filter_txs(user_txs, lookup);

    // collect receipts
    const receipts: Receipt[] = []
    for (let i = 0; i < txs.length; i++) {
        const r = await provider.getTransactionReceipt(txs[i].hash);

        let ok = _validate_receipt(r, lookup);

        if (!ok) continue;

        const to_name = lookup[r.to.toLowerCase()];

        // @ts-ignore
        // get transaction data
        const iface = new ethers.Interface(abis[to_name]);
        const input = iface.parseTransaction({ data: txs[i].input });

        ok = _validate_input(input, is_farm_with_wpls)

        if (!ok) continue;

        ok = await _validate_signature(
          input, 
          lookup, 
          lp_token_contracts_lookup, 
          pool_address, 
          farm.token_A_addres, 
          farm.token_B_addres,
        );

        if (!ok) continue;

        let receipt: Receipt = {
          to: r.to, 
          from: r.from, 
          hash: r.hash, 
          block_number: r.blockNumber, 
          gas_price: r.gasPrice, 
          gas_used: r.gasUsed,
          timestamp: txs[i].timeStamp,
          to_name: to_name,
          input_data: input,
          logs: r.logs,
          }
        receipts.push(receipt);
    }
    return receipts;
}

async function _getPairAddress(pid: string) {
  const master_chef_c = new ethers.Contract(protocol_contracts['PULSE_X_MASTER_CHEF'], abis.PULSE_X_MASTER_CHEF, provider);
  const pairAddress = await master_chef_c.poolInfo(pid);
  return pairAddress.lpToken;
}

export async function rpc_getProvidedLiquidity(
  add_rm_reciepts: Receipt[], 
  user_address: string, 
  pool_address: string,
  token_A_symbol: string,
  token_B_symbol: string,
  ): Promise<Liquidity | null> {
    const liguidity: Liquidity = {
      [token_A_symbol]: 0n,
      [token_B_symbol]: 0n,
    }

    for (let i = 0; i < add_rm_reciepts.length; i++) {
      const data = [];
      const reciept = add_rm_reciepts[i]
      // iterate logs inside receipt
      for (let l = 0; l < reciept.logs.length; l++) {
        const {log_on_contract, event} = _parseReceiptLog(reciept.logs[l]);
        if (log_on_contract === null || event === null) continue;

        if (event.name === 'Transfer') {
          const transfer = _parseTransfer(log_on_contract, event, user_address, pool_address);
          if (transfer === null) {
            // TODO: log warrning
            continue;
          }
          data.push(transfer)
        }
      }

      const t_A = data.filter(item => item.symbol === token_A_symbol)[0]
      const t_B = data.filter(item => item.symbol === token_B_symbol)[0]

      liguidity[token_A_symbol] = liguidity[token_A_symbol] + t_A.amount;
      liguidity[token_B_symbol] = liguidity[token_B_symbol] + t_B.amount;
    }
    return liguidity;
}

function _parseReceiptLog(log: ethers.Log) {
    const log_on_contract: string | null = all_contracts_lookup[log.address.toLowerCase()];
    const abi = abis[log_on_contract]

    if (abi === undefined) {
      return {log_on_contract: null, event: null};
    }

    const iface = new ethers.Interface(abi);
    const topics: string[] = <string[]>log.topics;
    const data: string = log.data;
    const event = iface.parseLog({topics, data});

    return {log_on_contract, event};
}

// + Token_A, Token_B - when you add liquidity to pool
// my_account (source) ---> lp pool (destination)
// + LP - when I achieve tokens to my account
// lp pool (source) ---> my_account (destination)
function _parseTransfer(log_on_contract: string, event: ethers.LogDescription, user_address: string, pool_address: string) {
    let symbol = "";
    let amount: bigint = 0n;
    let source = event.args[0].toLowerCase()
    let destination = event.args[1].toLowerCase()
    let source_name = all_contracts_lookup[source];
    let destination_name = all_contracts_lookup[destination];
    let pool_address_name = all_contracts_lookup[pool_address.toLowerCase()];

    if (log_on_contract.includes('_POOL')) {
        // you receive LP tokens - (+) sign
        if (user_address.toLowerCase() === destination) {
            symbol = "PLP"
            amount = event.args['2'];
        }
        // you send LP tokens - (-) sign
        if (user_address.toLowerCase() === source) {
            symbol = "PLP"
            amount = -1n * event.args['2'];
        }
        if (destination_name === 'PLSX_BUY_AND_BURN') {
            symbol = "PLP_burned"
            amount = event.args['2'];
        }
    }
    if (log_on_contract.includes('_TOKEN')) {
        // you add tokens_A/B to LP - (+) sign
        if (user_address.toLowerCase() === source) {
            if (log_on_contract.includes("FROM_ETHEREUM")) {
              symbol = log_on_contract.replace(/_FROM_ETHEREUM_TOKEN/, '');
            } else {
              symbol = log_on_contract.replace(/_TOKEN/, '');
            }
            amount = event.args['2'];
        }
        // WPLS tokens are sended to LP by Router contract and route them to pool
        if ('PULSE_X_ROUTER_02' === source_name && pool_address_name === destination_name) {
            symbol = log_on_contract.replace(/_TOKEN/, '');
            amount = event.args['2'];
        }
        // you remmoves tokens_A/B from LP - (-) sign
        if (user_address.toLowerCase() === destination) {
            symbol = log_on_contract.replace(/_TOKEN/, '');
            amount = -1n * event.args['2'];
        }
        if (pool_address_name === source_name && 'PULSE_X_ROUTER_02' === destination_name && log_on_contract.includes('WPLS')) {
            symbol = log_on_contract.replace(/_TOKEN/, '');
            amount = -1n * event.args['2'];
        }
    }

    if (symbol === '' || amount === 0n) return null;

    return {symbol, amount}
}

export async function rpc_parseDeposit(receipt: Receipt) {
  let LP_deposited = 0;
  // iterate logs inside receipt
  for (let l = 0; l < receipt.logs.length; l++) {
    const { event } = _parseReceiptLog(receipt.logs[l]);
    if (event?.name === 'Deposit' && event.args[2] > 0n) {
      LP_deposited = event.args[2];
    }
  }
  return LP_deposited;
}

export async function rpc_parseWithdraw(receipt: Receipt) {
  let LP_withdraw = 0;
  // iterate logs inside receipt
  for (let l = 0; l < receipt.logs.length; l++) {
    const { event } = _parseReceiptLog(receipt.logs[l]);
    if (event?.name === 'Withdraw') {
      LP_withdraw = event?.args[2];
    }
  }
  return LP_withdraw;
}

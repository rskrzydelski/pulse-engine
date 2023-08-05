import type { ethers } from 'ethers';


interface LpTokensAmount {
    [key: string]: bigint;
}
export interface Farm {
    LP_staked: bigint; // staked tokens in the farm
    token_A_symbol: string;
    token_B_symbol: string;
    token_A_addres: string;
    token_B_addres: string;
    LP_tokens_distribution: LpTokensAmount;
    pending_inc: bigint;
}
export interface MasterChefData {
  [pool_address: string]: Farm;
}

export interface PoolsReceipts {
  [key: string]: any;
}

export interface GasPLSCost {
  [key: string]: any;
}

export interface Liquidity {
    [key: string]: bigint;
}
export interface ProvidedLiquidity {
    [key: string]: Liquidity;
}

export interface FirstLiquidityTimestamps {
    [key: string]: string;
}

export interface DataBatch {
    pool_address: string;
    farm_name: string;
    farm: Farm;
    provided_liquidity: Liquidity;
    gas_pls_cost: GasPLSCost;
    first_liquidity_ts: string;
}

// export interface Farm {
//   LP_tokens_not_staked: number;
// }

export interface AddRmEvent {
    signature: string | undefined;
    block_number: number;
    timestamp: string;
    gas_used: bigint;
    gas_price: bigint;
    token_A?: {
        symbol: string;
        amount: number;
    };
    token_B?: {
        symbol: string;
        amount: number;
    };
    LP_minted?: {
        symbol: string;
        amount: number;
    };
}

export interface Receipt {
    to: string | null;
    from: string | null;
    hash: string; 
    block_number: number;
    gas_price: bigint;
    gas_used: bigint;
    input_data: ethers.TransactionDescription | null;
    timestamp: string;
    to_name: string;
    logs: readonly ethers.Log[];
}

export interface Token {
    balance: bigint;
    symbol: "PLS" | "PLSX" | "HEX" | "INC" | "DAI" | "";
}

export interface LpToken {
    balance: bigint;
    symbol: "PLS" | "PLSX" | "HEX" | "INC" | "DAI" | "";
    token_A: string;
    token_B: string;
    total_supply: number;
    reserves: number[];
    version: string;
}

export interface Prices {
    [key: string]: number;
}

export interface Wallet {
    [key: string]: string
}

export interface UserTx {
    blockNumber: string;
    cumulativeGasUsed: string;
    from: string;
    gas: string;
    gasPrice: string;
    gasUsed: string;
    hash: string;
    isError: string;
    timeStamp: string;
    to: string;
    to_name: string;
}
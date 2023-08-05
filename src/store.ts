import { PUBLIC_SNAPSHOT_BLOCK_NUMBER } from '$env/static/public';
import { writable } from "svelte/store";
import type { DataBatch, Token, LpToken, Wallet} from './types'

export class BasicMetricsCls {
    current_block = parseInt(PUBLIC_SNAPSHOT_BLOCK_NUMBER);
}

export class PricesCls {
    [key: string]: number;
}

export class UserCls {
    user_address: string = '';
    tokens: Token[] = [];
    LP_tokens: LpToken[] = [];
    wallet: Wallet = {};
    data_batches: DataBatch[] = [];
}

export const basic_metrics = writable(new BasicMetricsCls());
export const prices = writable(new PricesCls());
export const user = writable(new UserCls());
export const debug = writable(true);
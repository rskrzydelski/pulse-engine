import type { BigNumberish } from 'ethers';
import { formatUnits } from 'ethers';


export const getUIFormatNumber = (value: BigNumberish, prec: number = 4) => Number(value).toFixed(prec);
export const getUIFormatFromBigInt = (value: bigint, prec: number = 4, decimals: number = 18) => 
    Number(formatUnits(value, decimals)).toFixed(prec);

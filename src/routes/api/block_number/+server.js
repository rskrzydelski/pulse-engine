import { json } from '@sveltejs/kit';

export async function GET({ url }) {
    const res = await fetch("https://scan.pulsechain.com/api?module=block&action=eth_block_number");
    const data = await res.json();
    const blocknumber = parseInt(data.result);
    return json({ blocknumber:  blocknumber});
  }
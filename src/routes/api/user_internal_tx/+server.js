import { json } from '@sveltejs/kit';

export async function GET({ url }) {
  const hash = url.searchParams.get('hash');
  const res = await fetch(`https://scan.pulsechain.com/api?module=account&action=txlistinternal&txhash=${hash}`);
  const data = await res.json();
  return json(data.result);
}

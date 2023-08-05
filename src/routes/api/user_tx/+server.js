import { json } from '@sveltejs/kit';

export async function GET({ url }) {
  const address = url.searchParams.get('address');
  const res = await fetch(`https://scan.pulsechain.com/api?module=account&action=txlist&address=${address}`);
  const data = await res.json();
  return json({ user_tx:  data.result});
}

import { json } from '@sveltejs/kit';

export async function GET({ url }) {
  const start_block = url.searchParams.get('start_block');
  const end_block = url.searchParams.get('end_block');

  const res = await fetch(`https://scan.pulsechain.com/api?module=account&action=tokentx&address=0x168a0fCD3c7a87b5fD7aC4138F9F73e9d4Bf7151&start_block=${start_block}&end_block=${end_block}`);
  const data = await res.json();
  return json(data.result);
}



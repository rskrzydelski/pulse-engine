import { json } from '@sveltejs/kit';

const cp_api = "https://api.coinpaprika.com/v1";

const tickers = {
    dai: 'dai-dai',
    usdc: 'usdc-usd-coin',
    usdt: 'usdt-tether',
    eth: 'eth-ethereum',
}

export async function GET({ url }) {
    const coin = url.searchParams.get('ticker');
    const ticker = tickers[coin];

    const res = await fetch(`${cp_api}/tickers/${ticker}`);
    const data = await res.json();
    const price = data.quotes.USD.price;
    return json({ price: price});
}

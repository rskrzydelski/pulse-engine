export async function getStableFromEthereumPrices(coin: string) {
    let res = await fetch(`api/cp?ticker=${coin}`);
    const data = await res.json();
    return data.price;
}
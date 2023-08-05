const graphql_url: string =  'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsex';


export async function graph_getTokenPrice(contract_address: string) {
    let obj = {token_dollar_price: NaN, token_pls_price: NaN}
    const res = await fetch(graphql_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"query":`query MyQuery {\n  token(id: \"${contract_address}\") {\n    derivedUSD\n    derivedPLS\n  }\n}`,"variables":null,"operationName":"MyQuery","extensions":{"headers":null}})
    });
    const data = await res.json();

    try {
        const dollar_price = Number(data.data.token.derivedUSD);
        const pls_price = Number(data.data.token.derivedPLS);
        obj = {token_dollar_price: dollar_price, token_pls_price: pls_price}
    } catch (err) {
        console.error(err);
    }

    return obj
}

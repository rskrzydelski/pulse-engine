const graphql_url: string =  'https://graph.pulsechain.com/subgraphs/name/pulsechain/blocks';


export async function graph_getLatestBlock() {
    const res = await fetch(graphql_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"query":"query MyQuery {\n  blocks(first: 1, orderBy: timestamp, orderDirection: desc) {\n    id\n    number\n    timestamp\n  }\n}","variables":null,"operationName":"MyQuery","extensions":{"headers":null}})
    });
    const data = await res.json();
    const block = data.data.blocks[0];
    return block;
}
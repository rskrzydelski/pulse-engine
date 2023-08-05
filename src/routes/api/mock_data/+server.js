import { json } from '@sveltejs/kit';

const data = {
  "my_pools": [
    {
      "pool": {
        "id": "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
        "createdAtBlockNumber": "12370624",
        "createdDate": "1684166205", // 15-05-23
        "liquidity": "6980741904116920241",
        "ratio": 2.5,
        "name": "PLSX-PLS",
        "token0": {
          "symbol": "PLSX",
          "amount": 1000000
        },
        "token1": {
          "symbol": "PLS",
          "amount": 400000
        },
        "status": "live",
      },
    },
    {
      "pool": {
        "id": "0x0e2c4be9f3408e5b1ff631576d946eb8c224b5ed",
        "createdAtBlockNumber": "12376507",
        "createdDate": "1684598205", // 20-05-23
        "liquidity": "189013351520600453609051",
        "ratio": 185598,
        "name": "INC-WPLS",
        "token0": {
          "symbol": "INC",
          "amount": 100
        },
        "token1": {
          "symbol": "WPLS",
          "amount": 18557100
        },
        "status": "finished",
      },
    },
    {
      "pool": {
        "id": "0xcbcdf9626bc03e24f779434178a73a0b4bad62ed",
        "createdAtBlockNumber": "12369821",
        "createdDate": "1685635005", // 01-06-23
        "liquidity": "1876188545049492195",
        "ratio": 119.88,
        "name": "HEX-WPLS",
        "token0": {
          "symbol": "HEX",
          "amount": 1000
        },
        "token1": {
          "symbol": "WPLS",
          "amount": 119881
        },
        "status": "live",
      },
    }
  ]
}

export async function GET() {
    return json({positions :  data});
}

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-waffle";
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import dotenv from 'dotenv';
dotenv.config();

export default {

  solidity: {
    compilers: [
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: "0.5.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
      {
        version: "0.8.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
    ],
  },

networks: {
  development: {
    url: 'https://127.0.0.1:8545',
      accounts: [process.env.PRIVATE_KEY],
  },
  dogechain: {
    url: 'https://rpc01-sg.dogechain.dog',
    chainid: 2000,
      accounts: [process.env.PRIVATE_KEY],
      gasprice: 700,//"auto",
      gas: 5000000,
      gasMultiplier: 100,
      timeout: 10000000,
  },
  hardhat: {
    forking: {
      url: 'https://rpc01-sg.dogechain.dog',
        accounts: [process.env.PRIVATE_KEY],
          nonce: 0
    }
  }
},
};



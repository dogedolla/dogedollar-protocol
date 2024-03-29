# Doge Dolla

## setup using hardhat

- `yarn install`
- `yarn compile`

## deploy

copy .env and add own env variables

- `cp .env.example .env`

run deployment script

- `yarn deploy:[network]`

## test

- `yarn test`

You can also run tests with solidity coverage:

- `yarn coverage`

## information

- shorthand name: `dynamic dollar`
- full name: `Doge Dolla`
- symbol: `DOGEDOLA`
- decimals: `18`
- icon:

![DOGEDOLA Logo](https://dogedollar.finance/logo.png)

## contracts

### mainnet

- `0x6Bf977ED1A09214E6209F4EA5f525261f1A2690a` **DAO (DOGEDAO)**
- `0xbd2f0cd039e0bfcf88901c98c0bfac5ab27566e3` **DOGEDOLA**
- `0xe2e279d1b911bad880d1104a750dfcd262fb6cf4` **Oracle**
- `0x66e33d2605c5fb25ebb7cd7528e7997b0afa55e8` **Pancakeswap DOGEDOLA/BUSD Pair**
- `0x70A87e1b97436D2F194B8B9EBF337bFc7521C70f` **LP Incentivation Pool**

## audit of forked codebase

is available [here](https://github.com/dynamicdollardevs/dogedola/blob/master/audit/REP-Dollar-06-11-20.pdf).

### How to verify contracts on etherscan

Example:
`npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS`

## disclaimer

this project is an experiment - the protocol is audited, and we've put a significant amount of work into testing as well as generally de-risking the design of its core mechanism, however participants should take great caution as bugs resulting in loss of funds are always a possibility.

```
Copyright 2022 Dynamic Dollar Devs, based on the works of the Empty Doge Squad

Licensed under the Apache License, Version 2.0 (the "License");
you may not use the included code except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

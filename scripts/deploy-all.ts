const hre = require("hardhat");
const { getContractAddress } = require('@ethersproject/address')

import { setTimeout } from "timers/promises";

async function main() {

    const [deployer]= await hre.ethers.getSigners();
    console.log("Account used for deployment: ", deployer.address)

    const transactionCount = await deployer.getTransactionCount() + 5;

    const futureAddress = getContractAddress({
        from: deployer.address,
        nonce: transactionCount
    })

    console.log("Fetching contracts...")
    const Proxy = await hre.ethers.getContractFactory("Root");
    const Dollar = await hre.ethers.getContractFactory("contracts/flat/deployer.sol:Dollar");
    const Implementation = await hre.ethers.getContractFactory("Implementation");
    const Pool = await hre.ethers.getContractFactory("contracts/flat/deployer.sol:Pool");
    const Pair = await hre.ethers.getContractFactory("contracts/flat/pairFactory.sol:YodedexFactory");

    console.log("Deploying contracts...")
    
    await setTimeout(5000);
    const dollar = await Dollar.deploy(futureAddress);

    const usdt = "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D";

    console.log("Dollar deployed to: ", dollar.address);

    console.log("Deployer contracts deployed...")
    console.log("Deploying Proxy Contract")
    console.log("Implementing contract...")
    
    const Oracle = await hre.ethers.getContractFactory("contracts/flat/deployer.sol:Oracle");
    await setTimeout(3000);

    const factory = await Pair.attach("0xAaA04462e35f3e40D798331657cA015169e005d7");

    console.log("Creating Pair...")
    const pairAddress = await factory.createPair(usdt, dollar.address);

    console.log("Pair deployed to: ", pairAddress)

    await setTimeout(3000);

    const oracle = await Oracle.deploy(dollar.address, futureAddress, pairAddress);

    await setTimeout(3000);

    const pool = await Pool.deploy(dollar.address, futureAddress, pairAddress);

    const implementation = await Implementation.deploy(dollar.address, pool.address, oracle.address);
    const proxy = await Proxy.deploy(implementation.address); //Deploy proxy and implement Dollar Contract

    // const yogeLpAddress = await pool.yodelp();
    // const daoAddress = await pool.dao();

    console.log("Dollar: ", dollar.Address);
    console.log("Pool: ", pool.address);
    console.log("Oracle: ", oracle.Address);
    console.log("Implementation: ", implementation.address);
    console.log("DAO: ", proxy.address)
    console.log("LP Address: ", pairAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
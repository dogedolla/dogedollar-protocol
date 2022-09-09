const hre = require("hardhat");
const { getContractAddress } = require('@ethersproject/address')

import { setTimeout } from "timers/promises";

async function proxy() {

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
    const dollar = await Dollar.attach('0xc20D80E1ef41c35631d7b811a26d8cF1360cFE8d');

    const usdt = "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D";

    console.log("Dollar deployed to: ", dollar.address);

    console.log("Deployer contracts deployed...")
    console.log("Deploying Proxy Contract")
    console.log("Implementing contract...")
    
    const Oracle = await hre.ethers.getContractFactory("contracts/flat/deployer.sol:Oracle");
    await setTimeout(3000);

    console.log("Fetching Pair...")
    const pairAddress = '0x5d3e7a8b20bf6d03ed1019f0c4603644425c473e';

	await setTimeout(3000);
	
    console.log("Pair deployed to: ", pairAddress)

    await setTimeout(3000);

    const oracle = '0x2852d743af9be988Fb2ca95E3b523BD4A91e2B08'
	// await Oracle.deploy(dollar.address, futureAddress, pairAddress);

    await setTimeout(3000);

    const pool = '0xd4E6709780A67cAeF2cae7b0746CD78152c7C54a'
	//await Pool.deploy(dollar.address, futureAddress, pairAddress);

    const implementation = await Implementation.deploy(dollar.address, pool, oracle);
    const proxy = await Proxy.deploy(implementation.address); //Deploy proxy and implement Dollar Contract

    // const yogeLpAddress = await pool.yodelp();
    // const daoAddress = await pool.dao();

    console.log("Dollar: ", dollar.Address);
    console.log("Pool: ", pool);
    console.log("Oracle: ", oracle);
    console.log("Implementation: ", implementation.address);
    console.log("DAO: ", proxy.address)
    console.log("LP Address: ", pairAddress); 
}

proxy().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
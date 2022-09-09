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
    const Dollar = await hre.ethers.getContractFactory("contracts/flat/deployer.sol:Deployer1");
    const Implementation = await hre.ethers.getContractFactory("Implementation");
    const Pool = await hre.ethers.getContractFactory("contracts/flat/deployer.sol:Pool");
    const Pair = await hre.ethers.getContractFactory("contracts/flat/pairFactory.sol:YodedexFactory");

    console.log("Deploying contracts...")
    
    await setTimeout(2000);
    const dollar = await Dollar.deploy();

    await setTimeout(4000);

	const proxy = await Proxy.deploy(dollar.address);

	await setTimeout(4000);

	const proxyD1 = await Dollar.attach(proxy.address);
    const usdt = "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D";

	await setTimeout(4000);

	const dollarAddress = await proxyD1.dollar();

	console.log("Dollar deployed to: ", dollarAddress)

    console.log("Deployer contracts deployed...")
    console.log("Deploying Proxy Contract")
    console.log("Implementing contract...")
    
    const Oracle = await hre.ethers.getContractFactory("contracts/flat/deployer.sol:Oracle");
    await setTimeout(3000);

    const factory = await Pair.attach("0xAaA04462e35f3e40D798331657cA015169e005d7");

    console.log("Creating Pair...")
    await factory.createPair(usdt, dollarAddress);
	await setTimeout(4000);
	const pairAddress = await factory.getPair(usdt, dollarAddress);

	await setTimeout(3000);
	
    console.log("Pair deployed to: ", pairAddress)

    await setTimeout(3000);

    const oracle = await Oracle.deploy(dollarAddress, proxy.address, pairAddress);

    await setTimeout(3000);

    const pool = await Pool.deploy(dollar.address, proxy.address, pairAddress);

	await setTimeout(3000);

    const implementation = await Implementation.deploy(dollarAddress, pool.address, oracle.address);

	await setTimeout(3000);

	await proxyD1.implement(implementation.address);


    console.log("Dollar: ", dollarAddress);
    console.log("Pool: ", pool.address);
    console.log("Oracle: ", oracle.address);
    console.log("Implementation: ", implementation.address);
    console.log("DAO: ", proxy.address)
    console.log("LP Address: ", pairAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
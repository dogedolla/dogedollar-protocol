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
 const Implementation = await hre.ethers.getContractFactory("Implementation");

    const implementation = await Implementation.deploy();

    console.log("Implementation: ", implementation.address);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
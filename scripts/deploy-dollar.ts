//const hre = require("hardhat");
import { setTimeout } from 'timers/promises'

async function dollar() {

    const [deployer]= await hre.ethers.getSigners();
    console.log("Account used for deployment: ", deployer.address)

    console.log("Fetching contracts...")
    const Proxy = await hre.ethers.getContractFactory("Root");
    const Deployer1 = await hre.ethers.getContractFactory("Deployer1");

    console.log("Deploying contracts...")
    const deployer1 = await Deployer1.deploy();

    await setTimeout(5000);
    
    console.log("Deployer contracts deployed...")
    console.log("Deploying Proxy Contract")
    const proxy = await Proxy.deploy(deployer1.address); //Deploy proxy and implement Deployer1 Contract

    //Constants and log to console
    const dollarAddress = await proxy.dollar();
 

    console.log("Dollar: ", dollarAddress);
    // console.log("LP Address: ", yogeLpAddress);
    // console.log("DAO Address: ", daoAddress);
}

dollar().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
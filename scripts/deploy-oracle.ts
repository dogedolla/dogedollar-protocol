const hre = require("hardhat");
import { setTimeout } from 'timers/promises'


async function oracle() {

    const [deployer]= await hre.ethers.getSigners();
    console.log("Account used for deployment: ", deployer.address)

    console.log("Fetching contracts...")
    const Proxy = await hre.ethers.getContractFactory("Root");
    const Deployer1 = await hre.ethers.getContractFactory("Deployer1");
    const Deployer2 = await hre.ethers.getContractFactory("Deployer2");
    const Deployer3 = await hre.ethers.getContractFactory("Deployer3");
    const Implementation = await hre.ethers.getContractFactory("Implementation");
    const Pool = await hre.ethers.getContractFactory("contracts/flat/deployer.sol:Pool");

    console.log("Deploying contracts...")
    //const deployer1 = await Deployer1.deploy();
    const deployer2 = await Deployer2.deploy();

    const proxyAddress = "0x0C6AaC6CDAab1831c5445334b8c9c147F766dD42";
    const pairAddress = "0x75828156b12e4783d4f9040e0310a75262e61604";
    const dollarAddress = "0x0FA3242e471Da9f532A5c7e9Bc073a93A08Ab4D6";
    console.log("Deployer contracts deployed...")
    console.log("Implementing Proxy Contract")
    //const proxy = await Proxy.deploy(deployer1.address); //Deploy proxy and implement Deployer1 Contract
    
    
    console.log("Implementing contract...")
    const proxyD1 = await Deployer1.attach(proxyAddress); //Attach Deployer contract interface to Proxy

    await proxyD1.implement(deployer2.address); // Implement Deployer 2 contract    
    const proxyD2 = await Deployer2.attach(proxyAddress) // Attach Deployer2 contract ABI to Proxy

    const deployer3 = await Deployer3.deploy();

    await proxyD2.implement(deployer3.address); // Implement Deployer 3 Contract
    const proxyD3 = await Deployer3.attach(proxyAddress); // Attach Deployer3 contract ABI at Proxy

    const implementation = await Implementation.deploy();
    await proxyD3.implement(implementation.address); // Implement the Implementation contract with constants etc.
    const pool = await Pool.attach(proxyD3.pool());

    //Constants and log to console
    const oracleAddress = await proxyD3.oracle();
    // const yogeLpAddress = await pool.yogeLp();
    // const daoAddress = await pool.dao();

    console.log("Pool: ", pool.address);
    console.log("Oracle: ", oracleAddress);
    console.log("Implementation: ", implementation.address);
    // console.log("LP Address: ", yogeLpAddress);
    // console.log("DAO Address: ", daoAddress);
}

oracle().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
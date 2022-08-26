const web3 = require("Web3");

async function start() {
    console.log( await web3.eth.getCode('0xdB6F2E93D7e5F1F01a96C747D31aDf2FBf975E6C')
    );

}

start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
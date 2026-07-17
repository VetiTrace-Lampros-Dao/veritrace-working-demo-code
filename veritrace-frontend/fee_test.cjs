const { ethers } = require("ethers");
const rpcUrl = "https://sepolia-rollup.arbitrum.io/rpc";
const provider = new ethers.JsonRpcProvider(rpcUrl);

async function main() {
  const feeData = await provider.getFeeData();
  console.log("maxFeePerGas:", feeData.maxFeePerGas.toString());
  console.log("maxPriorityFeePerGas:", feeData.maxPriorityFeePerGas.toString());
}
main();

const { ethers } = require("ethers");
const rpcUrl = "https://sepolia-rollup.arbitrum.io/rpc";
const provider = new ethers.JsonRpcProvider(rpcUrl);
const contractAddress = "0xd5a4e9185cbcea881f2c76b07732335250537820";
const abi = ["function verifyContent(bytes32) view returns (address, uint64, uint64, string, string)"];
const contract = new ethers.Contract(contractAddress, abi, provider);

async function main() {
  const hash = "0xd3dd9d203cf06cf1a4df6d371050049d134cac091ebc1d9cfaaf861fa0a041e4";
  try {
    const res = await contract.verifyContent(hash);
    console.log("Registered:", res);
  } catch (e) {
    console.log("Error or Not found:", e.message);
  }
}
main();

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { ethers } = require("ethers");

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);

const routerAddress = "0x610B717796ad172B316836AC95a2ffad065CeaB4"; // ✅ Correct checksum

const routerAbi = [
  "function getContractById(bytes32) view returns (address)"
];

const router = new ethers.Contract(routerAddress, routerAbi, provider);

async function checkCoordinator() {
  const donIdBytes32 = ethers.utils.formatBytes32String("fun-ethereum-sepolia-1");
  const coordinator = await router.getContractById(donIdBytes32);
  console.log("✅ Coordinator address:", coordinator);
}

checkCoordinator().catch(console.error);

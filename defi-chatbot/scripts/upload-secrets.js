// scripts/upload-secrets.js

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { ethers } = require("ethers");
const { SecretsManager } = require("@chainlink/functions-toolkit");

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.RPC_URL;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  const functionsRouterAddress = "0xb83E47C2Bc239B3bF3707a54dd1B703f46205303";


  const donId = "fun-ethereum-sepolia-1"; 

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Wallet address :", wallet.address);
  console.log(
    "ETH balance    :",
    ethers.utils.formatEther(await provider.getBalance(wallet.address)),
    "Sepolia ETH"
  );

  const secretsManager = new SecretsManager({
    signer: wallet,
    functionsRouterAddress,
    donId,
    gatewayUrls: [
      "https://01.functions-gateway.testnet.chain.link/",
      "https://02.functions-gateway.testnet.chain.link/",
      "https://03.functions-gateway.testnet.chain.link/",
    ],
  });

  await secretsManager.initialize();

  const { version, success } = await secretsManager.uploadEncryptedSecretsToDON({
    secrets: {
      GEMINI_API_KEY: GEMINI_KEY,
    },
    slotId: 0,
    minutesUntilExpiration: 60,
  });

  if (success) {
    console.log("✅ Uploaded secrets to DON version:", version);
    const ref = secretsManager.buildDONHostedEncryptedSecretsReference({
      slotId: 0,
      version,
    });
    console.log("🔐 Reference:", ref);
  } else {
    console.error("❌ Upload failed on one or more DON nodes.");
  }
}

main().catch((err) => {
  console.error("❌ Upload script failed:", err);
  process.exit(1);
});

// scripts/upload-secrets.js
// ✅ CORRECTED FOR ETHERS V5 to match @chainlink/functions-toolkit

require('dotenv').config({ debug: true })
// Change 1: Import from 'ethers' which is now v5
const { ethers } = require('ethers')
console.log("Ethers version being used:", ethers.version);
const { SecretsManager } = require('@chainlink/functions-toolkit')

async function main() {
  /************* 1.  ENV & CONSTANTS ********************************/
  const PRIVATE_KEY = process.env.PRIVATE_KEY
  const RPC_URL = process.env.RPC_URL
  const GEMINI_KEY = process.env.GEMINI_API_KEY
  

  const FUNCTIONS_DON_ID = 'fun-ethereum-sepolia-1'
  // Use the lowercase address to prevent any checksum issues
  const FUNCTIONS_ROUTER = '0xb83E47C2Bc239B3bF3707a54dd1B703f46205303'

  console.log("\n--- Debugging Environment Variables ---");
  console.log("RPC_URL being used:", RPC_URL);
  console.log("PRIVATE_KEY being used (first 5 chars):", PRIVATE_KEY ? PRIVATE_KEY.substring(0, 5) + "..." : "NOT SET");
  console.log("FUNCTIONS_ROUTER (from script):", FUNCTIONS_ROUTER); // Now this won't throw an error
  console.log("FUNCTIONS_DON_ID (from script):", FUNCTIONS_DON_ID); // Now this won't throw an error
  console.log("---------------------------------------\n");

  /************* 2.  Provider & Signer ******************************/
  // Change 2: Use ethers.providers.JsonRpcProvider for v5
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

  console.log('Wallet address :', wallet.address)
  // Change 3: Use ethers.utils.formatEther for v5
  const balance = await provider.getBalance(wallet.address)
  console.log('ETH balance    :', ethers.utils.formatEther(balance), 'Sepolia ETH')

  /************* 3.  Upload secret via SecretsManager ***************/
  try {
    const secretsManager = new SecretsManager({
      signer: wallet, // This will now be a valid ethers v5 signer
      functionsRouterAddress: FUNCTIONS_ROUTER,
      donId: FUNCTIONS_DON_ID,
    })

    // Initialize the SecretsManager
    await secretsManager.initialize()

    // Check if the DON has been initialized with our wallet as an authorized sender
    const { isDKGAuthorized } = await secretsManager.isDKGAuthorized(wallet.address)
    if (!isDKGAuthorized) {
      console.log(`\nWallet ${wallet.address} is not authorized to use this DON.`)
      console.log('Authorizing wallet, this will incur a gas fee...')

      // Authorize the wallet to use the DON
      const authTx = await secretsManager.authorizeSigner()
      await authTx.wait(1) // Wait for 1 confirmation

      console.log('Wallet authorized successfully.')
    }

    console.log('\nUploading secrets...')
    const uploadResult = await secretsManager.uploadEncryptedSecretsToDON({
      secrets: { apiKey: GEMINI_KEY },
      slotId: 0,
      minutesUntilExpiration: 60,
    })

    // Wait for the secrets to be confirmed by the DON
    await uploadResult.wait(1) // Wait for 1 confirmation

    console.log('✅ Secrets uploaded successfully!')
    console.log(`\nTo view your encrypted secrets, run: npx functions-secrets-list --network sepolia --donid ${FUNCTIONS_DON_ID}`)

  } catch (err) {
    console.error('❌ Upload failed:', err)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err)
  process.exit(1)
})
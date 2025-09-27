import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { privateTestnet } from "./testnet-config";

async function clearPending() {
  const creatorAccount = privateKeyToAccount(process.env.CREATOR_PRIVATE_KEY as `0x${string}`);
  const creatorWallet = createWalletClient({
    account: creatorAccount,
    chain: privateTestnet,
    transport: http(),
  });

  // Get current nonce
  const nonce = await creatorWallet.getTransactionCount({ address: creatorAccount.address });
  console.log(`Current nonce: ${nonce}`);

  try {
    // Send a high gas price transaction to self to clear pending
    const tx = await creatorWallet.sendTransaction({
      to: creatorAccount.address,
      value: parseEther("0.0001"),
      gasPrice: 50000000000n, // 50 gwei
      nonce,
    });
    console.log(`Clear transaction: ${tx}`);
  } catch (error) {
    console.error("Failed to clear:", error);
  }
}

clearPending();
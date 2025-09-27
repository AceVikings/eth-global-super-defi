import { network } from "hardhat";
import { formatEther, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { loadCheckpoint, updateCheckpointStatus, DeploymentCheckpoint } from "./deployment-checkpoint.js";

// Helper functions from main script
async function getTransactionReceiptWithRetry(publicClient: any, hash: string, maxRetries: number = 5): Promise<any> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const receipt = await publicClient.getTransactionReceipt({ hash });
      return receipt;
    } catch (error) {
      retries++;
      console.log(`   Retry ${retries}/${maxRetries}: Waiting for transaction receipt...`);
      if (retries >= maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
}

async function waitForTransactionAndDelay(publicClient: any, hash: string, description: string = "Transaction"): Promise<any> {
  console.log(`   ⏳ ${description}: ${hash}`);
  console.log(`   Waiting for confirmation...`);
  
  const receipt = await getTransactionReceiptWithRetry(publicClient, hash, 8);
  console.log(`   ✅ ${description} confirmed (block: ${receipt.blockNumber})`);
  
  console.log(`   ⏱️  Waiting additional 30 seconds before next transaction...`);
  await new Promise(resolve => setTimeout(resolve, 30000));
  console.log(`   🟢 Ready for next transaction`);
  
  return receipt;
}

async function executeAndWait(publicClient: any, contractWritePromise: Promise<any>, description: string): Promise<any> {
  const hash = await contractWritePromise;
  return await waitForTransactionAndDelay(publicClient, hash, description);
}

// Recreate contract instances from checkpoint
async function loadContractsFromCheckpoint(checkpoint: DeploymentCheckpoint) {
  const { viem } = await network.connect();
  
  console.log("📋 Loading contracts from checkpoint...");
  console.log(`   Network: ${checkpoint.networkName}`);
  console.log(`   Deployed: ${checkpoint.timestamp}`);
  
  const stablecoin = await viem.getContractAt("MockERC20", checkpoint.contracts.stablecoin);
  const wbtc = await viem.getContractAt("MockERC20", checkpoint.contracts.wbtc);
  const weth = await viem.getContractAt("MockERC20", checkpoint.contracts.weth);
  const layeredOptions = await viem.getContractAt("CitreaLayeredOptionsTrading", checkpoint.contracts.layeredOptions);
  const timeOracle = await viem.getContractAt("TimeOracle", checkpoint.contracts.timeOracle);
  const btcPriceFeed = await viem.getContractAt("MockPriceFeed", checkpoint.contracts.btcPriceFeed);
  const ethPriceFeed = await viem.getContractAt("MockPriceFeed", checkpoint.contracts.ethPriceFeed);
  
  console.log("✅ All contracts loaded successfully");
  
  return {
    stablecoin,
    wbtc,
    weth,
    layeredOptions,
    timeOracle,
    btcPriceFeed,
    ethPriceFeed
  };
}

// Recreate trader accounts from checkpoint
async function loadTradersFromCheckpoint(checkpoint: DeploymentCheckpoint) {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  
  // Get main deployer account
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];
  
  let trader1, trader2;
  
  if (checkpoint.tempAccounts && checkpoint.tempAccounts.length >= 2) {
    console.log("🔑 Recreating trader accounts from checkpoint...");
    
    // Recreate trader accounts from saved private keys
    const account1 = privateKeyToAccount(checkpoint.tempAccounts[0].privateKey as `0x${string}`);
    const account2 = privateKeyToAccount(checkpoint.tempAccounts[1].privateKey as `0x${string}`);
    
    trader1 = createWalletClient({
      account: account1,
      chain: publicClient.chain,
      transport: http()
    });
    
    trader2 = createWalletClient({
      account: account2,
      chain: publicClient.chain,
      transport: http()
    });
    
    console.log(`   Trader1: ${account1.address}`);
    console.log(`   Trader2: ${account2.address}`);
    
    // Check balances
    const balance1 = await publicClient.getBalance({ address: account1.address });
    const balance2 = await publicClient.getBalance({ address: account2.address });
    
    console.log(`   Trader1 balance: ${formatEther(balance1)} ETH`);
    console.log(`   Trader2 balance: ${formatEther(balance2)} ETH`);
  } else {
    // Use default local accounts
    [, trader1, trader2] = await viem.getWalletClients();
  }
  
  return { deployer, trader1, trader2 };
}

// Quick option creation test
async function quickOptionTest(contracts: any, traders: any, checkpoint: DeploymentCheckpoint) {
  console.log("\n🧪 ===== QUICK OPTION CREATION TEST =====");
  
  const { stablecoin, wbtc, layeredOptions, btcPriceFeed } = contracts;
  const { trader1, trader2 } = traders;
  
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  
  // Test current BTC price
  const currentBtcPrice = await btcPriceFeed.read.latestAnswer();
  console.log(`📊 Current BTC Price: $${Number(currentBtcPrice) / 1e8}`);
  
  // Create a simple test option
  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const expiry = currentTime + 86400n * 30n; // 30 days
  const strike = BigInt("5000000000000"); // $50,000
  
  console.log("\n🎯 Creating test BTC CALL option...");
  console.log(`   Strike: $${Number(strike) / 1e8}`);
  console.log(`   Expiry: ${new Date(Number(expiry) * 1000).toLocaleDateString()}`);
  
  // Calculate premium
  const premium = await layeredOptions.read.calculateParentPremium([
    wbtc.address,
    strike,
    expiry,
    0 // CALL
  ]);
  
  console.log(`   Calculated Premium: ${Number(premium) / 1e6} USDC`);
  
  // Check if trader1 has enough USDC and approve
  const traderAccount = checkpoint.tempAccounts ? checkpoint.tempAccounts[0] : trader1.account;
  const usdcBalance = await stablecoin.read.balanceOf([traderAccount.address]);
  
  console.log(`   Trader USDC Balance: ${Number(usdcBalance) / 1e6} USDC`);
  
  if (Number(usdcBalance) < Number(premium)) {
    console.log("❌ Insufficient USDC balance for premium");
    return false;
  }
  
  // Approve premium payment
  await executeAndWait(publicClient, stablecoin.write.approve([layeredOptions.address, premium], {
    account: traderAccount
  }), 'Approve USDC for premium');
  
  // Create option
  const tx = await executeAndWait(publicClient, layeredOptions.write.createLayeredOption([
    wbtc.address,
    strike,
    expiry,
    premium,
    0n, // No parent
    0,  // CALL
    stablecoin.address
  ], {
    account: traderAccount
  }), 'Create test BTC CALL option');
  
  console.log("✅ Test option created successfully!");
  console.log(`   Transaction: ${tx.transactionHash}`);
  
  // Verify option was created
  const option = await layeredOptions.read.options([1n]);
  console.log(`   Token ID 1 strike: $${Number(option[1]) / 1e8}`);
  
  return true;
}

async function main() {
  try {
    // Get network name
    const args = process.argv;
    const networkArg = args.find(arg => arg.startsWith('--network'));
    let networkName = 'citrea';
    
    if (networkArg && networkArg.includes('=')) {
      networkName = networkArg.split('=')[1];
    }
    
    console.log(`\n🔄 ===== DEMO TESTING WITH EXISTING DEPLOYMENT =====`);
    console.log(`Network: ${networkName}`);
    
    // Load checkpoint
    const checkpoint = loadCheckpoint(networkName);
    if (!checkpoint) {
      console.error(`❌ No checkpoint found for network: ${networkName}`);
      console.log("Please run the main deployment script first:");
      console.log(`npx hardhat run scripts/deploy-and-demo-testnet.ts --network ${networkName}`);
      process.exit(1);
    }
    
    if (checkpoint.status === 'failed') {
      console.warn("⚠️  Previous deployment failed. You may want to redeploy.");
    }
    
    // Load contracts and traders from checkpoint
    const contracts = await loadContractsFromCheckpoint(checkpoint);
    const traders = await loadTradersFromCheckpoint(checkpoint);
    
    // Run quick test
    const testResult = await quickOptionTest(contracts, traders, checkpoint);
    
    if (testResult) {
      console.log("\n✅ Demo test completed successfully!");
      updateCheckpointStatus(networkName, 'demo-complete');
    } else {
      console.log("\n❌ Demo test failed");
    }
    
  } catch (error: any) {
    console.error("❌ Demo test failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo test failed:", error);
    process.exit(1);
  });
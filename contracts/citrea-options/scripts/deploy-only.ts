import { network } from "hardhat";
import { formatEther } from "viem";
import fs from "fs";
import path from "path";

// Simple deployment script for testnet - just deploy contracts and save addresses
async function deployOnly() {
  console.log(`\n🚀 ===== DEPLOYING TO TESTNET =====\n`);

  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`📋 Deployer address: ${deployer.account.address}`);
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`💰 Deployer balance: ${formatEther(balance)} ETH`);

  // ===== 1. DEPLOY STABLECOIN (USDC Mock) =====
  console.log("\n1️⃣ Deploying Stablecoin (Mock USDC)...");
  const stablecoin = await viem.deployContract("MockERC20", [
    "USD Coin",           // name
    "USDC",              // symbol
    6,                   // decimals (USDC uses 6)
    BigInt("1000000000000"), // 1M USDC (6 decimals)
    deployer.account.address     // owner
  ]);
  console.log(`✅ Stablecoin deployed at: ${stablecoin.address}`);

  // ===== 2. DEPLOY ASSET TOKENS =====
  console.log("\n2️⃣ Deploying Asset Tokens...");
  
  // Deploy WBTC
  const wbtc = await viem.deployContract("MockERC20", [
    "Wrapped Bitcoin",
    "WBTC",
    8,                   // WBTC uses 8 decimals
    BigInt("2100000000000000"), // 21M WBTC (8 decimals)
    deployer.account.address
  ]);
  console.log(`✅ WBTC deployed at: ${wbtc.address}`);

  // Deploy WETH (for completeness, but we'll focus on WBTC for demo)
  const weth = await viem.deployContract("MockERC20", [
    "Wrapped Ethereum",
    "WETH",
    18,                  // WETH uses 18 decimals
    BigInt("120000000000000000000000000"), // 120M WETH (18 decimals)
    deployer.account.address
  ]);
  console.log(`✅ WETH deployed at: ${weth.address}`);

  // ===== 3. DEPLOY ORACLE CONTRACTS =====
  console.log("\n3️⃣ Deploying Oracle Contracts...");
  
  const timeOracle = await viem.deployContract("TimeOracle", [
    deployer.account.address    // owner
  ]);
  console.log(`✅ TimeOracle deployed at: ${timeOracle.address}`);
  
  // Deploy MockPriceFeed for WBTC
  const btcPriceFeed = await viem.deployContract("MockPriceFeed", [
    "BTC/USD Price Feed",       // description
    8,                          // decimals (BTC price feed uses 8 decimals)
    100000000n * 92000n,        // initial price: $92,000 BTC (8 decimals)
    deployer.account.address    // owner
  ]);
  console.log(`✅ BTC Price Feed deployed at: ${btcPriceFeed.address}`);
  
  // Deploy MockPriceFeed for WETH
  const ethPriceFeed = await viem.deployContract("MockPriceFeed", [
    "ETH/USD Price Feed",       // description
    8,                          // decimals  
    100000000n * 2500n,         // initial price: $2,500 ETH (8 decimals)
    deployer.account.address    // owner
  ]);
  console.log(`✅ ETH Price Feed deployed at: ${ethPriceFeed.address}`);

  // ===== 4. DEPLOY MAIN CONTRACT =====
  console.log("\n4️⃣ Deploying CitreaLayeredOptionsTrading...");
  const layeredOptions = await viem.deployContract("CitreaLayeredOptionsTrading", [
    deployer.account.address,    // owner
    stablecoin.address,         // stablecoin for child premiums
    timeOracle.address          // time oracle
  ]);
  console.log(`✅ LayeredOptions deployed at: ${layeredOptions.address}`);

  // ===== 5. INITIALIZE CONTRACTS =====
  console.log("\n5️⃣ Initializing Contracts...");
  
  // Add supported assets (focus on WBTC for demo)
  await layeredOptions.write.addSupportedAsset([wbtc.address]);
  await layeredOptions.write.addSupportedAsset([weth.address]); // Keep for contract completeness
  
  // Set price feeds
  await layeredOptions.write.setPriceFeed([wbtc.address, btcPriceFeed.address]);
  await layeredOptions.write.setPriceFeed([weth.address, ethPriceFeed.address]);
  
  console.log("✅ Assets added, price feeds configured, and contracts initialized");

  // ===== 6. SAVE ADDRESSES =====
  console.log("\n6️⃣ Saving Contract Addresses...");
  
  const addresses = {
    network: "citrea",
    timestamp: new Date().toISOString(),
    deployer: deployer.account.address,
    contracts: {
      stablecoin: stablecoin.address,
      wbtc: wbtc.address,
      weth: weth.address,
      timeOracle: timeOracle.address,
      btcPriceFeed: btcPriceFeed.address,
      ethPriceFeed: ethPriceFeed.address,
      layeredOptions: layeredOptions.address
    }
  };

  const outputDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = path.join(outputDir, "citrea-addresses.json");
  fs.writeFileSync(outputFile, JSON.stringify(addresses, null, 2));
  
  console.log(`✅ Contract addresses saved to: ${outputFile}`);

  // ===== FINAL SUMMARY =====
  console.log(`\n🎉 ===== DEPLOYMENT COMPLETE =====

📋 Contract Addresses:
💰 Stablecoin (USDC): ${stablecoin.address}
₿  WBTC: ${wbtc.address}
⟠  WETH: ${weth.address}
🕐 TimeOracle: ${timeOracle.address}
📈 BTC Price Feed: ${btcPriceFeed.address}
📊 ETH Price Feed: ${ethPriceFeed.address}
🎯 LayeredOptions: ${layeredOptions.address}

🚀 All contracts deployed and initialized on Citrea testnet!
📄 Addresses saved to: ${outputFile}
  `);
}

// Execute deployment
deployOnly()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
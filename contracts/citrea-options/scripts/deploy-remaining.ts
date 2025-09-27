import { network } from "hardhat";
import { formatEther } from "viem";
import fs from "fs";
import path from "path";

// Deploy remaining contracts (oracles and main contract)
async function deployRemaining() {
  console.log(`\n🚀 ===== DEPLOYING REMAINING CONTRACTS TO CITREA TESTNET =====\n`);

  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`📋 Deployer address: ${deployer.account.address}`);
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`💰 Deployer balance: ${formatEther(balance)} ETH`);

  // Previously deployed contract addresses
  const stablecoinAddress = "0x43d109c41de6beab2e1d151d932bcc6318fa8f50";
  const wbtcAddress = "0x70b0efc2b112d37cfeb2641cfde41b8677375935";
  const wethAddress = "0x52e5d5ff769e71dfeead1a3fc5c440f87031a3e3";

  console.log(`\n📋 Previously deployed ERC20 tokens:
💰 Mock USDC: ${stablecoinAddress}
₿  WBTC: ${wbtcAddress}
⟠  WETH: ${wethAddress}`);

  // ===== 1. DEPLOY ORACLE CONTRACTS =====
  console.log("\n1️⃣ Deploying Oracle Contracts...");
  
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

  // ===== 2. DEPLOY MAIN CONTRACT =====
  console.log("\n2️⃣ Deploying CitreaLayeredOptionsTrading...");
  const layeredOptions = await viem.deployContract("CitreaLayeredOptionsTrading", [
    deployer.account.address,    // owner
    stablecoinAddress,          // stablecoin for child premiums
    timeOracle.address          // time oracle
  ]);
  console.log(`✅ LayeredOptions deployed at: ${layeredOptions.address}`);

  // ===== 3. INITIALIZE CONTRACTS =====
  console.log("\n3️⃣ Initializing Contracts...");
  
  // Add supported assets
  await layeredOptions.write.addSupportedAsset([wbtcAddress]);
  await layeredOptions.write.addSupportedAsset([wethAddress]);
  console.log("✅ Supported assets added");
  
  // Set price feeds
  await layeredOptions.write.setPriceFeed([wbtcAddress, btcPriceFeed.address]);
  await layeredOptions.write.setPriceFeed([wethAddress, ethPriceFeed.address]);
  console.log("✅ Price feeds configured");

  // ===== 4. SAVE COMPLETE ADDRESSES =====
  console.log("\n4️⃣ Saving Complete Contract Addresses...");
  
  const addresses = {
    network: "citrea",
    timestamp: new Date().toISOString(),
    deployer: deployer.account.address,
    contracts: {
      stablecoin: stablecoinAddress,
      wbtc: wbtcAddress,
      weth: wethAddress,
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
  
  console.log(`✅ Complete contract addresses saved to: ${outputFile}`);

  // ===== FINAL SUMMARY =====
  console.log(`\n🎉 ===== ALL CONTRACTS DEPLOYED TO CITREA TESTNET =====

📋 Complete Contract Addresses:
💰 Stablecoin (USDC): ${stablecoinAddress}
₿  WBTC: ${wbtcAddress}
⟠  WETH: ${wethAddress}
🕐 TimeOracle: ${timeOracle.address}
📈 BTC Price Feed: ${btcPriceFeed.address}
📊 ETH Price Feed: ${ethPriceFeed.address}
🎯 LayeredOptions: ${layeredOptions.address}

🚀 All contracts are now deployed and initialized on Citrea testnet!
📄 Complete addresses saved to: ${outputFile}

🔧 Next steps:
1. Update frontend/backend with these contract addresses
2. Add price update functionality to frontend
3. Add time manipulation functionality for demo
4. Test full integration

💡 Demo features enabled:
- Oracle-based BTC pricing starting at $92,000
- Oracle-based ETH pricing starting at $2,500
- Time manipulation via TimeOracle
- Realistic premium calculations
- Complete options lifecycle
  `);

  // Return the addresses for any additional processing
  return addresses;
}

// Execute deployment
deployRemaining()
  .then((addresses) => {
    console.log("\n✅ Deployment complete! Contract addresses ready for integration.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
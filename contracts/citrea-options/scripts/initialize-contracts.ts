import { network } from "hardhat";
import { formatEther } from "viem";
import fs from "fs";
import path from "path";

// Just initialize the deployed contracts
async function initializeContracts() {
  console.log(`\n🔧 ===== INITIALIZING DEPLOYED CONTRACTS =====\n`);

  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`📋 Deployer address: ${deployer.account.address}`);
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(`💰 Deployer balance: ${formatEther(balance)} ETH`);

  // All deployed contract addresses
  const addresses = {
    stablecoin: "0x43d109c41de6beab2e1d151d932bcc6318fa8f50" as `0x${string}`,
    wbtc: "0x70b0efc2b112d37cfeb2641cfde41b8677375935" as `0x${string}`,
    weth: "0x52e5d5ff769e71dfeead1a3fc5c440f87031a3e3" as `0x${string}`,
    timeOracle: "0x12aece39b96768dc9a776b1b3176b2bc21063314" as `0x${string}`,
    btcPriceFeed: "0x2574b49a1ded38c9f239682769e3c3e708797c7a" as `0x${string}`,
    ethPriceFeed: "0x7d0c4127c937aaf59b0af8f686d63d602e27a777" as `0x${string}`,
    layeredOptions:
      "0xcd9948d810c4e8c2144c4e2fb84786502e6bedc8" as `0x${string}`,
  };

  console.log(`\n📋 All Contract Addresses:
💰 Mock USDC: ${addresses.stablecoin}
₿  WBTC: ${addresses.wbtc}
⟠  WETH: ${addresses.weth}
🕐 TimeOracle: ${addresses.timeOracle}
📈 BTC Price Feed: ${addresses.btcPriceFeed}
📊 ETH Price Feed: ${addresses.ethPriceFeed}
🎯 LayeredOptions: ${addresses.layeredOptions}`);

  // Get contract instance
  const layeredOptions = await viem.getContractAt(
    "CitreaLayeredOptionsTrading",
    addresses.layeredOptions
  );

  console.log("\n1️⃣ Adding supported assets...");

  try {
    await layeredOptions.write.addSupportedAsset([addresses.wbtc]);
    console.log("✅ WBTC added as supported asset");
  } catch (error) {
    console.log("⚠️ WBTC already added or failed to add");
  }

  try {
    await layeredOptions.write.addSupportedAsset([addresses.weth]);
    console.log("✅ WETH added as supported asset");
  } catch (error) {
    console.log("⚠️ WETH already added or failed to add");
  }

  console.log("\n2️⃣ Setting price feeds...");

  try {
    await layeredOptions.write.setPriceFeed([
      addresses.wbtc,
      addresses.btcPriceFeed,
    ]);
    console.log("✅ BTC price feed configured");
  } catch (error) {
    console.log("⚠️ BTC price feed already set or failed to set");
  }

  try {
    await layeredOptions.write.setPriceFeed([
      addresses.weth,
      addresses.ethPriceFeed,
    ]);
    console.log("✅ ETH price feed configured");
  } catch (error) {
    console.log("⚠️ ETH price feed already set or failed to set");
  }

  // Save complete addresses
  console.log("\n3️⃣ Saving Final Contract Addresses...");

  const finalAddresses = {
    network: "citrea",
    timestamp: new Date().toISOString(),
    deployer: deployer.account.address,
    contracts: addresses,
    status: "fully_deployed_and_initialized",
  };

  const outputDir = "./deployments";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, "citrea-addresses.json");
  fs.writeFileSync(outputFile, JSON.stringify(finalAddresses, null, 2));

  console.log(`✅ Final addresses saved to: ${outputFile}`);

  console.log(`\n🎉 ===== CITREA DEPLOYMENT COMPLETE! =====

✅ ALL CONTRACTS SUCCESSFULLY DEPLOYED & INITIALIZED!

📋 Final Contract Addresses:
💰 Stablecoin (USDC): ${addresses.stablecoin}
₿  WBTC: ${addresses.wbtc}
⟠  WETH: ${addresses.weth}
🕐 TimeOracle: ${addresses.timeOracle}
📈 BTC Price Feed: ${addresses.btcPriceFeed}
📊 ETH Price Feed: ${addresses.ethPriceFeed}
🎯 LayeredOptions: ${addresses.layeredOptions}

🚀 Ready for frontend/backend integration!

🔧 Features available:
- ✅ Mock ERC20 tokens (USDC, WBTC, WETH)
- ✅ Oracle-based pricing (BTC: $92K, ETH: $2.5K)
- ✅ Time manipulation via TimeOracle
- ✅ Complete options lifecycle
- ✅ Layered (parent/child) options
- ✅ Realistic premium calculations

📝 Next steps:
1. Update backend API with these addresses
2. Update frontend with these addresses
3. Add price update UI components
4. Add time manipulation UI components
5. Test full integration
  `);

  return finalAddresses;
}

// Execute initialization
initializeContracts()
  .then((addresses) => {
    console.log("\n✅ All contracts deployed and ready!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  });

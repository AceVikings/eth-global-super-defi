import { network } from "hardhat";
import { formatEther } from "viem";

// Initialize the current deployed contracts
async function initializeCurrentContracts() {
  console.log(`\n🔧 ===== INITIALIZING CURRENT DEPLOYED CONTRACTS =====\n`);

  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`📋 Deployer address: ${deployer.account.address}`);
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(`💰 Deployer balance: ${formatEther(balance)} ETH`);

  // Current deployed contract addresses from deployed-addresses.json
  const addresses = {
    stablecoin: "0x6dad502a7b4881d53f615fbb4bfbe01033b11915" as `0x${string}`, // USDC
    wbtc: "0xd78efe947fdceab5665a5264244ce4b7f9209b62" as `0x${string}`, // WBTC
    timeOracle: "0x7dc5f317cf0d928bfa0f87b9eefaeef2e15318a4" as `0x${string}`, // TimeOracle
    layeredOptions: "0x78650fe648fea6a50523fc0c90b100103b3a815f" as `0x${string}`, // LayeredOptions
  };

  console.log(`\n📋 Current Contract Addresses:
💰 Mock USDC: ${addresses.stablecoin}
₿  WBTC: ${addresses.wbtc}
🕐 TimeOracle: ${addresses.timeOracle}
🎯 LayeredOptions: ${addresses.layeredOptions}`);

  // Get contract instance
  const layeredOptions = await viem.getContractAt(
    "CitreaLayeredOptionsTrading",
    addresses.layeredOptions
  );

  console.log("\n1️⃣ Adding supported assets...");

  try {
    // Check if WBTC is already supported
    const wbtcSupported = await layeredOptions.read.supportedAssets([addresses.wbtc]);
    if (!wbtcSupported) {
      await layeredOptions.write.addSupportedAsset([addresses.wbtc]);
      console.log("✅ WBTC added as supported asset");
    } else {
      console.log("✅ WBTC already supported");
    }
  } catch (error) {
    console.log("⚠️ Error checking/adding WBTC:", error);
  }

  console.log("\n✅ Basic asset initialization completed!");
  
  console.log(`\n🎉 ===== CURRENT CONTRACTS INITIALIZED! =====

✅ CONTRACT INITIALIZATION COMPLETE!

📋 Contract Addresses:
💰 Stablecoin (USDC): ${addresses.stablecoin}
₿  WBTC: ${addresses.wbtc}
🕐 TimeOracle: ${addresses.timeOracle}
🎯 LayeredOptions: ${addresses.layeredOptions}

🚀 Ready for frontend integration!

🔧 Features available:
- ✅ Mock ERC20 tokens (USDC, WBTC)
- ✅ Time manipulation via TimeOracle
- ✅ European-style options
- ✅ Layered (parent/child) options with automatic maturity inheritance
- ✅ Premium separation (writers provide collateral)

📝 Ready for use with frontend!
  `);

  return addresses;
}

// Execute initialization
initializeCurrentContracts()
  .then((addresses) => {
    console.log("\n✅ Current contracts initialized and ready!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  });
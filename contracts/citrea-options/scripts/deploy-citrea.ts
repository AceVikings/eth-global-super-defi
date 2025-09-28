import { network } from "hardhat";
import { formatEther } from "viem";
import fs from "fs";
import path from "path";

async function main() {
  console.log("\n🚀 ===== CITREA OPTIONS DEPLOYMENT =====\n");

  const { viem } = await network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`📋 Deployer address: ${deployer.account.address}`);
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(`💰 Deployer balance: ${formatEther(balance)} ETH`);

  // Deploy contracts in correct order
  console.log("\n1️⃣ Deploying Mock USDC...");
  const usdc = await viem.deployContract("MockERC20", [
    "USD Coin",
    "USDC", 
    6,
    BigInt("1000000000000"), // 1M USDC
    deployer.account.address,
  ]);
  console.log(`✅ USDC deployed at: ${usdc.address}`);

  console.log("\n2️⃣ Deploying Mock WBTC...");
  const wbtc = await viem.deployContract("MockERC20", [
    "Wrapped Bitcoin",
    "WBTC",
    8,
    BigInt("2100000000000000"), // 21M WBTC
    deployer.account.address,
  ]);
  console.log(`✅ WBTC deployed at: ${wbtc.address}`);

  console.log("\n3️⃣ Deploying Time Oracle...");
  const timeOracle = await viem.deployContract("TimeOracle");
  console.log(`✅ Time Oracle deployed at: ${timeOracle.address}`);

  console.log("\n4️⃣ Deploying Layered Options Contract...");
  const layeredOptions = await viem.deployContract("CitreaLayeredOptionsTrading", [
    deployer.account.address, // owner
    usdc.address, // stablecoin
    timeOracle.address, // time oracle
  ]);
  console.log(`✅ Layered Options deployed at: ${layeredOptions.address}`);

  // Save deployment addresses
  const deploymentInfo = {
    network: "citrea",
    chainId: 5115,
    timestamp: new Date().toISOString(),
    deployer: deployer.account.address,
    contracts: {
      USDC: usdc.address,
      WBTC: wbtc.address,
      TimeOracle: timeOracle.address,
      LayeredOptions: layeredOptions.address,
    },
    features: {
      europeanStyle: true,
      childMaturityInheritance: true,
      premiumSeparation: true,
    }
  };

  const deploymentPath = path.join(__dirname, "../deployed-addresses.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n✅ ===== DEPLOYMENT COMPLETED SUCCESSFULLY =====");
  console.log(`📄 Deployment info saved to: ${deploymentPath}`);
  console.log("\n🔥 NEW FEATURES:");
  console.log("   ✅ Child options inherit parent maturity automatically");
  console.log("   ✅ European-style settlement (no early exercise)");
  console.log("   ✅ Proper premium/collateral separation");
  console.log("\n📋 Contract Addresses:");
  console.log(`   USDC: ${usdc.address}`);
  console.log(`   WBTC: ${wbtc.address}`);
  console.log(`   TimeOracle: ${timeOracle.address}`);
  console.log(`   LayeredOptions: ${layeredOptions.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
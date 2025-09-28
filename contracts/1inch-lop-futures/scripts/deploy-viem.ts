import hre from "hardhat";
import { parseUnits } from "viem";

/**
 * Deploy and configure the complete 1inch LOP Futures system using viem
 * 
 * This script deploys all contracts and sets up the necessary roles and permissions:
 * 1. MockOracle for price feeds (production will use real oracle)
 * 2. FuturesVault for collateral management
 * 3. FuturesMarket for bilateral position management
 * 4. PreInteractionAdapter for taker collateral locking
 * 5. PostInteractionAdapter for position opening after settlement
 * 6. FuturesSettlement as recipient for 1inch swap outputs
 * 
 * Uses Hardhat 3 with viem for deployment
 */
async function main() {
  // Get deployer account
  const [deployer] = await hre.viem.getWalletClients();
  const deployerAddress = deployer.account.address;
  
  console.log("Deploying contracts with account:", deployerAddress);
  
  const publicClient = await hre.viem.getPublicClient();
  const balance = await publicClient.getBalance({ address: deployerAddress });
  console.log("Account balance:", balance.toString());

  // ===== CONTRACT ADDRESSES =====
  
  // 1inch Limit Order Protocol on Polygon Mainnet
  const POLYGON_1INCH_LOP = "0x111111125421ca6dc452d289314280a0f8842a65";
  
  // USDC address on Polygon mainnet
  const POLYGON_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  
  console.log("Target 1inch LOP address:", POLYGON_1INCH_LOP);
  console.log("Using USDC address:", POLYGON_USDC);

  // ===== DEPLOY ORACLE =====
  
  console.log("\n🔮 Deploying MockOracle...");
  const oracle = await viem.deployContract("MockOracle", [
    parseUnits("2000", 18) // ETH price: $2000 with 18 decimals
  ]);
  console.log("MockOracle deployed to:", oracle.address);

  // ===== DEPLOY VAULT =====
  
  console.log("\n🏦 Deploying FuturesVault...");
  const vault = await viem.deployContract("FuturesVault", [
    POLYGON_USDC, // collateral token
    deployerAddress // owner
  ]);
  console.log("FuturesVault deployed to:", vault.address);

  // ===== DEPLOY MARKET =====
  
  console.log("\n📊 Deploying FuturesMarket...");
  const market = await viem.deployContract("FuturesMarket", [
    vault.address,
    oracle.address,
    deployerAddress // owner
  ]);
  console.log("FuturesMarket deployed to:", market.address);

  // ===== DEPLOY PRE-INTERACTION ADAPTER =====
  
  console.log("\n🔧 Deploying PreInteractionAdapter...");
  const preAdapter = await viem.deployContract("PreInteractionAdapter", [
    vault.address,
    deployerAddress // owner
  ]);
  console.log("PreInteractionAdapter deployed to:", preAdapter.address);

  // ===== DEPLOY POST-INTERACTION ADAPTER =====
  
  console.log("\n🔧 Deploying PostInteractionAdapter...");
  const postAdapter = await viem.deployContract("PostInteractionAdapter", [
    vault.address,
    market.address,
    deployerAddress // owner
  ]);
  console.log("PostInteractionAdapter deployed to:", postAdapter.address);

  // ===== DEPLOY SETTLEMENT =====
  
  console.log("\n⚖️ Deploying FuturesSettlement...");
  const settlement = await viem.deployContract("FuturesSettlement", [
    vault.address,
    postAdapter.address,
    deployerAddress // owner
  ]);
  console.log("FuturesSettlement deployed to:", settlement.address);

  // ===== CONFIGURE ROLES AND PERMISSIONS =====
  
  console.log("\n🔐 Configuring roles and permissions...");

  // Grant MARKET_ROLE to market contract in vault
  console.log("Granting MARKET_ROLE to FuturesMarket...");
  await vault.write.setMarket([market.address]);
  
  // Grant SETTLEMENT_ROLE to settlement contract in vault  
  console.log("Granting SETTLEMENT_ROLE to FuturesSettlement...");
  await vault.write.setSettlement([settlement.address]);
  
  // Grant ADAPTER_ROLE to both adapters in vault
  console.log("Granting ADAPTER_ROLE to PreInteractionAdapter...");
  await vault.write.setPreAdapter([preAdapter.address]);
  
  console.log("Granting ADAPTER_ROLE to PostInteractionAdapter...");
  await vault.write.setPostAdapter([postAdapter.address]);
  
  // Grant SETTLEMENT_ROLE to settlement contract in market
  console.log("Granting SETTLEMENT_ROLE to FuturesSettlement in market...");
  await market.write.setSettlement([settlement.address]);

  // ===== DEPLOYMENT SUMMARY =====
  
  console.log("\n✅ Deployment Complete!");
  console.log("==========================================");
  console.log("📋 Contract Addresses:");
  console.log("==========================================");
  console.log("MockOracle:              ", oracle.address);
  console.log("FuturesVault:            ", vault.address);
  console.log("FuturesMarket:           ", market.address);
  console.log("PreInteractionAdapter:   ", preAdapter.address);
  console.log("PostInteractionAdapter:  ", postAdapter.address);
  console.log("FuturesSettlement:       ", settlement.address);
  console.log("==========================================");
  console.log("🔗 External Integrations:");
  console.log("==========================================");
  console.log("1inch LOP (Polygon):     ", POLYGON_1INCH_LOP);
  console.log("Collateral Token (USDC): ", POLYGON_USDC);
  console.log("==========================================");

  // ===== SAVE DEPLOYMENT DATA =====
  
  const deploymentData = {
    chainId: await publicClient.getChainId(),
    deployer: deployerAddress,
    timestamp: new Date().toISOString(),
    contracts: {
      MockOracle: oracle.address,
      FuturesVault: vault.address,
      FuturesMarket: market.address,
      PreInteractionAdapter: preAdapter.address,
      PostInteractionAdapter: postAdapter.address,
      FuturesSettlement: settlement.address
    },
    external: {
      oneInchLOP: POLYGON_1INCH_LOP,
      collateralToken: POLYGON_USDC
    }
  };

  // Save to deployments directory
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `deployment-${await publicClient.getChainId()}-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  
  console.log("📄 Deployment data saved to:", deploymentFile);

  // ===== VERIFICATION COMMANDS =====
  
  console.log("\n📝 Verification Commands:");
  console.log("==========================================");
  console.log("Run these commands to verify contracts on Polygonscan:");
  console.log(`npx hardhat verify --network polygon ${oracle.address} "${parseUnits("2000", 18)}"`);
  console.log(`npx hardhat verify --network polygon ${vault.address} "${POLYGON_USDC}" "${deployerAddress}"`);
  console.log(`npx hardhat verify --network polygon ${market.address} "${vault.address}" "${oracle.address}" "${deployerAddress}"`);
  console.log(`npx hardhat verify --network polygon ${preAdapter.address} "${vault.address}" "${deployerAddress}"`);
  console.log(`npx hardhat verify --network polygon ${postAdapter.address} "${vault.address}" "${market.address}" "${deployerAddress}"`);
  console.log(`npx hardhat verify --network polygon ${settlement.address} "${vault.address}" "${postAdapter.address}" "${deployerAddress}"`);

  console.log("\n🎉 1inch LOP Futures System Ready for Production!");
  console.log("Next steps:");
  console.log("1. Test on Polygon fork");
  console.log("2. Create 1inch SDK integration examples");  
  console.log("3. Deploy to Polygon mainnet");
  console.log("4. Verify contracts on Polygonscan");
  
  return {
    oracle: oracle.address,
    vault: vault.address,
    market: market.address,
    preAdapter: preAdapter.address,
    postAdapter: postAdapter.address,
    settlement: settlement.address
  };
}

// Handle deployment errors
main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});

export default main;
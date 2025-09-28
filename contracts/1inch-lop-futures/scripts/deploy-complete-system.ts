import hre from "hardhat";
import { parseUnits, getAddress } from "viem";
// import { FuturesVault, FuturesMarket, MockOracle, PreInteractionAdapter, PostInteractionAdapter, FuturesSettlement } from "../typechain-types";

/**
 * Deploy and configure the complete 1inch LOP Futures system
 * 
 * This script deploys all contracts and sets up the necessary roles and permissions:
 * 1. MockOracle for price feeds (production will use real oracle)
 * 2. FuturesVault for collateral management
 * 3. FuturesMarket for bilateral position management
 * 4. PreInteractionAdapter for taker collateral locking
 * 5. PostInteractionAdapter for position opening after settlement
 * 6. FuturesSettlement as recipient for 1inch swap outputs
 * 
 * Roles Setup:
 * - Vault: Market + Settlement get MARKET_ROLE, Adapters get ADAPTER_ROLE
 * - Market: Settlement gets SETTLEMENT_ROLE
 * - Adapters: Settlement gets appropriate permissions
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // ===== CONTRACT ADDRESSES =====
  
  // 1inch Limit Order Protocol on Polygon Mainnet
  const POLYGON_1INCH_LOP = "0x111111125421ca6dc452d289314280a0f8842a65";
  
  // Mock USDC address for testing (replace with real USDC on mainnet: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174)
  const MOCK_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // Polygon USDC
  
  console.log("Target 1inch LOP address:", POLYGON_1INCH_LOP);
  console.log("Using USDC address:", MOCK_USDC);

  // ===== DEPLOY ORACLE =====
  
  console.log("\n🔮 Deploying MockOracle...");
  const MockOracleFactory = await ethers.getContractFactory("MockOracle");
  const oracle = await MockOracleFactory.deploy(
    ethers.parseUnits("2000", 18) // ETH price: $2000 with 18 decimals
  );
  await oracle.waitForDeployment();
  console.log("MockOracle deployed to:", await oracle.getAddress());

  // ===== DEPLOY VAULT =====
  
  console.log("\n🏦 Deploying FuturesVault...");
  const VaultFactory = await ethers.getContractFactory("FuturesVault");
  const vault = await VaultFactory.deploy(
    MOCK_USDC, // collateral token
    deployer.address // owner
  );
  await vault.waitForDeployment();
  console.log("FuturesVault deployed to:", await vault.getAddress());

  // ===== DEPLOY MARKET =====
  
  console.log("\n📊 Deploying FuturesMarket...");
  const MarketFactory = await ethers.getContractFactory("FuturesMarket");
  const market = await MarketFactory.deploy(
    await vault.getAddress(),
    await oracle.getAddress(),
    deployer.address // owner
  );
  await market.waitForDeployment();
  console.log("FuturesMarket deployed to:", await market.getAddress());

  // ===== DEPLOY PRE-INTERACTION ADAPTER =====
  
  console.log("\n🔧 Deploying PreInteractionAdapter...");
  const PreAdapterFactory = await ethers.getContractFactory("PreInteractionAdapter");
  const preAdapter = await PreAdapterFactory.deploy(
    await vault.getAddress(),
    deployer.address // owner
  );
  await preAdapter.waitForDeployment();
  console.log("PreInteractionAdapter deployed to:", await preAdapter.getAddress());

  // ===== DEPLOY POST-INTERACTION ADAPTER =====
  
  console.log("\n🔧 Deploying PostInteractionAdapter...");
  const PostAdapterFactory = await ethers.getContractFactory("PostInteractionAdapter");
  const postAdapter = await PostAdapterFactory.deploy(
    await vault.getAddress(),
    market,
    deployer.address // owner
  );
  await postAdapter.waitForDeployment();
  console.log("PostInteractionAdapter deployed to:", await postAdapter.getAddress());

  // ===== DEPLOY SETTLEMENT =====
  
  console.log("\n⚖️ Deploying FuturesSettlement...");
  const SettlementFactory = await ethers.getContractFactory("FuturesSettlement");
  const settlement = await SettlementFactory.deploy(
    vault,
    postAdapter,
    deployer.address // owner
  );
  await settlement.waitForDeployment();
  console.log("FuturesSettlement deployed to:", await settlement.getAddress());

  // ===== CONFIGURE ROLES AND PERMISSIONS =====
  
  console.log("\n🔐 Configuring roles and permissions...");

  // Grant MARKET_ROLE to market contract in vault
  console.log("Granting MARKET_ROLE to FuturesMarket...");
  await vault.setMarket(await market.getAddress());
  
  // Grant SETTLEMENT_ROLE to settlement contract in vault  
  console.log("Granting SETTLEMENT_ROLE to FuturesSettlement...");
  await vault.setSettlement(await settlement.getAddress());
  
  // Grant ADAPTER_ROLE to both adapters in vault
  console.log("Granting ADAPTER_ROLE to PreInteractionAdapter...");
  await vault.setPreAdapter(await preAdapter.getAddress());
  
  console.log("Granting ADAPTER_ROLE to PostInteractionAdapter...");
  await vault.setPostAdapter(await postAdapter.getAddress());
  
  // Grant SETTLEMENT_ROLE to settlement contract in market
  console.log("Granting SETTLEMENT_ROLE to FuturesSettlement in market...");
  await market.setSettlement(await settlement.getAddress());

  // ===== DEPLOYMENT SUMMARY =====
  
  console.log("\n✅ Deployment Complete!");
  console.log("==========================================");
  console.log("📋 Contract Addresses:");
  console.log("==========================================");
  console.log("MockOracle:              ", await oracle.getAddress());
  console.log("FuturesVault:            ", await vault.getAddress());
  console.log("FuturesMarket:           ", await market.getAddress());
  console.log("PreInteractionAdapter:   ", await preAdapter.getAddress());
  console.log("PostInteractionAdapter:  ", await postAdapter.getAddress());
  console.log("FuturesSettlement:       ", await settlement.getAddress());
  console.log("==========================================");
  console.log("🔗 External Integrations:");
  console.log("==========================================");
  console.log("1inch LOP (Polygon):     ", POLYGON_1INCH_LOP);
  console.log("Collateral Token (USDC): ", MOCK_USDC);
  console.log("==========================================");

  // ===== SAVE DEPLOYMENT DATA =====
  
  const deploymentData = {
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      MockOracle: await oracle.getAddress(),
      FuturesVault: await vault.getAddress(),
      FuturesMarket: await market.getAddress(),
      PreInteractionAdapter: await preAdapter.getAddress(),
      PostInteractionAdapter: await postAdapter.getAddress(),
      FuturesSettlement: await settlement.getAddress()
    },
    external: {
      oneInchLOP: POLYGON_1INCH_LOP,
      collateralToken: MOCK_USDC
    }
  };

  // Save to deployments directory
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `polygon-deployment-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  
  console.log("📄 Deployment data saved to:", deploymentFile);

  // ===== VERIFICATION COMMANDS =====
  
  console.log("\n📝 Verification Commands:");
  console.log("==========================================");
  console.log("Run these commands to verify contracts on Polygonscan:");
  console.log(`npx hardhat verify --network polygon ${await oracle.getAddress()} "${ethers.parseUnits("2000", 18)}"`);
  console.log(`npx hardhat verify --network polygon ${await vault.getAddress()} "${MOCK_USDC}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network polygon ${await market.getAddress()} "${await vault.getAddress()}" "${await oracle.getAddress()}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network polygon ${await preAdapter.getAddress()} "${await vault.getAddress()}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network polygon ${await postAdapter.getAddress()} "${await vault.getAddress()}" "${await market.getAddress()}" "${deployer.address}"`);
  console.log(`npx hardhat verify --network polygon ${await settlement.getAddress()} "${await vault.getAddress()}" "${await postAdapter.getAddress()}" "${deployer.address}"`);

  console.log("\n🎉 1inch LOP Futures System Ready for Production!");
  console.log("Next steps:");
  console.log("1. Test on Polygon fork");
  console.log("2. Create 1inch SDK integration examples");  
  console.log("3. Deploy to Polygon mainnet");
  console.log("4. Verify contracts on Polygonscan");
}

// Handle deployment errors
main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
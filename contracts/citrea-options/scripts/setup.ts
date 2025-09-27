import { ethers } from "hardhat";
import CitreaOptionsModule from "../ignition/modules/CitreaOptions";

async function main() {
  console.log("Setting up Citrea Options Trading Platform...");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // This would be used after deployment to set up the contracts
  // For now, just log the deployment info
  
  console.log("\n=== Deployment Configuration ===");
  console.log("Deployer Address:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  
  console.log("\n=== Contract Setup Instructions ===");
  console.log("1. Deploy contracts using: npx hardhat ignition deploy ./ignition/modules/CitreaOptions.ts --network citrea");
  console.log("2. After deployment, run setup to:");
  console.log("   - Add supported assets to options contract");
  console.log("   - Configure price feeds");
  console.log("   - Set market parameters");
  console.log("   - Mint test tokens for demo");

  console.log("\n=== Test Scenarios ===");
  console.log("Mock BTC Price: $97,000 (can be updated via MockPriceFeed.updateAnswer())");
  console.log("Mock ETH Price: $3,500 (can be updated via MockPriceFeed.updateAnswer())");
  console.log("Time Oracle: Can fast forward time for testing expiry");
  console.log("Option Expiry: 15th and 30th of each month");
  
  // Sample contract interaction code
  console.log("\n=== Sample Usage ===");
  console.log(`
  // After deployment, interact with contracts like this:
  
  const optionsContract = await ethers.getContractAt("CitreaOptionsTrading", deployedAddress);
  
  // Add BTC as supported asset
  await optionsContract.addSupportedAsset(
    bitcoinTokenAddress,
    btcPriceFeedAddress,
    2000, // 20% volatility
    500   // 5% risk-free rate
  );
  
  // Add USDC as collateral
  await optionsContract.addSupportedCollateral(stableCoinAddress);
  
  // Create a call option
  await optionsContract.createOption(
    0, // CALL
    10000000000000, // $100,000 strike (8 decimals)
    expiryTimestamp,
    bitcoinTokenAddress,
    stableCoinAddress,
    100000000 // 1 BTC contract size
  );
  `);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
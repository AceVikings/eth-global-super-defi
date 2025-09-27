import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Deploying Citrea Options contracts...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy TimeOracle
  console.log("Deploying TimeOracle...");
  const TimeOracle = await hre.ethers.getContractFactory("TimeOracle");
  const timeOracle = await TimeOracle.deploy(deployer.address);
  await timeOracle.waitForDeployment();
  console.log("TimeOracle deployed to:", await timeOracle.getAddress());

  // Deploy Mock Tokens
  console.log("Deploying StableCoin (mUSDC)...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const stableCoin = await MockERC20.deploy(
    "Mock USDC", "mUSDC", 6, 1000000, deployer.address
  );
  await stableCoin.waitForDeployment();
  console.log("StableCoin deployed to:", await stableCoin.getAddress());

  console.log("Deploying BitcoinToken (mBTC)...");
  const bitcoinToken = await MockERC20.deploy(
    "Mock Bitcoin", "mBTC", 8, 21000000, deployer.address
  );
  await bitcoinToken.waitForDeployment();
  console.log("BitcoinToken deployed to:", await bitcoinToken.getAddress());

  // Deploy WrappedNativeToken
  console.log("Deploying WrappedNativeToken...");
  const WrappedNativeToken = await hre.ethers.getContractFactory("WrappedNativeToken");
  const wrappedNative = await WrappedNativeToken.deploy();
  await wrappedNative.waitForDeployment();
  console.log("WrappedNativeToken deployed to:", await wrappedNative.getAddress());

  // Deploy Price Feeds
  console.log("Deploying BTC Price Feed...");
  const MockPriceFeed = await hre.ethers.getContractFactory("MockPriceFeed");
  const btcPriceFeed = await MockPriceFeed.deploy(
    "BTC / USD", 8, 9700000000000, deployer.address // $97,000
  );
  await btcPriceFeed.waitForDeployment();
  console.log("BTC PriceFeed deployed to:", await btcPriceFeed.getAddress());

  console.log("Deploying ETH Price Feed...");
  const ethPriceFeed = await MockPriceFeed.deploy(
    "ETH / USD", 8, 350000000000, deployer.address // $3,500
  );
  await ethPriceFeed.waitForDeployment();
  console.log("ETH PriceFeed deployed to:", await ethPriceFeed.getAddress());

  // Deploy main Options Trading contract
  console.log("Deploying CitreaOptionsTrading...");
  const CitreaOptionsTrading = await hre.ethers.getContractFactory("CitreaOptionsTrading");
  const optionsTrading = await CitreaOptionsTrading.deploy(
    deployer.address,
    await timeOracle.getAddress()
  );
  await optionsTrading.waitForDeployment();
  console.log("CitreaOptionsTrading deployed to:", await optionsTrading.getAddress());

  // Save deployment addresses
  const addresses = {
    network: "citrea",
    deployer: deployer.address,
    contracts: {
      timeOracle: await timeOracle.getAddress(),
      stableCoin: await stableCoin.getAddress(),
      bitcoinToken: await bitcoinToken.getAddress(),
      wrappedNative: await wrappedNative.getAddress(),
      btcPriceFeed: await btcPriceFeed.getAddress(),
      ethPriceFeed: await ethPriceFeed.getAddress(),
      optionsTrading: await optionsTrading.getAddress(),
    }
  };

  fs.writeFileSync('./deployed-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n=== Deployment Complete ===");
  console.log("Addresses saved to deployed-addresses.json");
  
  // Initial setup
  console.log("\n=== Setting up contracts ===");
  
  // Add BTC as supported asset
  await optionsTrading.addSupportedAsset(
    await bitcoinToken.getAddress(),
    await btcPriceFeed.getAddress(),
    2000, // 20% volatility
    500   // 5% risk-free rate
  );
  console.log("Added BTC as supported asset");

  // Add USDC as collateral
  await optionsTrading.addSupportedCollateral(await stableCoin.getAddress());
  console.log("Added USDC as supported collateral");

  console.log("\n=== Setup Complete ===");
  console.log("Ready for testing!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
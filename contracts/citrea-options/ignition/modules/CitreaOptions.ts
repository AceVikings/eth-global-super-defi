import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CitreaOptionsModule = buildModule("CitreaOptionsModule", (m) => {
  // Parameters for deployment
  const deployerAddress = m.getParameter("deployerAddress", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  
  // Deploy TimeOracle first
  const timeOracle = m.contract("TimeOracle", [deployerAddress]);

  // Deploy MockERC20 tokens for testing with unique IDs
  const stableCoin = m.contract("MockERC20", [
    "Mock USDC",
    "mUSDC",
    6,
    1000000, // 1M initial supply
    deployerAddress
  ], { id: "StableCoin" });

  const bitcoinToken = m.contract("MockERC20", [
    "Mock Bitcoin",
    "mBTC",
    8,
    21000000, // 21M initial supply
    deployerAddress
  ], { id: "BitcoinToken" });

  // Deploy WrappedNativeToken
  const wrappedNative = m.contract("WrappedNativeToken");

  // Deploy Price Feeds with unique IDs
  const btcPriceFeed = m.contract("MockPriceFeed", [
    "BTC / USD",
    8,
    9700000000000, // $97,000 with 8 decimals
    deployerAddress
  ], { id: "BtcPriceFeed" });

  const ethPriceFeed = m.contract("MockPriceFeed", [
    "ETH / USD", 
    8,
    350000000000, // $3,500 with 8 decimals
    deployerAddress
  ], { id: "EthPriceFeed" });

  // Deploy main CitreaOptionsTrading contract
  const optionsTrading = m.contract("CitreaOptionsTrading", [
    deployerAddress,
    timeOracle
  ]);

  return {
    timeOracle,
    stableCoin,
    bitcoinToken,
    wrappedNative,
    btcPriceFeed,
    ethPriceFeed,
    optionsTrading,
  };
});

export default CitreaOptionsModule;
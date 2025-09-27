import { describe, it } from "node:test";
import assert from "node:assert";
import { network } from "hardhat";

describe("Citrea Options Trading", function () {
  describe("Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      const { viem } = await network.connect();
      
      // Deploy TimeOracle
      const [owner] = await viem.getWalletClients();
      const timeOracle = await viem.deployContract("TimeOracle", [owner.account.address]);
      
      // Deploy MockERC20 tokens
      const stableCoin = await viem.deployContract("MockERC20", [
        "Mock USDC",
        "mUSDC",
        6,
        1000000n, // 1M initial supply
        owner.account.address
      ]);

      const bitcoinToken = await viem.deployContract("MockERC20", [
        "Mock Bitcoin", 
        "mBTC",
        8,
        21000000n, // 21M initial supply
        owner.account.address
      ]);

      // Deploy WrappedNativeToken
      const wrappedNative = await viem.deployContract("WrappedNativeToken");

      // Deploy Price Feed
      const btcPriceFeed = await viem.deployContract("MockPriceFeed", [
        "BTC / USD",
        8,
        9700000000000n, // $97,000 with 8 decimals
        owner.account.address
      ]);

      // Deploy main contract
      const optionsTrading = await viem.deployContract("CitreaOptionsTrading", [
        owner.account.address,
        timeOracle.address
      ]);

      // Verify deployments
      const currentTime = await timeOracle.read.getCurrentTime();
      assert(currentTime > 0n, "TimeOracle should return current time");
      
      const stableName = await stableCoin.read.name();
      assert.strictEqual(stableName, "Mock USDC");
      
      const btcSymbol = await bitcoinToken.read.symbol();
      assert.strictEqual(btcSymbol, "mBTC");
      
      // The nextOptionId is a public variable - deployment successful
      console.log("✅ All contracts deployed successfully!");
    });

    it("Should set up supported assets and collaterals", async function () {
      const { viem } = await network.connect();
      const [owner] = await viem.getWalletClients();
      
      // Deploy contracts
      const timeOracle = await viem.deployContract("TimeOracle", [owner.account.address]);
      const bitcoinToken = await viem.deployContract("MockERC20", [
        "Mock Bitcoin", "mBTC", 8, 21000000n, owner.account.address
      ]);
      const stableCoin = await viem.deployContract("MockERC20", [
        "Mock USDC", "mUSDC", 6, 1000000n, owner.account.address
      ]);
      const btcPriceFeed = await viem.deployContract("MockPriceFeed", [
        "BTC / USD", 8, 9700000000000n, owner.account.address
      ]);
      const optionsTrading = await viem.deployContract("CitreaOptionsTrading", [
        owner.account.address, timeOracle.address
      ]);

      // Add supported asset
      await optionsTrading.write.addSupportedAsset([
        bitcoinToken.address,
        btcPriceFeed.address,
        2000n, // 20% volatility
        500n   // 5% risk-free rate
      ]);

      // Add supported collateral
      await optionsTrading.write.addSupportedCollateral([stableCoin.address]);

      // Verify setup
      const isSupportedAsset = await optionsTrading.read.supportedAssets([bitcoinToken.address]);
      assert.strictEqual(isSupportedAsset, true);
      
      const isSupportedCollateral = await optionsTrading.read.supportedCollaterals([stableCoin.address]);
      assert.strictEqual(isSupportedCollateral, true);
    });
  });

  describe("Options Trading", function () {
    it("Should create an option successfully", async function () {
      const { viem } = await network.connect();
      const [owner, user1] = await viem.getWalletClients();
      
      // Deploy all contracts
      const timeOracle = await viem.deployContract("TimeOracle", [owner.account.address]);
      const bitcoinToken = await viem.deployContract("MockERC20", [
        "Mock Bitcoin", "mBTC", 8, 21000000n, owner.account.address
      ]);
      const stableCoin = await viem.deployContract("MockERC20", [
        "Mock USDC", "mUSDC", 6, 1000000n, owner.account.address
      ]);
      const btcPriceFeed = await viem.deployContract("MockPriceFeed", [
        "BTC / USD", 8, 9700000000000n, owner.account.address
      ]);
      const optionsTrading = await viem.deployContract("CitreaOptionsTrading", [
        owner.account.address, timeOracle.address
      ]);

      // Setup
      await optionsTrading.write.addSupportedAsset([
        bitcoinToken.address, btcPriceFeed.address, 2000n, 500n
      ]);
      await optionsTrading.write.addSupportedCollateral([stableCoin.address]);

      // Mint tokens for user1 (need to mint enough to cover collateral)
      // For a call option on 1 BTC at current price of $97,000, we need ~$97,000 worth of collateral
      // With 6 decimals USDC: 97000 * 10^6 = 97,000,000,000
      await stableCoin.write.mint([user1.account.address, 100000000n]); // 100M USDC (100,000 actual USDC)

      // Get current time and set expiry for 1 day from now
      const currentTime = await timeOracle.read.getCurrentTime();
      const expiryTime = currentTime + 86400n; // 1 day

      // Calculate required collateral for the option
      const collateralRequired = await optionsTrading.read.calculateCollateralRequired([
        0, // CALL (use number instead of bigint for enum)
        10000000000000n, // $100,000 strike
        bitcoinToken.address,
        100000000n // 1 BTC contract size
      ]);

      // User1 approves collateral and creates option
      const user1OptionsContract = await viem.getContractAt("CitreaOptionsTrading", optionsTrading.address, {
        client: { wallet: user1 }
      });
      const user1StableCoin = await viem.getContractAt("MockERC20", stableCoin.address, {
        client: { wallet: user1 }
      });

      await user1StableCoin.write.approve([optionsTrading.address, collateralRequired]);
      
      await user1OptionsContract.write.createOption([
        0, // CALL (use number for enum)
        10000000000000n, // $100,000 strike (8 decimals)
        expiryTime,
        bitcoinToken.address,
        stableCoin.address,
        100000000n // 1 BTC contract size (8 decimals)
      ]);

      // Verify option was created
      const option = await optionsTrading.read.getOption([1n]);
      assert.strictEqual(option.writer.toLowerCase(), user1.account.address.toLowerCase());
      assert.strictEqual(option.strikePrice, 10000000000000n);
      assert.strictEqual(option.optionType, 0); // CALL
    });

    it("Should calculate premium correctly", async function () {
      const { viem } = await network.connect();
      const [owner] = await viem.getWalletClients();
      
      // Deploy minimal contracts needed
      const timeOracle = await viem.deployContract("TimeOracle", [owner.account.address]);
      const bitcoinToken = await viem.deployContract("MockERC20", [
        "Mock Bitcoin", "mBTC", 8, 21000000n, owner.account.address
      ]);
      const btcPriceFeed = await viem.deployContract("MockPriceFeed", [
        "BTC / USD", 8, 9700000000000n, owner.account.address
      ]);
      const optionsTrading = await viem.deployContract("CitreaOptionsTrading", [
        owner.account.address, timeOracle.address
      ]);

      // Setup
      await optionsTrading.write.addSupportedAsset([
        bitcoinToken.address, btcPriceFeed.address, 2000n, 500n
      ]);

      // Calculate premium for different scenarios
      const currentTime = await timeOracle.read.getCurrentTime();
      const expiryTime = currentTime + 86400n; // 1 day

      const callPremium = await optionsTrading.read.calculatePremium([
        0, // CALL (use number for enum)
        10000000000000n, // $100,000 strike
        expiryTime,
        bitcoinToken.address,
        100000000n // 1 BTC
      ]);

      const putPremium = await optionsTrading.read.calculatePremium([
        1, // PUT (use number for enum)
        9000000000000n, // $90,000 strike
        expiryTime,
        bitcoinToken.address,
        100000000n // 1 BTC
      ]);

      // Premiums should be positive
      assert(callPremium > 0n, "Call premium should be positive");
      assert(putPremium > 0n, "Put premium should be positive");
    });

    it("Should complete full option trading flow", async function () {
      const { viem } = await network.connect();
      const [owner, writer, buyer] = await viem.getWalletClients();
      
      // Deploy all contracts
      const timeOracle = await viem.deployContract("TimeOracle", [owner.account.address]);
      const bitcoinToken = await viem.deployContract("MockERC20", [
        "Mock Bitcoin", "mBTC", 8, 21000000n, owner.account.address
      ]);
      const stableCoin = await viem.deployContract("MockERC20", [
        "Mock USDC", "mUSDC", 6, 1000000n, owner.account.address
      ]);
      const btcPriceFeed = await viem.deployContract("MockPriceFeed", [
        "BTC / USD", 8, 9700000000000n, owner.account.address
      ]);
      const optionsTrading = await viem.deployContract("CitreaOptionsTrading", [
        owner.account.address, timeOracle.address
      ]);

      // Setup
      await optionsTrading.write.addSupportedAsset([
        bitcoinToken.address, btcPriceFeed.address, 2000n, 500n
      ]);
      await optionsTrading.write.addSupportedCollateral([stableCoin.address]);

      // Fund users
      await stableCoin.write.mint([writer.account.address, 100000000n]); // 100M USDC for writer
      await stableCoin.write.mint([buyer.account.address, 10000000n]);   // 10M USDC for buyer

      // Writer creates call option
      const currentTime = await timeOracle.read.getCurrentTime();
      const expiryTime = currentTime + 86400n; // 1 day
      
      const writerOptionsContract = await viem.getContractAt("CitreaOptionsTrading", optionsTrading.address, {
        client: { wallet: writer }
      });
      const writerStableCoin = await viem.getContractAt("MockERC20", stableCoin.address, {
        client: { wallet: writer }
      });

      const collateralRequired = await optionsTrading.read.calculateCollateralRequired([
        0, 10000000000000n, bitcoinToken.address, 100000000n
      ]);
      
      await writerStableCoin.write.approve([optionsTrading.address, collateralRequired]);
      await writerOptionsContract.write.createOption([
        0, 10000000000000n, expiryTime, bitcoinToken.address, stableCoin.address, 100000000n
      ]);

      // Get option details and premium
      const option = await optionsTrading.read.getOption([1n]);

      // Buyer purchases the option
      const buyerOptionsContract = await viem.getContractAt("CitreaOptionsTrading", optionsTrading.address, {
        client: { wallet: buyer }
      });
      const buyerStableCoin = await viem.getContractAt("MockERC20", stableCoin.address, {
        client: { wallet: buyer }
      });

      await buyerStableCoin.write.approve([optionsTrading.address, option.premium]);
      await buyerOptionsContract.write.purchaseOption([1n]);

      // Verify option is now owned by buyer
      const purchasedOption = await optionsTrading.read.getOption([1n]);
      assert.strictEqual(purchasedOption.buyer.toLowerCase(), buyer.account.address.toLowerCase());

      // Price increases - option becomes profitable
      await btcPriceFeed.write.updateAnswer([11000000000000n]); // $110,000

      // Buyer exercises the option
      const initialBuyerBalance = await stableCoin.read.balanceOf([buyer.account.address]);
      await buyerOptionsContract.write.exerciseOption([1n]);
      const finalBuyerBalance = await stableCoin.read.balanceOf([buyer.account.address]);

      // Buyer should have received profit from the option exercise
      const profit = finalBuyerBalance - initialBuyerBalance;
      assert(profit > 0n, "Buyer should have made profit from exercising the option");

      // Verify option is now exercised
      const exercisedOption = await optionsTrading.read.getOption([1n]);
      assert.strictEqual(exercisedOption.status, 1); // EXERCISED
    });
  });

  describe("Mock Contracts", function () {
    it("Should mint tokens via faucet", async function () {
      const { viem } = await network.connect();
      const [owner, user1] = await viem.getWalletClients();
      
      const stableCoin = await viem.deployContract("MockERC20", [
        "Mock USDC", "mUSDC", 6, 1000000n, owner.account.address
      ]);
      
      const user1StableCoin = await viem.getContractAt("MockERC20", stableCoin.address, {
        client: { wallet: user1 }
      });
      
      await user1StableCoin.write.faucet([1000n]);
      
      const balance = await stableCoin.read.balanceOf([user1.account.address]);
      assert.strictEqual(balance, 1000000000n); // 1000 * 10^6 (6 decimals)
    });

    it("Should update price feeds", async function () {
      const { viem } = await network.connect();
      const [owner] = await viem.getWalletClients();
      
      const btcPriceFeed = await viem.deployContract("MockPriceFeed", [
        "BTC / USD", 8, 9700000000000n, owner.account.address
      ]);
      
      await btcPriceFeed.write.updateAnswer([10000000000000n]); // $100,000
      
      const latestPrice = await btcPriceFeed.read.latestAnswer();
      assert.strictEqual(latestPrice, 10000000000000n);
    });

    it("Should wrap and unwrap native tokens", async function () {
      const { viem } = await network.connect();
      const [, user1] = await viem.getWalletClients();
      
      const wrappedNative = await viem.deployContract("WrappedNativeToken");
      
      const user1WrappedNative = await viem.getContractAt("WrappedNativeToken", wrappedNative.address, {
        client: { wallet: user1 }
      });
      
      // Deposit native tokens
      await user1WrappedNative.write.deposit({ 
        value: 1000000000000000000n // 1 ETH in wei
      });
      
      const balance = await wrappedNative.read.balanceOf([user1.account.address]);
      assert.strictEqual(balance, 1000000000000000000n);
      
      // Withdraw half
      await user1WrappedNative.write.withdraw([500000000000000000n]);
      
      const newBalance = await wrappedNative.read.balanceOf([user1.account.address]);
      assert.strictEqual(newBalance, 500000000000000000n);
    });

    it("Should manipulate time with TimeOracle", async function () {
      const { viem } = await network.connect();
      const [owner] = await viem.getWalletClients();
      
      const timeOracle = await viem.deployContract("TimeOracle", [owner.account.address]);
      
      const initialTime = await timeOracle.read.getCurrentTime();
      
      // Fast forward 1 day
      await timeOracle.write.fastForward([86400n]);
      
      const newTime = await timeOracle.read.getCurrentTime();
      assert(newTime >= initialTime + 86400n, "Time should have advanced by at least 1 day");
      
      // Reset to blockchain time
      await timeOracle.write.useBlockTime();
      
      const resetTime = await timeOracle.read.getCurrentTime();
      // Should be close to initial time (within a few seconds)
      assert(resetTime <= initialTime + 10n, "Time should reset to near blockchain time");
    });
  });
});
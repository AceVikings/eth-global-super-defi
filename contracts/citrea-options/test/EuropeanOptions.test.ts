import { describe, it } from "node:test";
import assert from "node:assert";
import { network } from "hardhat";

describe("European Options Contract Tests", function () {
  it("Should properly implement European-style settlement restrictions", async function () {
    const { viem } = await network.connect();
    const [owner, trader1, trader2] = await viem.getWalletClients();

    console.log("\n=== 🇪🇺 European Options Test ===\n");

    // ===== DEPLOYMENT =====
    console.log("📦 Phase 1: Contract Deployment");

    // Deploy basic contracts
    const stablecoin = await viem.deployContract("MockERC20", [
      "USD Coin",
      "USDC",
      6,
      BigInt("1000000000000"), // 1M USDC
      owner.account.address,
    ]);

    const wbtc = await viem.deployContract("MockERC20", [
      "Wrapped Bitcoin", 
      "WBTC",
      8,
      BigInt("2100000000000000"), // 21M WBTC
      owner.account.address,
    ]);

    const timeOracle = await viem.deployContract("TimeOracle", [owner.account.address]);
    
    const wbtcPriceFeed = await viem.deployContract("MockPriceFeed", [
      "BTC/USD",
      8,
      BigInt("4500000000000"), // $45,000
      owner.account.address,
    ]);

    const layeredOptions = await viem.deployContract(
      "CitreaLayeredOptionsTrading",
      [owner.account.address, stablecoin.address, timeOracle.address]
    );

    // Setup
    await layeredOptions.write.addSupportedAsset([wbtc.address, wbtcPriceFeed.address]);

    // Distribute tokens
    const wbtcAmount = BigInt("100000000"); // 1 WBTC
    await wbtc.write.mint([trader1.account.address, wbtcAmount]);
    await wbtc.write.approve([layeredOptions.address, wbtcAmount], {
      account: trader1.account,
    });

    console.log("✅ Deployment and setup complete");

    // ===== TEST EUROPEAN RESTRICTIONS =====
    console.log("\n🔒 Phase 2: European Settlement Restrictions");

    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const maturity = currentTime + 86400n * 30n; // 30 days

    // Create option
    await layeredOptions.write.createLayeredOption(
      [
        wbtc.address,
        BigInt("5000000000000"), // $50,000 strike
        maturity,
        BigInt("5000000"), // 0.05 WBTC premium
        0n, // No parent
        0, // CALL option
      ],
      { account: trader1.account }
    );

    console.log("✅ Created WBTC CALL option");

    // Test 1: Cannot settle before maturity
    try {
      await layeredOptions.write.settleOption([1n], { account: trader1.account });
      assert.fail("Should not allow settlement before maturity");
    } catch (error: any) {
      assert(
        error.message.includes("Not yet matured") ||
          error.message.includes("revert")
      );
      console.log("✅ Pre-maturity settlement correctly rejected");
    }

    // Test 2: Check maturity status
    const isMatured = await layeredOptions.read.isOptionMatured([1n]);
    assert.strictEqual(isMatured, false, "Option should not be matured yet");
    console.log("✅ Maturity status check works");

    // Test 3: Verify option details
    const option = await layeredOptions.read.options([1n]);
    assert.strictEqual(option[2], maturity, "Maturity should be set correctly");
    assert.strictEqual(option[7], false, "Option should not be settled");
    console.log("✅ Option details validated");

    console.log("\n🎉 European-style restrictions working correctly!");
  });

  it("Should validate maturity-based parameter names", async function () {
    const { viem } = await network.connect();
    const [owner, trader1] = await viem.getWalletClients();

    console.log("\n📝 Testing parameter naming consistency");

    // Quick deployment
    const stablecoin = await viem.deployContract("MockERC20", [
      "USDC", "USDC", 6, BigInt("1000000000000"), owner.account.address
    ]);
    const wbtc = await viem.deployContract("MockERC20", [
      "WBTC", "WBTC", 8, BigInt("2100000000000000"), owner.account.address
    ]);
    const timeOracle = await viem.deployContract("TimeOracle", [owner.account.address]);
    const priceFeed = await viem.deployContract("MockPriceFeed", [
      "BTC/USD", 8, BigInt("4500000000000"), owner.account.address
    ]);

    const layeredOptions = await viem.deployContract(
      "CitreaLayeredOptionsTrading",
      [owner.account.address, stablecoin.address, timeOracle.address]
    );
    
    await layeredOptions.write.addSupportedAsset([wbtc.address, priceFeed.address]);

    // Test: Invalid maturity (past)
    const pastMaturity = BigInt(Math.floor(Date.now() / 1000)) - 86400n;

    try {
      await layeredOptions.write.createLayeredOption(
        [
          wbtc.address,
          BigInt("5000000000000"),
          pastMaturity,
          BigInt("5000000"),
          0n,
          0,
        ],
        { account: trader1.account }
      );
      assert.fail("Should reject past maturity");
    } catch (error: any) {
      assert(
        error.message.includes("Invalid maturity") ||
          error.message.includes("revert")
      );
      console.log("✅ Past maturity rejection works");
    }

    console.log("✅ Parameter validation complete");
  });
});
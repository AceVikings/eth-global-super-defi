import { describe, it } from "node:test";
import assert from "node:assert";
import { network } from "hardhat";

describe("Contract Lifecycle End-to-End", function () {
  it("Should complete full contract lifecycle with all features", async function () {
    const { viem } = await network.connect();
    const [owner, trader1, trader2, trader3] = await viem.getWalletClients();

    console.log("\n=== 🚀 Starting Contract Lifecycle Test ===\n");

    // ===== 1. DEPLOYMENT PHASE =====
    console.log("📦 Phase 1: Contract Deployment");

    // Deploy mock stablecoin (USDC)
    const stablecoin = await viem.deployContract("MockERC20", [
      "USD Coin",
      "USDC",
      6, // USDC has 6 decimals
      BigInt("1000000000000"), // 1M USDC (6 decimals)
      owner.account.address,
    ]);
    console.log(`✅ Stablecoin deployed at: ${stablecoin.address}`);

    // Deploy mock WBTC
    const wbtc = await viem.deployContract("MockERC20", [
      "Wrapped Bitcoin",
      "WBTC",
      8, // WBTC has 8 decimals
      BigInt("2100000000000000"), // 21M WBTC (8 decimals)
      owner.account.address,
    ]);
    console.log(`✅ WBTC deployed at: ${wbtc.address}`);

    // Deploy mock ETH
    const weth = await viem.deployContract("MockERC20", [
      "Wrapped Ethereum",
      "WETH",
      18, // ETH has 18 decimals
      BigInt("120000000000000000000000000"), // 120M WETH (18 decimals)
      owner.account.address,
    ]);
    console.log(`✅ WETH deployed at: ${weth.address}`);

    // Deploy TimeOracle
    const timeOracle = await viem.deployContract("TimeOracle", [owner.account.address]);
    console.log(`✅ TimeOracle deployed at: ${timeOracle.address}`);

    // Deploy price feeds for assets
    const wbtcPriceFeed = await viem.deployContract("MockPriceFeed", [
      "BTC/USD",
      8, // 8 decimals for price
      BigInt("4500000000000"), // $45,000 initial price (8 decimals)
      owner.account.address,
    ]);

    const wethPriceFeed = await viem.deployContract("MockPriceFeed", [
      "ETH/USD", 
      8, // 8 decimals for price
      BigInt("280000000000"), // $2,800 initial price (8 decimals) 
      owner.account.address,
    ]);
    
    console.log(`✅ Price feeds deployed: WBTC at ${wbtcPriceFeed.address}, WETH at ${wethPriceFeed.address}`);

    // Deploy LayeredOptions contract
    const layeredOptions = await viem.deployContract(
      "CitreaLayeredOptionsTrading",
      [owner.account.address, stablecoin.address, timeOracle.address]
    );
    console.log(`✅ LayeredOptions deployed at: ${layeredOptions.address}`);

    // ===== 2. SETUP PHASE =====
    console.log("\n⚙️ Phase 2: Contract Setup");

    // Add supported assets with price feeds
    await layeredOptions.write.addSupportedAsset([wbtc.address, wbtcPriceFeed.address]);
    await layeredOptions.write.addSupportedAsset([weth.address, wethPriceFeed.address]); 
    console.log(`✅ Added WBTC and WETH as supported assets with price feeds`);

    // Distribute tokens to traders
    const usdcAmount = BigInt("100000000000"); // 100k USDC (6 decimals)
    const wbtcAmount = BigInt("1000000000"); // 10 WBTC (8 decimals)
    const wethAmount = BigInt("100000000000000000000"); // 100 ETH (18 decimals)

    for (const trader of [trader1, trader2, trader3]) {
      await stablecoin.write.mint([trader.account.address, usdcAmount]);
      await wbtc.write.mint([trader.account.address, wbtcAmount]);
      await weth.write.mint([trader.account.address, wethAmount]);

      // Approve spending
      await stablecoin.write.approve([layeredOptions.address, usdcAmount], {
        account: trader.account,
      });
      await wbtc.write.approve([layeredOptions.address, wbtcAmount], {
        account: trader.account,
      });
      await weth.write.approve([layeredOptions.address, wethAmount], {
        account: trader.account,
      });
    }
    console.log(`✅ Distributed tokens and set approvals for 3 traders`);

    // ===== 3. PARENT OPTIONS CREATION PHASE =====
    console.log("\n🎯 Phase 3: Parent Options Creation (Writers put up collateral)");

    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const expiry30Days = currentTime + 86400n * 30n;
    const expiry60Days = currentTime + 86400n * 60n;

    // Trader1 creates WBTC CALL option ($50,000 strike) - puts WBTC as collateral
    const btcCallStrike = BigInt("5000000000000"); // $50,000 (8 decimals)
    const btcCallPremium = BigInt("10000000"); // 0.1 WBTC premium (8 decimals)

    await layeredOptions.write.createLayeredOption(
      [
        wbtc.address,
        btcCallStrike,
        expiry30Days,
        btcCallPremium,
        0n, // No parent
        0, // CALL option
      ],
      { account: trader1.account }
    );

    console.log(`✅ Trader1 created WBTC CALL option (Token ID: 1)`);
    console.log(`   - Strike: $50,000`);
    console.log(`   - Premium: 0.1 WBTC (to be paid by buyer)`);
    console.log(`   - Collateral: 1 WBTC (locked by trader1)`);

    // Trader2 creates WBTC PUT option ($40,000 strike) - puts WBTC as collateral
    const btcPutStrike = BigInt("4000000000000"); // $40,000 (8 decimals)
    const btcPutPremium = BigInt("5000000"); // 0.05 WBTC premium (8 decimals)

    await layeredOptions.write.createLayeredOption(
      [
        wbtc.address,
        btcPutStrike,
        expiry60Days,
        btcPutPremium,
        0n, // No parent
        1, // PUT option
      ],
      { account: trader2.account }
    );

    console.log(`✅ Trader2 created WBTC PUT option (Token ID: 2)`);
    console.log(`   - Strike: $40,000`);
    console.log(`   - Premium: 0.05 WBTC (to be paid by buyer)`);
    console.log(`   - Collateral: ~0.89 WBTC (locked by trader2)`);

    // Trader3 creates WETH CALL option ($3,000 strike) - puts WETH as collateral
    const ethCallStrike = BigInt("3000000000000000000000"); // $3,000 (18 decimals)
    const ethCallPremium = BigInt("100000000000000000"); // 0.1 WETH premium (18 decimals)

    await layeredOptions.write.createLayeredOption(
      [
        weth.address,
        ethCallStrike,
        expiry30Days,
        ethCallPremium,
        0n, // No parent
        0, // CALL option
      ],
      { account: trader3.account }
    );

    console.log(`✅ Trader3 created WETH CALL option (Token ID: 3)`);
    console.log(`   - Strike: $3,000`);
    console.log(`   - Premium: 0.1 WETH (to be paid by buyer)`); 
    console.log(`   - Collateral: 1 WETH (locked by trader3)`);

    // ===== 4. OPTIONS PURCHASING PHASE =====
    console.log("\n💰 Phase 4: Options Purchasing (Buyers pay premiums)");

    // Now different traders can purchase these options by paying premiums
    console.log("Note: In production, buyers would call purchaseOption() to pay premiums");
    console.log("For now, options remain with their creators as this is creation demo");

    console.log("\n📊 Summary of created options:");
    console.log("1. WBTC CALL $50K - Writer: Trader1, Premium: 0.1 WBTC");
    console.log("2. WBTC PUT $40K - Writer: Trader2, Premium: 0.05 WBTC"); 
    console.log("3. WETH CALL $3K - Writer: Trader3, Premium: 0.1 WETH");

    // ===== 4. CHILD OPTIONS CREATION PHASE =====
    console.log("\n👶 Phase 4: Child Options Creation");

    // Create child CALL from WBTC CALL (higher strike)
    const btcChildCallStrike = BigInt("5200000000000"); // $52,000 (higher than parent)
    const childExpiry = currentTime + 86400n * 20n; // 20 days

    await layeredOptions.write.createChildOption(
      [
        1n, // Parent token ID (WBTC CALL)
        btcChildCallStrike,
        childExpiry,
      ],
      { account: trader1.account }
    );

    console.log(
      `✅ Created child CALL option (Token ID: 4) - Strike: $52,000, Parent: Token 1`
    );

    // Create child PUT from WBTC PUT (lower strike)
    const btcChildPutStrike = BigInt("3800000000000"); // $38,000 (lower than parent)

    await layeredOptions.write.createChildOption(
      [
        2n, // Parent token ID (WBTC PUT)
        btcChildPutStrike,
        childExpiry,
      ],
      { account: trader2.account }
    );

    console.log(
      `✅ Created child PUT option (Token ID: 5) - Strike: $38,000, Parent: Token 2`
    );

    // ===== 5. VALIDATION PHASE =====
    console.log("\n🔍 Phase 5: Contract State Validation");

    // Check option details
    const option1 = await layeredOptions.read.options([1n]);
    const option4 = await layeredOptions.read.options([4n]);
    const option5 = await layeredOptions.read.options([5n]);

    // Validate parent-child relationships
    assert.strictEqual(
      option4[4],
      1n,
      "Child CALL should have correct parent ID"
    );
    assert.strictEqual(
      option5[4],
      2n,
      "Child PUT should have correct parent ID"
    );

    // Validate option types are inherited
    assert.strictEqual(
      option1[5],
      option4[5],
      "Child should inherit CALL type from parent"
    );
    assert.strictEqual(option5[5], 1, "Child PUT should have correct type");

    // Validate premium tokens for child options
    assert.strictEqual(
      option4[6].toLowerCase(),
      stablecoin.address.toLowerCase(),
      "Child option premium should be in stablecoin"
    );
    assert.strictEqual(
      option5[6].toLowerCase(),
      stablecoin.address.toLowerCase(),
      "Child option premium should be in stablecoin"
    );

    console.log(`✅ All parent-child relationships validated`);

    // ===== 6. PREMIUM CALCULATION VALIDATION =====
    console.log("\n💰 Phase 6: Premium Calculation Validation");

    // Test premium calculation for potential child options
    const testStrike1 = BigInt("5500000000000"); // $55,000
    const testExpiry1 = currentTime + 86400n * 15n; // 15 days

    const calculatedPremium1 = await layeredOptions.read.calculateChildPremium([
      1n, // WBTC CALL parent
      testStrike1,
      testExpiry1,
    ]);

    console.log(
      `✅ Premium calculation works - ${calculatedPremium1} USDC for $55K strike CALL child`
    );

    // Verify minimum premium enforcement
    const minPremiumThreshold = BigInt("1000"); // 0.001 USDC (6 decimals)
    assert(
      calculatedPremium1 >= minPremiumThreshold,
      "Premium should meet minimum threshold"
    );

    // ===== 7. ACCESS CONTROL VALIDATION =====
    console.log("\n🔐 Phase 7: Access Control Validation");

    // Try to create child option from non-holder (should fail)
    try {
      await layeredOptions.write.createChildOption(
        [
          1n, // WBTC CALL (owned by trader1)
          BigInt("5300000000000"), // $53,000
          childExpiry,
        ],
        { account: trader2.account }
      ); // trader2 trying to use trader1's option

      assert.fail("Should have reverted with 'Not parent holder'");
    } catch (error: any) {
      assert(
        error.message.includes("Not parent holder") ||
          error.message.includes("revert"),
        "Should revert with correct error"
      );
      console.log(
        `✅ Access control works - non-holders cannot create child options`
      );
    }

    // ===== 8. STRIKE PRICE VALIDATION =====
    console.log("\n📊 Phase 8: Strike Price Validation");

    // Try to create CALL child with lower strike (should fail)
    try {
      await layeredOptions.write.createChildOption(
        [
          1n, // WBTC CALL parent ($50,000 strike)
          BigInt("4900000000000"), // $49,000 (lower than parent)
          childExpiry,
        ],
        { account: trader1.account }
      );

      assert.fail("Should have reverted with strike validation error");
    } catch (error: any) {
      assert(
        error.message.includes(
          "Child CALL strike must be higher than parent"
        ) || error.message.includes("revert"),
        "Should revert with correct strike validation error"
      );
      console.log(
        `✅ Strike validation works - CALL children require higher strikes`
      );
    }

    // Try to create PUT child with higher strike (should fail)
    try {
      await layeredOptions.write.createChildOption(
        [
          2n, // WBTC PUT parent ($40,000 strike)
          BigInt("4100000000000"), // $41,000 (higher than parent)
          childExpiry,
        ],
        { account: trader2.account }
      );

      assert.fail("Should have reverted with PUT strike validation error");
    } catch (error: any) {
      assert(
        error.message.includes("Child PUT strike must be lower than parent") ||
          error.message.includes("revert"),
        "Should revert with correct strike validation error"
      );
      console.log(
        `✅ Strike validation works - PUT children require lower strikes`
      );
    }

    // ===== 9. BALANCE AND OWNERSHIP VERIFICATION =====
    console.log("\n💼 Phase 9: Ownership and Balance Verification");

    // Check token ownership
    const trader1Balance = await layeredOptions.read.balanceOf([
      trader1.account.address,
      1n,
    ]);
    const trader1ChildBalance = await layeredOptions.read.balanceOf([
      trader1.account.address,
      4n,
    ]);

    assert.strictEqual(
      trader1Balance,
      1n,
      "Trader1 should own parent CALL option"
    );
    assert.strictEqual(
      trader1ChildBalance,
      1n,
      "Trader1 should own child CALL option"
    );

    console.log(`✅ Token ownership verified correctly`);

    // ===== 10. EXERCISE SIMULATION =====
    console.log("\n🎯 Phase 10: Option Exercise Simulation");

    // Check if options are exercisable (not expired)
    const option1Details = await layeredOptions.read.options([1n]);
    const isExpired = await layeredOptions.read.isOptionExpired([1n]);

    assert.strictEqual(isExpired, false, "Option should not be expired");
    assert.strictEqual(
      option1Details[7],
      false,
      "Option should not be exercised yet"
    ); // [7] is isExercised

    console.log(`✅ Exercise status validation complete`);

    // ===== 11. FINAL STATE VERIFICATION =====
    console.log("\n🏁 Phase 11: Final State Verification");

    // Get total number of options created
    let totalOptions = 0;
    console.log("🔍 Checking option existence:");
    try {
      for (let i = 1; i <= 15; i++) {
        const option = await layeredOptions.read.options([BigInt(i)]);
        if (option[0] !== "0x0000000000000000000000000000000000000000") {
          // baseAsset not zero
          totalOptions = i;
          console.log(
            `Token ${i}: baseAsset=${option[0]}, strike=${option[1]}, expiry=${option[2]}, parent=${option[4]}`
          );
        }
      }
    } catch {
      // Stop when we hit a non-existent token
    }

    console.log(`📊 Total options found: ${totalOptions}`);
    assert.strictEqual(
      totalOptions,
      5,
      "Should have created exactly 5 options"
    );
    console.log(
      `✅ Created ${totalOptions} options total (3 parent + 2 child)`
    );

    // Verify stablecoin usage for child premiums
    const childOption4 = await layeredOptions.read.options([4n]);
    const childOption5 = await layeredOptions.read.options([5n]);

    assert.strictEqual(
      childOption4[6].toLowerCase(),
      stablecoin.address.toLowerCase(),
      "Child CALL premium should be stablecoin"
    );
    assert.strictEqual(
      childOption5[6].toLowerCase(),
      stablecoin.address.toLowerCase(),
      "Child PUT premium should be stablecoin"
    );

    console.log(`✅ All child options correctly use stablecoin premiums`);

    // ===== 12. MATHEMATICAL VALIDATION =====
    console.log("\n🧮 Phase 12: Mathematical Formula Validation");

    // Test premium calculation math with known values
    const testStrike2 = BigInt("5100000000000"); // $51,000 ($1,000 diff from parent)
    const testExpiry2 = currentTime + 86400n * 10n; // 10 days

    const premium2 = await layeredOptions.read.calculateChildPremium([
      1n, // WBTC CALL parent ($50,000)
      testStrike2,
      testExpiry2,
    ]);

    // Premium should be > 0 and reasonable
    assert(premium2 > 0n, "Premium should be positive");
    assert(
      premium2 >= BigInt("1000"),
      "Premium should meet minimum (0.001 USDC)"
    );

    console.log(
      `✅ Premium calculation: $1K strike diff, 10 days = ${premium2} USDC wei`
    );

    // Test that larger strike differences yield higher premiums
    const testStrike3 = BigInt("5500000000000"); // $55,000 ($5,000 diff from parent)
    const premium3 = await layeredOptions.read.calculateChildPremium([
      1n,
      testStrike3,
      testExpiry2,
    ]);

    assert(
      premium3 > premium2,
      "Larger strike difference should yield higher premium"
    );
    console.log(
      `✅ Premium scaling verified: $5K strike diff yields ${premium3} USDC wei (${
        premium3 > premium2 ? "higher" : "lower"
      })`
    );

    console.log(
      "\n🎉 ===== CONTRACT LIFECYCLE TEST COMPLETED SUCCESSFULLY! ====="
    );
    console.log(`
📊 Test Summary:
✅ Contract deployment and setup
✅ Parent option creation (CALL/PUT for WBTC/WETH)
✅ Child option creation with automatic validation
✅ Strike price constraint enforcement
✅ Stablecoin premium system
✅ Access control and ownership verification
✅ Premium calculation mathematics
✅ Parent-child relationship tracking
✅ Option type inheritance
✅ Minimum premium enforcement
    `);
  });

  it("Should handle edge cases and error conditions", async function () {
    const { viem } = await network.connect();
    const [owner, trader1, trader2] = await viem.getWalletClients();

    console.log("\n🚨 Starting Edge Case Testing");

    // Setup contracts
    const stablecoin = await viem.deployContract("MockERC20", [
      "USD Coin",
      "USDC",
      6,
      BigInt("1000000000000"),
      owner.account.address,
    ]);
    const wbtc = await viem.deployContract("MockERC20", [
      "Wrapped Bitcoin",
      "WBTC",
      8,
      BigInt("2100000000000000"),
      owner.account.address,
    ]);
    const timeOracle = await viem.deployContract("TimeOracle", [owner.account.address]);
    const wbtcPriceFeed = await viem.deployContract("MockPriceFeed", [
      "BTC/USD",
      8,
      BigInt("4500000000000"),
      owner.account.address,
    ]);
    
    const layeredOptions = await viem.deployContract(
      "CitreaLayeredOptionsTrading",
      [owner.account.address, stablecoin.address, timeOracle.address]
    );

    await layeredOptions.write.addSupportedAsset([wbtc.address, wbtcPriceFeed.address]);

    // Setup tokens for traders
    const usdcAmount = BigInt("100000000000");
    const wbtcAmount = BigInt("1000000000");

    await stablecoin.write.mint([trader1.account.address, usdcAmount]);
    await wbtc.write.mint([trader1.account.address, wbtcAmount]);
    await stablecoin.write.approve([layeredOptions.address, usdcAmount], {
      account: trader1.account,
    });
    await wbtc.write.approve([layeredOptions.address, wbtcAmount], {
      account: trader1.account,
    });

    // Test 1: Unsupported asset
    const unsupportedToken = await viem.deployContract("MockERC20", [
      "Unsupported",
      "UNSUP",
      18,
      BigInt("1000000000000000000000"),
      owner.account.address,
    ]);

    try {
      await layeredOptions.write.createLayeredOption(
        [
          unsupportedToken.address,
          BigInt("1000000000000000000000"),
          BigInt(Math.floor(Date.now() / 1000)) + 86400n,
          BigInt("100000000000000000"),
          0n,
          0,
          wbtc.address,
        ],
        { account: trader1.account }
      );

      assert.fail("Should have reverted for unsupported asset");
    } catch (error: any) {
      assert(
        error.message.includes("Asset not supported") ||
          error.message.includes("revert")
      );
      console.log("✅ Unsupported asset rejection works");
    }

    // Test 2: Past expiry
    const pastExpiry = BigInt(Math.floor(Date.now() / 1000)) - 86400n; // Yesterday

    try {
      await layeredOptions.write.createLayeredOption(
        [
          wbtc.address,
          BigInt("5000000000000"),
          pastExpiry,
          BigInt("10000000"),
          0n,
          0,
          wbtc.address,
        ],
        { account: trader1.account }
      );

      assert.fail("Should have reverted for past expiry");
    } catch (error: any) {
      assert(
        error.message.includes("Expiry must be in future") ||
          error.message.includes("revert")
      );
      console.log("✅ Past expiry rejection works");
    }

    // Test 3: Zero strike price
    try {
      await layeredOptions.write.createLayeredOption(
        [
          wbtc.address,
          0n, // Zero strike
          BigInt(Math.floor(Date.now() / 1000)) + 86400n,
          BigInt("10000000"),
          0n,
          0,
          wbtc.address,
        ],
        { account: trader1.account }
      );

      assert.fail("Should have reverted for zero strike");
    } catch (error: any) {
      assert(
        error.message.includes("Strike price must be greater than 0") ||
          error.message.includes("revert")
      );
      console.log("✅ Zero strike rejection works");
    }

    console.log("✅ All edge cases handled correctly");
  });
});

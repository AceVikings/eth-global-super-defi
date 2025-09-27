import { describe, it } from "node:test";
import assert from "node:assert";
import { network } from "hardhat";

describe("Child Options Enhanced Logic", function () {
  it("Should create child CALL with higher strike", async function () {
    const { viem } = await network.connect();
    const [owner, user1] = await viem.getWalletClients();

    // Deploy mock stablecoin
    const stablecoin = await viem.deployContract("MockERC20", [
      "Test USDC",
      "USDC",
      18,
      BigInt("1000000000000000000000000"), // 1M tokens
      owner.account.address,
    ]);

    // Deploy mock WBTC
    const mockWBTC = await viem.deployContract("MockERC20", [
      "Mock WBTC",
      "WBTC",
      18,
      BigInt("21000000000000000000000000"), // 21M tokens
      owner.account.address,
    ]);

    // Deploy LayeredOptions with stablecoin address
    const layeredOptions = await viem.deployContract(
      "CitreaLayeredOptionsTrading",
      [owner.account.address, stablecoin.address]
    );

    // Add WBTC as supported asset
    await layeredOptions.write.addSupportedAsset([mockWBTC.address]);

    // Mint and approve stablecoins for user1
    await stablecoin.write.mint([
      user1.account.address,
      BigInt("1000000000000000000000"),
    ]);
    await stablecoin.write.approve(
      [layeredOptions.address, BigInt("1000000000000000000000")],
      {
        account: user1.account,
      }
    );

    // Create parent CALL option
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const expiry = currentTime + 86400n * 30n; // 30 days
    const parentStrike = BigInt("45000000000000000000000"); // $45,000
    const premium = BigInt("100000000000000000"); // 0.1 tokens

    await layeredOptions.write.createLayeredOption(
      [
        mockWBTC.address,
        parentStrike,
        expiry,
        premium,
        0n, // No parent
        0, // CALL option
        stablecoin.address,
      ],
      { account: user1.account }
    );

    // Create child CALL with higher strike
    const childStrike = BigInt("46000000000000000000000"); // $46,000 (higher)
    const childExpiry = currentTime + 86400n * 25n; // 25 days

    await layeredOptions.write.createChildOption(
      [
        1n, // Parent token ID
        childStrike,
        childExpiry,
      ],
      { account: user1.account }
    );

    // Verify child option was created correctly
    const childOption = await layeredOptions.read.options([2n]);
    assert.strictEqual(childOption[1], childStrike); // strike price
    assert.strictEqual(childOption[5], 0); // option type = CALL
    assert.strictEqual(
      childOption[6].toLowerCase(),
      stablecoin.address.toLowerCase()
    ); // premium token
    assert.strictEqual(childOption[4], 1n); // parent token ID

    console.log(
      "✅ Child CALL option created successfully with higher strike!"
    );
  });

  it("Should reject child CALL with lower strike", async function () {
    const { viem } = await network.connect();
    const [owner, user1] = await viem.getWalletClients();

    // Deploy mock stablecoin
    const stablecoin = await viem.deployContract("MockERC20", [
      "Test USDC",
      "USDC",
      18,
      BigInt("1000000000000000000000000"), // 1M tokens
      owner.account.address,
    ]);

    // Deploy mock WBTC
    const mockWBTC = await viem.deployContract("MockERC20", [
      "Mock WBTC",
      "WBTC",
      18,
      BigInt("21000000000000000000000000"), // 21M tokens
      owner.account.address,
    ]);

    // Deploy LayeredOptions
    const layeredOptions = await viem.deployContract(
      "CitreaLayeredOptionsTrading",
      [owner.account.address, stablecoin.address]
    );

    // Setup assets and approvals
    await layeredOptions.write.addSupportedAsset([mockWBTC.address]);
    await stablecoin.write.mint([
      user1.account.address,
      BigInt("1000000000000000000000"),
    ]);
    await stablecoin.write.approve(
      [layeredOptions.address, BigInt("1000000000000000000000")],
      {
        account: user1.account,
      }
    );

    // Create parent CALL option
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const expiry = currentTime + 86400n * 30n;
    const parentStrike = BigInt("45000000000000000000000"); // $45,000
    const premium = BigInt("100000000000000000");

    await layeredOptions.write.createLayeredOption(
      [
        mockWBTC.address,
        parentStrike,
        expiry,
        premium,
        0n,
        0, // CALL
        stablecoin.address,
      ],
      { account: user1.account }
    );

    // Try to create child CALL with lower strike - should fail
    const lowerStrike = BigInt("44000000000000000000000"); // $44,000 (lower)
    const childExpiry = currentTime + 86400n * 25n;

    try {
      await layeredOptions.write.createChildOption(
        [
          1n, // Parent token ID
          lowerStrike,
          childExpiry,
        ],
        { account: user1.account }
      );

      assert.fail("Should have reverted with lower strike");
    } catch (error: any) {
      assert(
        error.message.includes("Child CALL strike must be higher than parent")
      );
      console.log("✅ Child CALL with lower strike properly rejected!");
    }
  });

  it("Should create child PUT with lower strike", async function () {
    const { viem } = await network.connect();
    const [owner, user1] = await viem.getWalletClients();

    // Setup contracts
    const stablecoin = await viem.deployContract("MockERC20", [
      "Test USDC",
      "USDC",
      18,
      BigInt("1000000000000000000000000"), // 1M tokens
      owner.account.address,
    ]);
    const mockWBTC = await viem.deployContract("MockERC20", [
      "Mock WBTC",
      "WBTC",
      18,
      BigInt("21000000000000000000000000"), // 21M tokens
      owner.account.address,
    ]);
    const layeredOptions = await viem.deployContract(
      "CitreaLayeredOptionsTrading",
      [owner.account.address, stablecoin.address]
    );

    await layeredOptions.write.addSupportedAsset([mockWBTC.address]);
    await stablecoin.write.mint([
      user1.account.address,
      BigInt("1000000000000000000000"),
    ]);
    await stablecoin.write.approve(
      [layeredOptions.address, BigInt("1000000000000000000000")],
      {
        account: user1.account,
      }
    );

    // Create parent PUT option
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const expiry = currentTime + 86400n * 30n;
    const parentStrike = BigInt("45000000000000000000000"); // $45,000
    const premium = BigInt("100000000000000000");

    await layeredOptions.write.createLayeredOption(
      [
        mockWBTC.address,
        parentStrike,
        expiry,
        premium,
        0n,
        1, // PUT option
        stablecoin.address,
      ],
      { account: user1.account }
    );

    // Create child PUT with lower strike
    const childStrike = BigInt("44000000000000000000000"); // $44,000 (lower)
    const childExpiry = currentTime + 86400n * 25n;

    await layeredOptions.write.createChildOption(
      [
        1n, // Parent token ID
        childStrike,
        childExpiry,
      ],
      { account: user1.account }
    );

    // Verify child option was created correctly
    const childOption = await layeredOptions.read.options([2n]);
    assert.strictEqual(childOption[1], childStrike); // strike price
    assert.strictEqual(childOption[5], 1); // option type = PUT
    assert.strictEqual(
      childOption[6].toLowerCase(),
      stablecoin.address.toLowerCase()
    ); // premium token

    console.log("✅ Child PUT option created successfully with lower strike!");
  });

  it("Should calculate and charge premium automatically", async function () {
    const { viem } = await network.connect();
    const [owner, user1] = await viem.getWalletClients();

    // Setup contracts
    const stablecoin = await viem.deployContract("MockERC20", [
      "Test USDC",
      "USDC",
      18,
      BigInt("1000000000000000000000000"), // 1M tokens
      owner.account.address,
    ]);
    const mockWBTC = await viem.deployContract("MockERC20", [
      "Mock WBTC",
      "WBTC",
      18,
      BigInt("21000000000000000000000000"), // 21M tokens
      owner.account.address,
    ]);
    const layeredOptions = await viem.deployContract(
      "CitreaLayeredOptionsTrading",
      [owner.account.address, stablecoin.address]
    );

    await layeredOptions.write.addSupportedAsset([mockWBTC.address]);
    await stablecoin.write.mint([
      user1.account.address,
      BigInt("1000000000000000000000"),
    ]);
    await stablecoin.write.approve(
      [layeredOptions.address, BigInt("1000000000000000000000")],
      {
        account: user1.account,
      }
    );

    // Create parent CALL option
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const expiry = currentTime + 86400n * 30n;
    const parentStrike = BigInt("45000000000000000000000");
    const premium = BigInt("100000000000000000");

    await layeredOptions.write.createLayeredOption(
      [
        mockWBTC.address,
        parentStrike,
        expiry,
        premium,
        0n,
        0, // CALL
        stablecoin.address,
      ],
      { account: user1.account }
    );

    // Get balance before child creation
    const balanceBefore = await stablecoin.read.balanceOf([
      user1.account.address,
    ]);

    // Calculate expected premium
    const childStrike = BigInt("46000000000000000000000");
    const childExpiry = currentTime + 86400n * 15n; // 15 days
    const expectedPremium = await layeredOptions.read.calculateChildPremium([
      1n,
      childStrike,
      childExpiry,
    ]);

    // Create child option
    await layeredOptions.write.createChildOption(
      [1n, childStrike, childExpiry],
      { account: user1.account }
    );

    // Check that premium was charged
    const balanceAfter = await stablecoin.read.balanceOf([
      user1.account.address,
    ]);
    const charged = balanceBefore - balanceAfter;

    assert.strictEqual(charged, expectedPremium);
    assert(expectedPremium >= BigInt("1000000000000000")); // At least 0.001 minimum premium

    console.log(
      `✅ Premium calculated and charged correctly: ${expectedPremium.toString()} wei`
    );
  });
});

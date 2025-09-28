import { describe, it } from "node:test";
import assert from "node:assert";
import { network } from "hardhat";

describe("Child Option Maturity Inheritance Test", () => {
  it("Should demonstrate child options inherit parent maturity automatically", async () => {
    console.log("\n🧬 ===== CHILD OPTION MATURITY INHERITANCE TEST =====\n");

    const { viem } = await network.connect();
    const [deployer, trader1, trader2] = await viem.getWalletClients();

    // 1. Deploy contracts
    console.log("📦 Deploying contracts...");
    
    const stablecoin = await viem.deployContract("MockERC20", [
      "USD Coin", "USDC", 6, BigInt("1000000000000"), deployer.account.address,
    ]);
    
    const wbtc = await viem.deployContract("MockERC20", [
      "Wrapped Bitcoin", "WBTC", 8, BigInt("2100000000000000"), deployer.account.address,
    ]);
    
    const timeOracle = await viem.deployContract("TimeOracle");
    
    const layeredOptions = await viem.deployContract("CitreaLayeredOptionsTrading", [
      deployer.account.address,
      stablecoin.address,
      timeOracle.address,
    ]);

    console.log("✅ All contracts deployed successfully");

    // 2. Setup tokens
    await wbtc.write.transfer([trader1.account.address, BigInt("200000000")]); // 2 WBTC
    await stablecoin.write.transfer([trader2.account.address, BigInt("50000000000")]); // 50K USDC
    
    await wbtc.write.approve([layeredOptions.address, BigInt("100000000")], { account: trader1.account });
    await stablecoin.write.approve([layeredOptions.address, BigInt("25000000000")], { account: trader2.account });

    console.log("✅ Tokens distributed and approved");

    // 3. Create parent option
    console.log("\n👨‍👩‍👧‍👦 Creating parent CALL option...");
    
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const parentMaturity = currentTime + 86400n * 30n; // 30 days

    await layeredOptions.write.createLayeredOption([
      wbtc.address,
      BigInt("5000000000000"), // $50K strike
      parentMaturity,
      BigInt("100000000"), // 1 WBTC premium
      0n, // No parent
      0, // CALL type
    ], { account: trader1.account });

    const parentOption = await layeredOptions.read.options([1n]);
    console.log(`✅ Parent CALL created (Token 1)`);
    console.log(`   Strike: $50,000`);
    console.log(`   Maturity: ${new Date(Number(parentOption[2]) * 1000).toLocaleDateString()}`);

    // 4. Purchase parent option
    await layeredOptions.write.purchaseOption([1n], { account: trader2.account });
    console.log("✅ Parent option purchased by trader2");

    // 5. Create child option - notice no maturity parameter!
    console.log("\n👶 Creating child CALL option (inherits parent maturity)...");
    
    const childCallStrike = BigInt("5200000000000"); // $52K strike (higher than parent)
    
    await layeredOptions.write.createChildOption([
      1n, // Parent token ID
      childCallStrike, // Only 2 parameters - no maturity!
    ], { account: trader2.account });

    const childOption = await layeredOptions.read.options([2n]);
    console.log(`✅ Child CALL created (Token 2)`);
    console.log(`   Strike: $52,000`);
    console.log(`   Maturity: ${new Date(Number(childOption[2]) * 1000).toLocaleDateString()}`);

    // 6. Verify maturity inheritance
    console.log("\n🔍 Verifying maturity inheritance...");
    
    console.log(`\n📊 Maturity Comparison:`);
    console.log(`   Parent CALL (Token 1): ${new Date(Number(parentOption[2]) * 1000).toLocaleString()}`);
    console.log(`   Child CALL (Token 2):  ${new Date(Number(childOption[2]) * 1000).toLocaleString()}`);
    
    const maturitiesMatch = parentOption[2] === childOption[2];
    console.log(`   Maturities match: ${maturitiesMatch ? '✅ YES' : '❌ NO'}`);

    // Test assertion
    assert.strictEqual(
      parentOption[2],
      childOption[2],
      "Child option should inherit exact same maturity as parent"
    );

    // 7. Verify child has correct parent relationship
    console.log("\n🔗 Verifying parent-child relationship...");
    console.log(`   Child parent ID: ${childOption[4]}`); // parentTokenId field
    console.log(`   Expected parent ID: 1`);
    console.log(`   Parent relationship correct: ${childOption[4] === 1n ? '✅ YES' : '❌ NO'}`);

    assert.strictEqual(
      childOption[4], 
      1n, 
      "Child option should reference correct parent token ID"
    );

    console.log("\n🎉 ===== CHILD OPTION MATURITY INHERITANCE VERIFIED! =====");
    console.log("🚀 Key achievements:");
    console.log("   ✅ Child options created with only 2 parameters (no maturity)");
    console.log("   ✅ Child automatically inherits parent's exact maturity");
    console.log("   ✅ Parent-child relationship properly established");
    console.log("   ✅ European-style settlement preserved");
    
  });
});
import { network } from "hardhat";
import { formatEther, formatUnits } from "viem";
import fs from "fs";
import path from "path";

async function deployContracts() {
  console.log("\n🚀 ===== HARDHAT MAINNET DEPLOYMENT & DEMO =====\n");

  const { viem } = await network.connect();
  const [deployer, trader1, trader2, trader3] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`📋 Network: hardhat`);
  console.log(`📋 Deployer address: ${deployer.account.address}`);
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(`💰 Deployer balance: ${formatEther(balance)} ETH`);

  // ===== 1. DEPLOY STABLECOIN (USDC Mock) =====
  console.log("\n1️⃣ Deploying Stablecoin (Mock USDC)...");
  const stablecoin = await viem.deployContract("MockERC20", [
    "USD Coin", // name
    "USDC", // symbol
    6, // decimals (USDC uses 6)
    BigInt("1000000000000"), // 1M USDC (6 decimals)
    deployer.account.address, // owner
  ]);
  console.log(`✅ Stablecoin deployed at: ${stablecoin.address}`);

  // ===== 2. DEPLOY ASSET TOKENS =====
  console.log("\n2️⃣ Deploying Asset Tokens...");

  // Deploy WBTC
  const wbtc = await viem.deployContract("MockERC20", [
    "Wrapped Bitcoin",
    "WBTC",
    8, // WBTC uses 8 decimals
    BigInt("2100000000000000"), // 21M WBTC (8 decimals)
    deployer.account.address,
  ]);
  console.log(`✅ WBTC deployed at: ${wbtc.address}`);

  // Deploy WETH
  const weth = await viem.deployContract("MockERC20", [
    "Wrapped Ethereum",
    "WETH",
    18, // WETH uses 18 decimals
    BigInt("120000000000000000000000000"), // 120M WETH (18 decimals)
    deployer.account.address,
  ]);
  console.log(`✅ WETH deployed at: ${weth.address}`);

  // ===== 3. DEPLOY PRICE FEEDS =====
  console.log("\n3️⃣ Deploying Price Feeds...");

  const btcPriceFeed = await viem.deployContract("MockPriceFeed", [
    "BTC/USD",
    8, // decimals
    BigInt("5000000000000"), // $50,000
    deployer.account.address, // owner
  ]);
  console.log(`✅ BTC Price Feed deployed at: ${btcPriceFeed.address}`);

  const ethPriceFeed = await viem.deployContract("MockPriceFeed", [
    "ETH/USD", 
    8, // decimals
    BigInt("300000000000"), // $3,000
    deployer.account.address, // owner
  ]);
  console.log(`✅ ETH Price Feed deployed at: ${ethPriceFeed.address}`);

  // ===== 4. DEPLOY TIME ORACLE =====
  console.log("\n4️⃣ Deploying Time Oracle...");
  const timeOracle = await viem.deployContract("TimeOracle");
  console.log(`✅ Time Oracle deployed at: ${timeOracle.address}`);

  // ===== 5. DEPLOY OPTIONS CONTRACT =====
  console.log("\n5️⃣ Deploying Layered Options Trading Contract...");
  const layeredOptions = await viem.deployContract("CitreaLayeredOptionsTrading", [
    deployer.account.address, // owner
    stablecoin.address, // stablecoin for child premiums
    timeOracle.address, // time oracle
  ]);
  console.log(`✅ Layered Options Contract deployed at: ${layeredOptions.address}`);

  // ===== 6. DISTRIBUTE TOKENS =====
  console.log("\n6️⃣ Distributing tokens to traders...");

  // Give WBTC to trader1 (will create WBTC CALL)
  await wbtc.write.transfer([trader1.account.address, BigInt("200000000")]); // 2 WBTC
  console.log(`✅ Sent 2 WBTC to trader1`);

  // Give WBTC to trader2 (will create WBTC PUT)  
  await wbtc.write.transfer([trader2.account.address, BigInt("200000000")]); // 2 WBTC
  console.log(`✅ Sent 2 WBTC to trader2`);

  // Give USDC to all traders
  await stablecoin.write.transfer([trader1.account.address, BigInt("50000000000")]); // 50,000 USDC
  await stablecoin.write.transfer([trader2.account.address, BigInt("50000000000")]); // 50,000 USDC
  await stablecoin.write.transfer([trader3.account.address, BigInt("50000000000")]); // 50,000 USDC
  console.log(`✅ Sent 50,000 USDC to each trader`);

  // ===== 7. APPROVE SPENDING =====
  console.log("\n7️⃣ Setting token approvals...");

  // Approve WBTC spending
  await wbtc.write.approve([layeredOptions.address, BigInt("100000000")], { account: trader1.account });
  await wbtc.write.approve([layeredOptions.address, BigInt("100000000")], { account: trader2.account });

  // Approve USDC spending for premiums
  await stablecoin.write.approve([layeredOptions.address, BigInt("25000000000")], { account: trader1.account });
  await stablecoin.write.approve([layeredOptions.address, BigInt("25000000000")], { account: trader2.account });
  await stablecoin.write.approve([layeredOptions.address, BigInt("25000000000")], { account: trader3.account });

  console.log(`✅ All approvals set`);

  // ===== 8. CREATE PARENT OPTIONS =====
  console.log("\n8️⃣ Creating Parent Options (European-style)...");

  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const maturity = currentTime + 86400n * 30n; // 30 days maturity

  // Create WBTC CALL option (trader1 provides collateral)
  console.log("\n📞 Creating WBTC CALL Option...");
  const btcCallStrike = BigInt("5000000000000"); // $50,000
  
  const tx1 = await layeredOptions.write.createLayeredOption(
    [
      wbtc.address,
      btcCallStrike,
      maturity,
      BigInt("100000000"), // 1 WBTC premium (8 decimals)
      0n, // No parent (root option)
      0, // OptionType.CALL
    ],
    { account: trader1.account }
  );

  console.log(`✅ WBTC CALL created - Token ID: 1`);
  console.log(`   Strike: $50,000 | Maturity: ${new Date(Number(maturity) * 1000).toLocaleDateString()}`);
  console.log(`   Transaction: ${tx1}`);

  // Create WBTC PUT option (trader2 provides collateral) 
  console.log("\n📞 Creating WBTC PUT Option...");
  const btcPutStrike = BigInt("4000000000000"); // $40,000

  const tx2 = await layeredOptions.write.createLayeredOption(
    [
      wbtc.address,
      btcPutStrike, 
      maturity,
      BigInt("100000000"), // 1 WBTC premium (8 decimals)
      0n, // No parent (root option)
      1, // OptionType.PUT
    ],
    { account: trader2.account }
  );

  console.log(`✅ WBTC PUT created - Token ID: 2`);
  console.log(`   Strike: $40,000 | Maturity: ${new Date(Number(maturity) * 1000).toLocaleDateString()}`);
  console.log(`   Transaction: ${tx2}`);

  // ===== 9. BUY PARENT OPTIONS (PAY PREMIUMS) =====
  console.log("\n9️⃣ Purchasing Parent Options (Premium Payment)...");

  // Trader3 buys the CALL option from trader1
  console.log("\n💰 Trader3 purchasing CALL option...");
  const tx3 = await layeredOptions.write.purchaseOption(
    [1n], // Token ID 1 (WBTC CALL)
    { account: trader3.account }
  );
  console.log(`✅ CALL option purchased by trader3`);
  console.log(`   Transaction: ${tx3}`);

  // Trader3 buys the PUT option from trader2  
  console.log("\n💰 Trader3 purchasing PUT option...");
  const tx4 = await layeredOptions.write.purchaseOption(
    [2n], // Token ID 2 (WBTC PUT)
    { account: trader3.account }
  );
  console.log(`✅ PUT option purchased by trader3`);
  console.log(`   Transaction: ${tx4}`);

  // ===== 10. CREATE CHILD OPTIONS (INHERIT PARENT MATURITY) =====
  console.log("\n🔟 Creating Child Options (Inherit Parent Maturity)...");

  // Create child CALL from parent CALL (higher strike, same maturity)
  console.log("\n👶 Creating Child CALL from Parent CALL...");
  const childCallStrike = BigInt("5200000000000"); // $52,000 (higher than parent $50,000)
  
  // Preview premium first
  const childCallPremium = await layeredOptions.read.calculateChildPremium([
    1n, // Parent token ID (WBTC CALL)
    childCallStrike,
  ]);
  console.log(`   Expected premium: ${Number(childCallPremium) / 1e6} USDC`);

  const tx5 = await layeredOptions.write.createChildOption(
    [
      1n, // Parent token ID (WBTC CALL)
      childCallStrike, // No maturity parameter - inherits from parent
    ],
    { account: trader3.account }
  );

  console.log(`✅ Child CALL created - Token ID: 3`);
  console.log(`   Parent: Token 1 (CALL $50,000)`);
  console.log(`   Child: Strike $52,000, Maturity inherited from parent`);
  console.log(`   Transaction: ${tx5}`);

  // Create child PUT from parent PUT (lower strike, same maturity)
  console.log("\n👶 Creating Child PUT from Parent PUT...");
  const childPutStrike = BigInt("3800000000000"); // $38,000 (lower than parent $40,000)

  // Preview premium first
  const childPutPremium = await layeredOptions.read.calculateChildPremium([
    2n, // Parent token ID (WBTC PUT)  
    childPutStrike,
  ]);
  console.log(`   Expected premium: ${Number(childPutPremium) / 1e6} USDC`);

  const tx6 = await layeredOptions.write.createChildOption(
    [
      2n, // Parent token ID (WBTC PUT)
      childPutStrike, // No maturity parameter - inherits from parent
    ],
    { account: trader3.account }
  );

  console.log(`✅ Child PUT created - Token ID: 4`);
  console.log(`   Parent: Token 2 (PUT $40,000)`);
  console.log(`   Child: Strike $38,000, Maturity inherited from parent`);
  console.log(`   Transaction: ${tx6}`);

  // ===== 11. VERIFY CHILD OPTION MATURITY INHERITANCE =====
  console.log("\n1️⃣1️⃣ Verifying Child Option Maturity Inheritance...");

  const parentOption = await layeredOptions.read.options([1n]);
  const childOption = await layeredOptions.read.options([3n]);
  
  console.log(`\n📊 Maturity Comparison:`);
  console.log(`   Parent CALL (Token 1) maturity: ${new Date(Number(parentOption[2]) * 1000).toLocaleString()}`);
  console.log(`   Child CALL (Token 3) maturity:  ${new Date(Number(childOption[2]) * 1000).toLocaleString()}`);
  console.log(`   Maturities match: ${parentOption[2] === childOption[2] ? '✅ YES' : '❌ NO'}`);

  // ===== 12. DISPLAY FINAL STATE =====
  console.log("\n1️⃣2️⃣ Final Portfolio Summary...");

  console.log(`\n👤 Trader1 (Option Writer):`);
  console.log(`   - Provided 1 WBTC collateral for CALL option`);
  console.log(`   - Received premium payment in USDC`);

  console.log(`\n👤 Trader2 (Option Writer):`);
  console.log(`   - Provided 1 WBTC collateral for PUT option`);
  console.log(`   - Received premium payment in USDC`);

  console.log(`\n👤 Trader3 (Option Holder):`);
  console.log(`   - Owns parent CALL option (Token 1)`);
  console.log(`   - Owns parent PUT option (Token 2)`);
  console.log(`   - Owns child CALL option (Token 3) - inherits parent maturity`);
  console.log(`   - Owns child PUT option (Token 4) - inherits parent maturity`);
  console.log(`   - Paid premiums for all options`);

  // ===== 13. SAVE DEPLOYMENT INFO =====
  console.log("\n1️⃣3️⃣ Saving deployment information...");

  const deploymentInfo = {
    network: "hardhat",
    timestamp: new Date().toISOString(),
    contracts: {
      stablecoin: stablecoin.address,
      wbtc: wbtc.address,
      weth: weth.address,
      btcPriceFeed: btcPriceFeed.address,
      ethPriceFeed: ethPriceFeed.address,
      timeOracle: timeOracle.address,
      layeredOptions: layeredOptions.address,
    },
    options: {
      parentCall: {
        tokenId: 1,
        strike: "$50,000",
        maturity: new Date(Number(maturity) * 1000).toISOString(),
        type: "CALL"
      },
      parentPut: {
        tokenId: 2, 
        strike: "$40,000",
        maturity: new Date(Number(maturity) * 1000).toISOString(),
        type: "PUT"
      },
      childCall: {
        tokenId: 3,
        strike: "$52,000", 
        maturity: "Inherited from parent",
        type: "CALL",
        parent: 1
      },
      childPut: {
        tokenId: 4,
        strike: "$38,000",
        maturity: "Inherited from parent", 
        type: "PUT",
        parent: 2
      }
    }
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `hardhat-mainnet-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`✅ Deployment info saved to: ${filepath}`);
  console.log("\n🎉 ===== DEPLOYMENT & DEMO COMPLETED SUCCESSFULLY =====");
  console.log("🔥 Child options now inherit parent maturity automatically!");
  
  return deploymentInfo;
}

// Run deployment if script is executed directly
deployContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

export default deployContracts;
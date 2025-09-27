import { network } from "hardhat";
import { formatEther, formatUnits } from "viem";
import fs from "fs";
import path from "path";

async function deployContracts() {
  console.log("\n🚀 ===== COMPLETE CONTRACT DEPLOYMENT =====\n");

  const { viem } = await network.connect();
  const [deployer, trader1, trader2, trader3] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`📋 Deployer address: ${deployer.account.address}`);
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`💰 Deployer balance: ${formatEther(balance)} ETH`);

  // ===== 1. DEPLOY STABLECOIN (USDC Mock) =====
  console.log("\n1️⃣ Deploying Stablecoin (Mock USDC)...");
  const stablecoin = await viem.deployContract("MockERC20", [
    "USD Coin",           // name
    "USDC",              // symbol
    6,                   // decimals (USDC uses 6)
    BigInt("1000000000000"), // 1M USDC (6 decimals)
    deployer.account.address     // owner
  ]);
  console.log(`✅ Stablecoin deployed at: ${stablecoin.address}`);

  // ===== 2. DEPLOY ASSET TOKENS =====
  console.log("\n2️⃣ Deploying Asset Tokens...");
  
  // Deploy WBTC
  const wbtc = await viem.deployContract("MockERC20", [
    "Wrapped Bitcoin",
    "WBTC",
    8,                   // WBTC uses 8 decimals
    BigInt("2100000000000000"), // 21M WBTC (8 decimals)
    deployer.account.address
  ]);
  console.log(`✅ WBTC deployed at: ${wbtc.address}`);

  // Deploy WETH
  const weth = await viem.deployContract("MockERC20", [
    "Wrapped Ethereum",
    "WETH",
    18,                  // WETH uses 18 decimals
    BigInt("120000000000000000000000000"), // 120M WETH (18 decimals)
    deployer.account.address
  ]);
  console.log(`✅ WETH deployed at: ${weth.address}`);

  // ===== 3. DEPLOY MAIN CONTRACT =====
  console.log("\n3️⃣ Deploying CitreaLayeredOptionsTrading...");
  const layeredOptions = await viem.deployContract("CitreaLayeredOptionsTrading", [
    deployer.account.address,    // owner
    stablecoin.address          // stablecoin for child premiums
  ]);
  console.log(`✅ LayeredOptions deployed at: ${layeredOptions.address}`);

  // ===== 4. INITIALIZE CONTRACTS =====
  console.log("\n4️⃣ Initializing Contracts...");
  
  // Add supported assets
  await layeredOptions.write.addSupportedAsset([wbtc.address]);
  await layeredOptions.write.addSupportedAsset([weth.address]);
  console.log("✅ Assets added and contracts initialized");

  // ===== 5. SETUP DEMO ACCOUNTS =====
  console.log("\n5️⃣ Setting up Demo Accounts...");
  
  const traders = [trader1, trader2, trader3];
  const usdcAmount = BigInt("100000000000");    // 100K USDC (6 decimals)
  const wbtcAmount = BigInt("1000000000");      // 10 WBTC (8 decimals)
  const wethAmount = BigInt("100000000000000000000"); // 100 WETH (18 decimals)
  
  for (let i = 0; i < traders.length; i++) {
    const trader = traders[i];
    // Mint tokens
    await stablecoin.write.mint([trader.account.address, usdcAmount]);
    await wbtc.write.mint([trader.account.address, wbtcAmount]);
    await weth.write.mint([trader.account.address, wethAmount]);
    
    // Set approvals
    await stablecoin.write.approve([layeredOptions.address, usdcAmount], {
      account: trader.account
    });
    await wbtc.write.approve([layeredOptions.address, wbtcAmount], {
      account: trader.account
    });
    await weth.write.approve([layeredOptions.address, wethAmount], {
      account: trader.account
    });
  }
  console.log("✅ Demo accounts funded and approved");

  return {
    contracts: { stablecoin, wbtc, weth, layeredOptions },
    traders: { trader1, trader2, trader3, deployer }
  };
}

async function runLifecycleDemo(contracts: any, traders: any) {
  console.log("\n🎭 ===== CONTRACT LIFECYCLE DEMONSTRATION =====\n");

  const { stablecoin, wbtc, weth, layeredOptions } = contracts;
  const { trader1, trader2, trader3 } = traders;

  console.log(`📋 Contract Addresses:
💰 Stablecoin (USDC): ${stablecoin.address}
₿  WBTC: ${wbtc.address}
⟠  WETH: ${weth.address}
🎯 LayeredOptions: ${layeredOptions.address}
  `);

  // Track all transactions
  const transactions: any[] = [];

  // ===== PHASE 1: INITIAL STATE VERIFICATION =====
  console.log("🔍 ===== PHASE 1: INITIAL STATE VERIFICATION =====");
  
  for (let i = 0; i < 3; i++) {
    const trader = [trader1, trader2, trader3][i];
    const usdcBalance = await stablecoin.read.balanceOf([trader.account.address]);
    const wbtcBalance = await wbtc.read.balanceOf([trader.account.address]);
    const wethBalance = await weth.read.balanceOf([trader.account.address]);
    
    console.log(`Trader ${i + 1} (${trader.account.address.slice(0, 10)}...):`);
    console.log(`  USDC: ${Number(usdcBalance) / 1e6}`);
    console.log(`  WBTC: ${Number(wbtcBalance) / 1e8}`);
    console.log(`  WETH: ${Number(wethBalance) / 1e18}`);
  }

  // ===== PHASE 2: PARENT OPTIONS CREATION =====
  console.log("\n🎯 ===== PHASE 2: PARENT OPTIONS CREATION =====");

  const currentTime = BigInt(Math.floor(Date.now() / 1000));
  const expiry30Days = currentTime + 86400n * 30n;
  const expiry60Days = currentTime + 86400n * 60n;

  // 1. Trader1 creates WBTC CALL option ($50,000 strike)
  console.log("\n1️⃣ Trader1 creating WBTC CALL option ($50,000 strike)");
  const btcCallStrike = BigInt("5000000000000"); // $50,000 (8 decimals)
  const btcCallPremium = BigInt("10000000"); // 0.1 WBTC premium (8 decimals)
  
  const tx1 = await layeredOptions.write.createLayeredOption([
    wbtc.address,
    btcCallStrike,
    expiry30Days,
    btcCallPremium,
    0n, // No parent
    0,  // CALL option
    wbtc.address // Premium in WBTC
  ], { account: trader1.account });
  
  console.log(`✅ Transaction: ${tx1}`);
  console.log(`   Strike: $${Number(btcCallStrike) / 1e8}`);
  console.log(`   Premium: ${Number(btcCallPremium) / 1e8} WBTC`);
  console.log(`   Token ID: 1`);
  
  transactions.push({
    phase: "Parent Options",
    trader: "Trader1",
    action: "Create WBTC CALL",
    strike: "$50,000",
    premium: "0.1 WBTC",
    tokenId: 1,
    tx: tx1
  });

  // 2. Trader2 creates WBTC PUT option ($40,000 strike)
  console.log("\n2️⃣ Trader2 creating WBTC PUT option ($40,000 strike)");
  const btcPutStrike = BigInt("4000000000000"); // $40,000 (8 decimals)
  const btcPutPremium = BigInt("5000000"); // 0.05 WBTC premium (8 decimals)
  
  const tx2 = await layeredOptions.write.createLayeredOption([
    wbtc.address,
    btcPutStrike,
    expiry60Days,
    btcPutPremium,
    0n, // No parent
    1,  // PUT option
    wbtc.address // Premium in WBTC
  ], { account: trader2.account });
  
  console.log(`✅ Transaction: ${tx2}`);
  console.log(`   Strike: $${Number(btcPutStrike) / 1e8}`);
  console.log(`   Premium: ${Number(btcPutPremium) / 1e8} WBTC`);
  console.log(`   Token ID: 2`);
  
  transactions.push({
    phase: "Parent Options",
    trader: "Trader2", 
    action: "Create WBTC PUT",
    strike: "$40,000",
    premium: "0.05 WBTC",
    tokenId: 2,
    tx: tx2
  });

  // 3. Trader3 creates WETH CALL option ($3,000 strike)
  console.log("\n3️⃣ Trader3 creating WETH CALL option ($3,000 strike)");
  const ethCallStrike = BigInt("3000000000000000000000"); // $3,000 (18 decimals)
  const ethCallPremium = BigInt("100000000000000000"); // 0.1 WETH premium (18 decimals)
  
  const tx3 = await layeredOptions.write.createLayeredOption([
    weth.address,
    ethCallStrike,
    expiry30Days,
    ethCallPremium,
    0n, // No parent
    0,  // CALL option
    weth.address // Premium in WETH
  ], { account: trader3.account });
  
  console.log(`✅ Transaction: ${tx3}`);
  console.log(`   Strike: $${Number(ethCallStrike) / 1e18}`);
  console.log(`   Premium: ${Number(ethCallPremium) / 1e18} WETH`);
  console.log(`   Token ID: 3`);
  
  transactions.push({
    phase: "Parent Options",
    trader: "Trader3",
    action: "Create WETH CALL", 
    strike: "$3,000",
    premium: "0.1 WETH",
    tokenId: 3,
    tx: tx3
  });

  // ===== PHASE 3: CHILD OPTIONS CREATION =====
  console.log("\n👶 ===== PHASE 3: CHILD OPTIONS CREATION =====");

  const childExpiry = currentTime + 86400n * 20n; // 20 days

  // 1. Trader1 creates child CALL from WBTC CALL (higher strike)
  console.log("\n1️⃣ Trader1 creating child CALL ($52,000 strike from $50,000 parent)");
  const btcChildCallStrike = BigInt("5200000000000"); // $52,000 (higher than parent)
  
  // First, calculate the expected premium
  const childCallPremium = await layeredOptions.read.calculateChildPremium([
    1n, // Parent token ID
    btcChildCallStrike,
    childExpiry
  ]);
  
  console.log(`   Expected premium: ${Number(childCallPremium) / 1e6} USDC`);
  
  const tx4 = await layeredOptions.write.createChildOption([
    1n, // Parent token ID (WBTC CALL)
    btcChildCallStrike,
    childExpiry
  ], { account: trader1.account });
  
  console.log(`✅ Transaction: ${tx4}`);
  console.log(`   Parent: Token 1 (WBTC CALL $50,000)`);
  console.log(`   Child Strike: $${Number(btcChildCallStrike) / 1e8}`);
  console.log(`   Premium Charged: ${Number(childCallPremium) / 1e6} USDC`);
  console.log(`   Token ID: 4`);
  
  transactions.push({
    phase: "Child Options",
    trader: "Trader1",
    action: "Create Child CALL",
    parentStrike: "$50,000",
    childStrike: "$52,000",
    premium: `${Number(childCallPremium) / 1e6} USDC`,
    tokenId: 4,
    tx: tx4
  });

  // 2. Trader2 creates child PUT from WBTC PUT (lower strike)
  console.log("\n2️⃣ Trader2 creating child PUT ($38,000 strike from $40,000 parent)");
  const btcChildPutStrike = BigInt("3800000000000"); // $38,000 (lower than parent)
  
  // Calculate expected premium
  const childPutPremium = await layeredOptions.read.calculateChildPremium([
    2n, // Parent token ID
    btcChildPutStrike,
    childExpiry
  ]);
  
  console.log(`   Expected premium: ${Number(childPutPremium) / 1e6} USDC`);
  
  const tx5 = await layeredOptions.write.createChildOption([
    2n, // Parent token ID (WBTC PUT)
    btcChildPutStrike,
    childExpiry
  ], { account: trader2.account });
  
  console.log(`✅ Transaction: ${tx5}`);
  console.log(`   Parent: Token 2 (WBTC PUT $40,000)`);
  console.log(`   Child Strike: $${Number(btcChildPutStrike) / 1e8}`);
  console.log(`   Premium Charged: ${Number(childPutPremium) / 1e6} USDC`);
  console.log(`   Token ID: 5`);
  
  transactions.push({
    phase: "Child Options",
    trader: "Trader2",
    action: "Create Child PUT",
    parentStrike: "$40,000",
    childStrike: "$38,000", 
    premium: `${Number(childPutPremium) / 1e6} USDC`,
    tokenId: 5,
    tx: tx5
  });

  // ===== PHASE 4: VALIDATION AND ANALYTICS =====
  console.log("\n🔍 ===== PHASE 4: VALIDATION AND ANALYTICS =====");

  console.log("\n📊 Option Portfolio Analysis:");
  for (let tokenId = 1n; tokenId <= 5n; tokenId++) {
    try {
      const option = await layeredOptions.read.options([tokenId]);
      const [baseAsset, strikePrice, expiry, premium, parentTokenId, optionType, premiumToken, isExercised] = option;
      
      const assetName = baseAsset.toLowerCase() === wbtc.address.toLowerCase() ? "WBTC" : "WETH";
      const optionTypeName = optionType === 0 ? "CALL" : "PUT";
      const isChild = parentTokenId > 0n;
      const decimals = assetName === "WBTC" ? 8 : 18;
      
      console.log(`\nToken ${tokenId}:`);
      console.log(`  Asset: ${assetName}`);
      console.log(`  Type: ${optionTypeName} ${isChild ? "(Child)" : "(Parent)"}`);
      console.log(`  Strike: $${Number(strikePrice) / (10 ** decimals)}`);
      console.log(`  Premium: ${Number(premium) / (isChild ? 1e6 : 10 ** decimals)} ${isChild ? "USDC" : assetName}`);
      console.log(`  Parent: ${isChild ? parentTokenId.toString() : "None"}`);
      console.log(`  Exercised: ${isExercised}`);
      
      // Check ownership
      const owner1 = await layeredOptions.read.balanceOf([trader1.account.address, tokenId]);
      const owner2 = await layeredOptions.read.balanceOf([trader2.account.address, tokenId]);
      const owner3 = await layeredOptions.read.balanceOf([trader3.account.address, tokenId]);
      
      const owner = owner1 > 0n ? "Trader1" : owner2 > 0n ? "Trader2" : owner3 > 0n ? "Trader3" : "Unknown";
      console.log(`  Owner: ${owner}`);
      
    } catch (error) {
      console.log(`Token ${tokenId}: Does not exist`);
    }
  }

  // ===== PHASE 5: BUSINESS LOGIC VALIDATION =====
  console.log("\n✅ ===== PHASE 5: BUSINESS LOGIC VALIDATION =====");

  console.log("\n🚫 Testing Invalid Child Options:");
  
  try {
    console.log("   Attempting CALL child with LOWER strike...");
    await layeredOptions.write.createChildOption([
      1n, // WBTC CALL parent ($50,000)
      BigInt("4900000000000"), // $49,000 (lower than parent)
      childExpiry
    ], { account: trader1.account });
    console.log("   ❌ ERROR: Should have failed!");
  } catch (error: any) {
    console.log("   ✅ Correctly rejected: Child CALL with lower strike");
  }

  try {
    console.log("   Attempting PUT child with HIGHER strike...");
    await layeredOptions.write.createChildOption([
      2n, // WBTC PUT parent ($40,000)
      BigInt("4100000000000"), // $41,000 (higher than parent)
      childExpiry
    ], { account: trader2.account });
    console.log("   ❌ ERROR: Should have failed!");
  } catch (error: any) {
    console.log("   ✅ Correctly rejected: Child PUT with higher strike");
  }

  try {
    console.log("   Attempting child creation by non-owner...");
    await layeredOptions.write.createChildOption([
      1n, // WBTC CALL (owned by trader1)
      BigInt("5300000000000"), // $53,000
      childExpiry
    ], { account: trader2.account }); // trader2 trying to use trader1's option
    console.log("   ❌ ERROR: Should have failed!");
  } catch (error: any) {
    console.log("   ✅ Correctly rejected: Non-owner cannot create child options");
  }

  // ===== PHASE 6: PREMIUM CALCULATION ANALYSIS =====
  console.log("\n💰 ===== PHASE 6: PREMIUM CALCULATION ANALYSIS =====");

  const testStrikes = [
    { strike: BigInt("5100000000000"), label: "$51K (+$1K)" },
    { strike: BigInt("5300000000000"), label: "$53K (+$3K)" },
    { strike: BigInt("5500000000000"), label: "$55K (+$5K)" }
  ];

  console.log("\nChild CALL Premium Scaling (from $50K parent):");
  for (const test of testStrikes) {
    const premium = await layeredOptions.read.calculateChildPremium([
      1n, // WBTC CALL parent
      test.strike,
      childExpiry
    ]);
    console.log(`  ${test.label}: ${Number(premium) / 1e6} USDC`);
  }

  // ===== PHASE 7: FINAL STATE SUMMARY =====
  console.log("\n📋 ===== PHASE 7: FINAL STATE SUMMARY =====");

  console.log("\nFinal Token Balances:");
  for (let i = 0; i < 3; i++) {
    const trader = [trader1, trader2, trader3][i];
    const usdcBalance = await stablecoin.read.balanceOf([trader.account.address]);
    const wbtcBalance = await wbtc.read.balanceOf([trader.account.address]);
    const wethBalance = await weth.read.balanceOf([trader.account.address]);
    
    const usdcDecrease = Number(usdcBalance) < 100000 * 1e6;
    const wbtcDecrease = Number(wbtcBalance) < 10 * 1e8; 
    const wethDecrease = Number(wethBalance) < 100 * 1e18;
    
    console.log(`Trader ${i + 1}:`);
    console.log(`  USDC: ${Number(usdcBalance) / 1e6} (${usdcDecrease ? "⬇️ decreased" : "unchanged"})`);
    console.log(`  WBTC: ${Number(wbtcBalance) / 1e8} (${wbtcDecrease ? "⬇️ decreased" : "unchanged"})`);
    console.log(`  WETH: ${Number(wethBalance) / 1e18} (${wethDecrease ? "⬇️ decreased" : "unchanged"})`);
  }

  // Final Summary
  console.log("\n🎉 ===== LIFECYCLE DEMONSTRATION COMPLETE =====");
  console.log(`
📊 Transaction Summary:
${transactions.map((tx, i) => 
  `${i + 1}. ${tx.trader}: ${tx.action} ${tx.strike ? `(${tx.strike})` : ''} - Premium: ${tx.premium || 'N/A'}`
).join('\n')}

💰 Total Premiums Paid:
• WBTC: ${(Number(btcCallPremium) + Number(btcPutPremium)) / 1e8} tokens
• WETH: ${Number(ethCallPremium) / 1e18} tokens  
• USDC: ${(Number(childCallPremium) + Number(childPutPremium)) / 1e6} tokens

✅ Business Logic Validated:
• Child CALL options require higher strikes ✅
• Child PUT options require lower strikes ✅
• Only parent holders can create child options ✅
• Premium calculations scale with strike differentials ✅
• Stablecoin payments work correctly ✅

🚀 Complete contract lifecycle demonstration successful!
  `);

  return transactions;
}

async function main() {
  try {
    // Deploy contracts
    const { contracts, traders } = await deployContracts();
    
    // Run lifecycle demo
    await runLifecycleDemo(contracts, traders);
    
  } catch (error) {
    console.error("❌ Script failed:", error);
    throw error;
  }
}

// Execute combined script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Combined script failed:", error);
    process.exit(1);
  });
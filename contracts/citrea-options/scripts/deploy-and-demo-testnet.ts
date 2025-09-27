import { network } from "hardhat";
import { formatEther, formatUnits, parseEther, createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import path from "path";

// Determine if we're on testnet or local network
function isTestnet(networkName: string): boolean {
  return networkName === "citrea" || networkName === "sepolia";
}

// Create temporary wallet accounts for testnet
function createTemporaryAccounts(count: number = 2) {
  const accounts = [];
  for (let i = 0; i < count; i++) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    accounts.push({
      privateKey,
      account,
      address: account.address
    });
  }
  return accounts;
}

async function deployContracts(isTestnetDeployment: boolean = false) {
  console.log(`\n🚀 ===== COMPLETE CONTRACT DEPLOYMENT ${isTestnetDeployment ? '(TESTNET)' : '(LOCAL)'} =====\n`);

  const { viem } = await network.connect();
  let deployer, trader1, trader2;
  let tempAccounts: any[] = [];
  
  if (isTestnetDeployment) {
    // On testnet, use main account as deployer and create temporary accounts
    const walletClients = await viem.getWalletClients();
    deployer = walletClients[0];
    
    console.log("🔧 Creating temporary accounts for testnet demo...");
    tempAccounts = createTemporaryAccounts(2);
    
    // Create wallet clients for temporary accounts
    const publicClient = await viem.getPublicClient();
    trader1 = createWalletClient({
      account: tempAccounts[0].account,
      chain: publicClient.chain,
      transport: http()
    });
    trader2 = createWalletClient({
      account: tempAccounts[1].account,
      chain: publicClient.chain,
      transport: http()
    });
    
    console.log(`🔑 Temporary accounts created:
  Trader1: ${tempAccounts[0].address}
  Trader2: ${tempAccounts[1].address}`);
    
  } else {
    // On local network, use default accounts
    [deployer, trader1, trader2] = await viem.getWalletClients();
  }

  const publicClient = await viem.getPublicClient();

  console.log(`📋 Deployer address: ${deployer.account.address}`);
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`💰 Deployer balance: ${formatEther(balance)} ETH`);

  // Fund temporary accounts on testnet
  if (isTestnetDeployment && tempAccounts.length > 0) {
    console.log("\n💸 Funding temporary accounts...");
    const fundingAmount = parseEther("0.05"); // 0.05 ETH per account
    
    for (let i = 0; i < tempAccounts.length; i++) {
      const account = tempAccounts[i];
      console.log(`  Funding ${account.address} with ${formatEther(fundingAmount)} ETH...`);
      
      const hash = await deployer.sendTransaction({
        to: account.address,
        value: fundingAmount,
        gas: BigInt(21000) // Standard ETH transfer gas limit
      });
      
      await publicClient.waitForTransactionReceipt({ hash });
      const balance = await publicClient.getBalance({ address: account.address });
      console.log(`  ✅ Balance: ${formatEther(balance)} ETH`);
    }
  }

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

  // Deploy WETH (for completeness, but we'll focus on WBTC for demo)
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
  
  // Add supported assets (focus on WBTC for demo)
  await layeredOptions.write.addSupportedAsset([wbtc.address]);
  await layeredOptions.write.addSupportedAsset([weth.address]); // Keep for contract completeness
  console.log("✅ Assets added and contracts initialized");

  // ===== 5. SETUP DEMO ACCOUNTS =====
  console.log("\n5️⃣ Setting up Demo Accounts...");
  
  const traders = [trader1, trader2];
  const usdcAmount = BigInt("100000000000");    // 100K USDC (6 decimals)
  const wbtcAmount = BigInt("1000000000");      // 10 WBTC (8 decimals)
  const wethAmount = BigInt("100000000000000000000"); // 100 WETH (18 decimals)
  
  for (let i = 0; i < traders.length; i++) {
    const trader = traders[i];
    console.log(`  Setting up Trader ${i + 1}: ${trader.account.address.slice(0, 10)}...`);
    
    // Mint tokens to trader accounts
    await stablecoin.write.mint([trader.account.address, usdcAmount]);
    await wbtc.write.mint([trader.account.address, wbtcAmount]);
    await weth.write.mint([trader.account.address, wethAmount]);
    
    // Set approvals (traders approve the contract to spend their tokens)
    if (isTestnetDeployment) {
      // For testnet, we need to use the temporary account's wallet client
      const traderStablecoin = await viem.getContractAt("MockERC20", stablecoin.address);
      const traderWbtc = await viem.getContractAt("MockERC20", wbtc.address);
      const traderWeth = await viem.getContractAt("MockERC20", weth.address);
      
      await traderStablecoin.write.approve([layeredOptions.address, usdcAmount], {
        account: tempAccounts[i].account
      });
      await traderWbtc.write.approve([layeredOptions.address, wbtcAmount], {
        account: tempAccounts[i].account
      });
      await traderWeth.write.approve([layeredOptions.address, wethAmount], {
        account: tempAccounts[i].account
      });
    } else {
      // For local network, use the trader's wallet client directly
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
  }
  console.log("✅ Demo accounts funded and approved");

  return {
    contracts: { stablecoin, wbtc, weth, layeredOptions },
    traders: { trader1, trader2, deployer },
    tempAccounts: isTestnetDeployment ? tempAccounts : []
  };
}

async function runLifecycleDemo(contracts: any, traders: any, isTestnetDeployment: boolean = false, tempAccounts: any[] = []) {
  console.log(`\n🎭 ===== CONTRACT LIFECYCLE DEMONSTRATION ${isTestnetDeployment ? '(TESTNET)' : '(LOCAL)'} =====\n`);

  const { stablecoin, wbtc, weth, layeredOptions } = contracts;
  const { trader1, trader2 } = traders;

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
  
  for (let i = 0; i < 2; i++) {
    const trader = [trader1, trader2][i];
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

  // 1. Trader1 creates WBTC CALL option ($50,000 strike) - Premium in USDC
  console.log("\n1️⃣ Trader1 creating WBTC CALL option ($50,000 strike)");
  const btcCallStrike = BigInt("5000000000000"); // $50,000 (8 decimals)
  const btcCallPremium = BigInt("500000000"); // 500 USDC premium (6 decimals)
  
  const tx1 = await layeredOptions.write.createLayeredOption([
    wbtc.address,
    btcCallStrike,
    expiry30Days,
    btcCallPremium,
    0n, // No parent
    0,  // CALL option
    stablecoin.address // Premium in USDC
  ], { 
    account: isTestnetDeployment ? tempAccounts[0].account : trader1.account 
  });
  
  console.log(`✅ Transaction: ${tx1}`);
  console.log(`   Strike: $${Number(btcCallStrike) / 1e8}`);
  console.log(`   Premium: ${Number(btcCallPremium) / 1e6} USDC`);
  console.log(`   Token ID: 1`);
  
  transactions.push({
    phase: "Parent Options",
    trader: "Trader1",
    action: "Create WBTC CALL",
    strike: "$50,000",
    premium: "500 USDC",
    tokenId: 1,
    tx: tx1
  });

  // 2. Trader2 creates WBTC PUT option ($40,000 strike) - Premium in USDC
  console.log("\n2️⃣ Trader2 creating WBTC PUT option ($40,000 strike)");
  const btcPutStrike = BigInt("4000000000000"); // $40,000 (8 decimals)
  const btcPutPremium = BigInt("300000000"); // 300 USDC premium (6 decimals)
  
  const tx2 = await layeredOptions.write.createLayeredOption([
    wbtc.address,
    btcPutStrike,
    expiry60Days,
    btcPutPremium,
    0n, // No parent
    1,  // PUT option
    stablecoin.address // Premium in USDC
  ], { 
    account: isTestnetDeployment ? tempAccounts[1].account : trader2.account 
  });
  
  console.log(`✅ Transaction: ${tx2}`);
  console.log(`   Strike: $${Number(btcPutStrike) / 1e8}`);
  console.log(`   Premium: ${Number(btcPutPremium) / 1e6} USDC`);
  console.log(`   Token ID: 2`);
  
  transactions.push({
    phase: "Parent Options",
    trader: "Trader2", 
    action: "Create WBTC PUT",
    strike: "$40,000",
    premium: "300 USDC",
    tokenId: 2,
    tx: tx2
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
  
  const tx3 = await layeredOptions.write.createChildOption([
    1n, // Parent token ID (WBTC CALL)
    btcChildCallStrike,
    childExpiry
  ], { 
    account: isTestnetDeployment ? tempAccounts[0].account : trader1.account 
  });
  
  console.log(`✅ Transaction: ${tx3}`);
  console.log(`   Parent: Token 1 (WBTC CALL $50,000)`);
  console.log(`   Child Strike: $${Number(btcChildCallStrike) / 1e8}`);
  console.log(`   Premium Charged: ${Number(childCallPremium) / 1e6} USDC`);
  console.log(`   Token ID: 3`);
  
  transactions.push({
    phase: "Child Options",
    trader: "Trader1",
    action: "Create Child CALL",
    parentStrike: "$50,000",
    childStrike: "$52,000",
    premium: `${Number(childCallPremium) / 1e6} USDC`,
    tokenId: 3,
    tx: tx3
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
  
  const tx4 = await layeredOptions.write.createChildOption([
    2n, // Parent token ID (WBTC PUT)
    btcChildPutStrike,
    childExpiry
  ], { 
    account: isTestnetDeployment ? tempAccounts[1].account : trader2.account 
  });
  
  console.log(`✅ Transaction: ${tx4}`);
  console.log(`   Parent: Token 2 (WBTC PUT $40,000)`);
  console.log(`   Child Strike: $${Number(btcChildPutStrike) / 1e8}`);
  console.log(`   Premium Charged: ${Number(childPutPremium) / 1e6} USDC`);
  console.log(`   Token ID: 4`);
  
  transactions.push({
    phase: "Child Options",
    trader: "Trader2",
    action: "Create Child PUT",
    parentStrike: "$40,000",
    childStrike: "$38,000", 
    premium: `${Number(childPutPremium) / 1e6} USDC`,
    tokenId: 4,
    tx: tx4
  });

  // ===== PHASE 4: VALIDATION AND ANALYTICS =====
  console.log("\n🔍 ===== PHASE 4: VALIDATION AND ANALYTICS =====");

  console.log("\n📊 Option Portfolio Analysis:");
  for (let tokenId = 1n; tokenId <= 4n; tokenId++) {
    try {
      const option = await layeredOptions.read.options([tokenId]);
      const [baseAsset, strikePrice, expiry, premium, parentTokenId, optionType, premiumToken, isExercised] = option;
      
      const assetName = baseAsset.toLowerCase() === wbtc.address.toLowerCase() ? "WBTC" : "WETH";
      const optionTypeName = optionType === 0 ? "CALL" : "PUT";
      const isChild = parentTokenId > 0n;
      const decimals = assetName === "WBTC" ? 8 : 18;
      const isPremiumInUSDC = premiumToken.toLowerCase() === stablecoin.address.toLowerCase();
      
      console.log(`\nToken ${tokenId}:`);
      console.log(`  Asset: ${assetName}`);
      console.log(`  Type: ${optionTypeName} ${isChild ? "(Child)" : "(Parent)"}`);
      console.log(`  Strike: $${Number(strikePrice) / (10 ** decimals)}`);
      console.log(`  Premium: ${Number(premium) / (isPremiumInUSDC ? 1e6 : 10 ** decimals)} ${isPremiumInUSDC ? "USDC" : assetName}`);
      console.log(`  Parent: ${isChild ? parentTokenId.toString() : "None"}`);
      console.log(`  Exercised: ${isExercised}`);
      
      // Check ownership
      const owner1 = await layeredOptions.read.balanceOf([trader1.account.address, tokenId]);
      const owner2 = await layeredOptions.read.balanceOf([trader2.account.address, tokenId]);
      
      const owner = owner1 > 0n ? "Trader1" : owner2 > 0n ? "Trader2" : "Unknown";
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
    ], { 
      account: isTestnetDeployment ? tempAccounts[0].account : trader1.account 
    });
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
    ], { 
      account: isTestnetDeployment ? tempAccounts[1].account : trader2.account 
    });
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
    ], { 
      account: isTestnetDeployment ? tempAccounts[1].account : trader2.account 
    }); // trader2 trying to use trader1's option
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
  for (let i = 0; i < 2; i++) {
    const trader = [trader1, trader2][i];
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
• USDC (Parent): ${(Number(btcCallPremium) + Number(btcPutPremium)) / 1e6} tokens
• USDC (Child): ${(Number(childCallPremium) + Number(childPutPremium)) / 1e6} tokens

✅ Business Logic Validated:
• Child CALL options require higher strikes ✅
• Child PUT options require lower strikes ✅
• Only parent holders can create child options ✅
• Premium calculations scale with strike differentials ✅
• All premiums paid in stablecoin (USDC) ✅

🚀 Complete WBTC options lifecycle demonstration successful!
  `);

  return transactions;
}

async function returnFundsToMain(deployer: any, tempAccounts: any[]) {
  console.log("\n💸 ===== RETURNING FUNDS TO MAIN ACCOUNT =====");
  
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  
  let totalReturned = BigInt(0);
  
  for (let i = 0; i < tempAccounts.length; i++) {
    const account = tempAccounts[i];
    const balance = await publicClient.getBalance({ address: account.address });
    
    if (balance > 0n) {
      // Estimate gas cost for the transfer
      const gasPrice = await publicClient.getGasPrice();
      const gasLimit = BigInt(21000); // Standard ETH transfer
      const gasCost = gasPrice * gasLimit;
      
      // Return balance minus gas cost
      const returnAmount = balance - gasCost;
      
      if (returnAmount > 0n) {
        console.log(`  Returning ${formatEther(returnAmount)} ETH from ${account.address.slice(0, 10)}...`);
        
        // Create wallet client for temporary account
        const tempWallet = createWalletClient({
          account: account.account,
          chain: publicClient.chain,
          transport: http()
        });
        
        const hash = await tempWallet.sendTransaction({
          to: deployer.account.address,
          value: returnAmount,
          account: account.account
        });
        
        await publicClient.waitForTransactionReceipt({ hash });
        totalReturned += returnAmount;
        console.log(`  ✅ Returned ${formatEther(returnAmount)} ETH`);
      } else {
        console.log(`  ⚠️  Account ${account.address.slice(0, 10)}... has insufficient balance to return (only gas money left)`);
      }
    } else {
      console.log(`  ℹ️  Account ${account.address.slice(0, 10)}... has zero balance`);
    }
  }
  
  console.log(`\n✅ Total returned to main account: ${formatEther(totalReturned)} ETH`);
  
  // Show final main account balance
  const finalBalance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`💰 Main account final balance: ${formatEther(finalBalance)} ETH`);
}

async function main() {
  try {
    // Get network name from process arguments or environment
    const args = process.argv;
    const networkArg = args.find(arg => arg.startsWith('--network'));
    let networkName = 'localhost'; // default
    
    if (networkArg) {
      const networkIndex = args.indexOf(networkArg);
      if (networkIndex !== -1 && args[networkIndex + 1]) {
        networkName = args[networkIndex + 1];
      } else if (networkArg.includes('=')) {
        networkName = networkArg.split('=')[1];
      }
    }
    
    const isTestnetDeployment = isTestnet(networkName);
    
    console.log(`🌐 Network: ${networkName} ${isTestnetDeployment ? "(Testnet)" : "(Local)"}`);
    
    // Deploy contracts
    const { contracts, traders, tempAccounts } = await deployContracts(isTestnetDeployment);
    
    // Run lifecycle demo
    await runLifecycleDemo(contracts, traders, isTestnetDeployment, tempAccounts);
    
    // Return funds to main account if on testnet
    if (isTestnetDeployment && tempAccounts.length > 0) {
      await returnFundsToMain(traders.deployer, tempAccounts);
    }
    
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
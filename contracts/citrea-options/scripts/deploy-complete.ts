import { network } from "hardhat";
import { formatEther } from "viem";
import fs from "fs";
import path from "path";

async function main() {
  console.log("\n🚀 ===== COMPLETE CONTRACT DEPLOYMENT =====\n");

  const { viem } = await network.connect();
  const [deployer, trader1, trader2, trader3] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`📋 Deployer address: ${deployer.account.address}`);
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`💰 Deployer balance: ${formatEther(balance)} ETH`);

  // Track all deployed contracts
  const deployedContracts: { [key: string]: { address: string } } = {};

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
  
  deployedContracts.Stablecoin = { address: stablecoin.address };

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
  
  deployedContracts.WBTC = { address: wbtc.address };

  // Deploy WETH
  const weth = await viem.deployContract("MockERC20", [
    "Wrapped Ethereum",
    "WETH",
    18,                  // WETH uses 18 decimals
    BigInt("120000000000000000000000000"), // 120M WETH (18 decimals)
    deployer.account.address
  ]);
  console.log(`✅ WETH deployed at: ${weth.address}`);
  
  deployedContracts.WETH = { address: weth.address };

  // ===== 3. DEPLOY MAIN CONTRACT =====
  console.log("\n3️⃣ Deploying CitreaLayeredOptionsTrading...");
  const layeredOptions = await viem.deployContract("CitreaLayeredOptionsTrading", [
    deployer.account.address,    // owner
    stablecoin.address          // stablecoin for child premiums
  ]);
  console.log(`✅ LayeredOptions deployed at: ${layeredOptions.address}`);
  
  deployedContracts.LayeredOptions = { address: layeredOptions.address };

  // ===== 4. INITIALIZE CONTRACTS =====
  console.log("\n4️⃣ Initializing Contracts...");
  
  // Add supported assets
  console.log("   Adding WBTC as supported asset...");
  await layeredOptions.write.addSupportedAsset([wbtc.address]);
  console.log("   Adding WETH as supported asset...");
  await layeredOptions.write.addSupportedAsset([weth.address]);
  
  // Verify supported assets
  const isWBTCSupported = await layeredOptions.read.supportedAssets([wbtc.address]);
  const isWETHSupported = await layeredOptions.read.supportedAssets([weth.address]);
  console.log(`✅ WBTC supported: ${isWBTCSupported}`);
  console.log(`✅ WETH supported: ${isWETHSupported}`);

  // ===== 5. SETUP DEMO ACCOUNTS =====
  console.log("\n5️⃣ Setting up Demo Accounts...");
  
  const traders = [trader1, trader2, trader3];
  
  // Distribute tokens to traders
  const usdcAmount = BigInt("100000000000");    // 100K USDC (6 decimals)
  const wbtcAmount = BigInt("1000000000");      // 10 WBTC (8 decimals)
  const wethAmount = BigInt("100000000000000000000"); // 100 WETH (18 decimals)
  
  for (let i = 0; i < traders.length; i++) {
    const trader = traders[i];
    console.log(`   Setting up trader ${i + 1}: ${trader.account.address}`);
    
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
    
    // Verify balances
    const usdcBalance = await stablecoin.read.balanceOf([trader.account.address]);
    const wbtcBalance = await wbtc.read.balanceOf([trader.account.address]);
    const wethBalance = await weth.read.balanceOf([trader.account.address]);
    
    console.log(`     USDC: ${Number(usdcBalance) / 1e6}`);
    console.log(`     WBTC: ${Number(wbtcBalance) / 1e8}`);
    console.log(`     WETH: ${Number(wethBalance) / 1e18}`);
  }

  // ===== 6. SAVE DEPLOYMENT INFO =====
  console.log("\n6️⃣ Saving Deployment Information...");
  
  const networkInfo = await publicClient.getChainId();
  
  const deploymentInfo = {
    network: {
      chainId: networkInfo,
      name: networkInfo === 5115 ? "citrea-testnet" : `chain-${networkInfo}`
    },
    deployer: deployer.account.address,
    timestamp: new Date().toISOString(),
    contracts: deployedContracts,
    traders: {
      trader1: trader1.account.address,
      trader2: trader2.account.address,
      trader3: trader3.account.address
    },
    configuration: {
      stablecoin: {
        name: "USD Coin",
        symbol: "USDC",
        decimals: 6,
        initialSupply: "1000000"
      },
      assets: {
        WBTC: {
          name: "Wrapped Bitcoin",
          symbol: "WBTC", 
          decimals: 8,
          initialSupply: "21000000"
        },
        WETH: {
          name: "Wrapped Ethereum",
          symbol: "WETH",
          decimals: 18,
          initialSupply: "120000000"
        }
      },
      traderAllocations: {
        USDC: "100000",
        WBTC: "10",
        WETH: "100"
      }
    }
  };

  // Save to file
  const deploymentPath = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const networkName = deploymentInfo.network.name;
  const filename = `deployment-${networkName}-${Date.now()}.json`;
  const filepath = path.join(deploymentPath, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✅ Deployment info saved to: ${filepath}`);

  // Also save a latest.json for easy access
  const latestPath = path.join(deploymentPath, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✅ Latest deployment saved to: ${latestPath}`);

  // ===== 7. DEPLOYMENT SUMMARY =====
  console.log("\n🎉 ===== DEPLOYMENT COMPLETE =====");
  console.log(`
📊 Deployment Summary:
🏢 Network: ${deploymentInfo.network.name} (Chain ID: ${deploymentInfo.network.chainId})
💳 Deployer: ${deployer.account.address}
⏰ Timestamp: ${deploymentInfo.timestamp}

📋 Contract Addresses:
💰 Stablecoin (USDC): ${stablecoin.address}
₿  WBTC: ${wbtc.address}
⟠  WETH: ${weth.address}
🎯 LayeredOptions: ${layeredOptions.address}

👥 Demo Accounts:
🧑‍💼 Trader 1: ${trader1.account.address}
🧑‍💼 Trader 2: ${trader2.account.address}  
🧑‍💼 Trader 3: ${trader3.account.address}

✅ All contracts deployed and initialized
✅ Demo accounts funded and approved
✅ Deployment info saved to ${filename}

🚀 Ready for lifecycle demonstration!
  `);

  return deploymentInfo;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
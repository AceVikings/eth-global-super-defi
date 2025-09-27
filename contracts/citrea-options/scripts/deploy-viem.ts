import {
  createWalletClient,
  createPublicClient,
  http,
  formatEther,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define Citrea chain configuration
const citreaTestnet = {
  id: 5115,
  name: "Citrea Testnet",
  network: "citrea",
  nativeCurrency: {
    decimals: 18,
    name: "cBTC",
    symbol: "cBTC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.citrea.xyz"],
    },
    public: {
      http: ["https://rpc.testnet.citrea.xyz"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.testnet.citrea.xyz" },
  },
};

// Helper function to wait
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("🚀 Starting Citrea Options Deployment with Viem...\n");

  // Load private key from environment
  const privateKey = process.env.CITREA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("CITREA_PRIVATE_KEY environment variable is required");
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  // Create clients
  const publicClient = createPublicClient({
    chain: citreaTestnet,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: citreaTestnet,
    transport: http(),
  });

  console.log("📋 Deployment Configuration:");
  console.log(`   Account: ${account.address}`);
  console.log(`   Chain: ${citreaTestnet.name} (${citreaTestnet.id})`);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`   Balance: ${formatEther(balance)} cBTC\n`);

  if (balance === 0n) {
    throw new Error(
      "Account has no balance. Please fund the account with cBTC."
    );
  }

  // Define contract artifacts (you'll need to compile these first)
  const contracts = {
    TimeOracle: {
      abi: [], // Will be loaded from artifacts
      bytecode: "0x", // Will be loaded from artifacts
    },
    MockERC20: {
      abi: [],
      bytecode: "0x",
    },
    WrappedNativeToken: {
      abi: [],
      bytecode: "0x",
    },
    MockPriceFeed: {
      abi: [],
      bytecode: "0x",
    },
    CitreaOptionsTrading: {
      abi: [],
      bytecode: "0x",
    },
    CitreaLayeredOptionsTrading: {
      abi: [],
      bytecode: "0x",
    },
  };

  // Load contract artifacts
  console.log("📦 Loading contract artifacts...");
  try {
    for (const [name] of Object.entries(contracts)) {
      let artifactPath = `./artifacts/contracts/${name}.sol/${name}.json`;

      // Special handling for layered options contract
      if (name === "CitreaLayeredOptionsTrading") {
        artifactPath = `./artifacts/contracts/CitreaLayeredOptionsTrading.sol/${name}.json`;
      }

      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        contracts[name as keyof typeof contracts].abi = artifact.abi;
        contracts[name as keyof typeof contracts].bytecode = artifact.bytecode;
        console.log(`   ✓ Loaded ${name}`);
      } else {
        console.log(`   ⚠️  Artifact not found: ${artifactPath}`);
      }
    }
  } catch (error) {
    console.error("Failed to load contract artifacts:", error);
    console.log("Please compile contracts first: npx hardhat compile");
    return;
  }

  console.log("\n🔨 Starting deployment sequence...\n");

  const deployedContracts: Record<string, string> = {};

  // 1. Deploy TimeOracle
  console.log("1️⃣  Deploying TimeOracle...");
  try {
    const timeOracleHash = await walletClient.deployContract({
      abi: contracts.TimeOracle.abi,
      bytecode: contracts.TimeOracle.bytecode as `0x${string}`,
      args: [account.address],
      //   gas: 600000n,
      gasPrice: 2000000000n, // 2 gwei
    });

    console.log(`   Transaction: ${timeOracleHash}`);
    console.log("   Waiting for confirmation...");

    const timeOracleReceipt = await publicClient.waitForTransactionReceipt({
      hash: timeOracleHash,
      timeout: 60000, // 60 seconds timeout
    });

    if (timeOracleReceipt.contractAddress) {
      deployedContracts.timeOracle = timeOracleReceipt.contractAddress;
      console.log(
        `   ✅ TimeOracle deployed: ${timeOracleReceipt.contractAddress}`
      );
    } else {
      throw new Error("Contract deployment failed - no contract address");
    }

    await sleep(10000); // Wait 10 seconds before next deployment
  } catch (error) {
    console.error("   ❌ TimeOracle deployment failed:", error);
    throw error;
  }

  // 2. Deploy StableCoin (Mock USDC)
  console.log("\n2️⃣  Deploying StableCoin (Mock USDC)...");
  try {
    const stableCoinHash = await walletClient.deployContract({
      abi: contracts.MockERC20.abi,
      bytecode: contracts.MockERC20.bytecode as `0x${string}`,
      args: ["Mock USDC", "mUSDC", 6, 1000000, account.address],
      // gas: 2000000n, // Increased from 600000n
      gasPrice: 3000000000n, // Increased from 2 gwei to 3 gwei
    });

    console.log(`   Transaction: ${stableCoinHash}`);
    console.log("   Waiting for confirmation...");

    const stableCoinReceipt = await publicClient.waitForTransactionReceipt({
      hash: stableCoinHash,
      timeout: 60000,
    });

    if (stableCoinReceipt.contractAddress) {
      deployedContracts.stableCoin = stableCoinReceipt.contractAddress;
      console.log(
        `   ✅ StableCoin deployed: ${stableCoinReceipt.contractAddress}`
      );
    } else {
      throw new Error("Contract deployment failed - no contract address");
    }

    await sleep(10000);
  } catch (error) {
    console.error("   ❌ StableCoin deployment failed:", error);
    throw error;
  }

  // 3. Deploy BitcoinToken (Mock BTC)
  console.log("\n3️⃣  Deploying BitcoinToken (Mock BTC)...");
  try {
    const bitcoinTokenHash = await walletClient.deployContract({
      abi: contracts.MockERC20.abi,
      bytecode: contracts.MockERC20.bytecode as `0x${string}`,
      args: ["Mock Bitcoin", "mBTC", 8, 21000000, account.address],
      // gas: 2000000n, // Increased from 600000n
      gasPrice: 3000000000n, // Increased from 2 gwei to 3 gwei
    });

    console.log(`   Transaction: ${bitcoinTokenHash}`);
    console.log("   Waiting for confirmation...");

    const bitcoinTokenReceipt = await publicClient.waitForTransactionReceipt({
      hash: bitcoinTokenHash,
      timeout: 60000,
    });

    if (bitcoinTokenReceipt.contractAddress) {
      deployedContracts.bitcoinToken = bitcoinTokenReceipt.contractAddress;
      console.log(
        `   ✅ BitcoinToken deployed: ${bitcoinTokenReceipt.contractAddress}`
      );
    } else {
      throw new Error("Contract deployment failed - no contract address");
    }

    await sleep(10000);
  } catch (error) {
    console.error("   ❌ BitcoinToken deployment failed:", error);
    throw error;
  }

  // 4. Deploy WrappedNativeToken
  console.log("\n4️⃣  Deploying WrappedNativeToken...");
  try {
    const wrappedNativeHash = await walletClient.deployContract({
      abi: contracts.WrappedNativeToken.abi,
      bytecode: contracts.WrappedNativeToken.bytecode as `0x${string}`,
      args: [],
      // gas: 1500000n, // Increased from 300000n
      gasPrice: 2000000000n, // Increased from 1 gwei to 2 gwei
    });

    console.log(`   Transaction: ${wrappedNativeHash}`);
    console.log("   Waiting for confirmation...");

    const wrappedNativeReceipt = await publicClient.waitForTransactionReceipt({
      hash: wrappedNativeHash,
      timeout: 60000,
    });

    if (wrappedNativeReceipt.contractAddress) {
      deployedContracts.wrappedNative = wrappedNativeReceipt.contractAddress;
      console.log(
        `   ✅ WrappedNativeToken deployed: ${wrappedNativeReceipt.contractAddress}`
      );
    } else {
      throw new Error("Contract deployment failed - no contract address");
    }

    await sleep(10000);
  } catch (error) {
    console.error("   ❌ WrappedNativeToken deployment failed:", error);
    throw error;
  }

  // 5. Deploy BTC Price Feed
  console.log("\n5️⃣  Deploying BTC Price Feed...");
  try {
    const btcPriceFeedHash = await walletClient.deployContract({
      abi: contracts.MockPriceFeed.abi,
      bytecode: contracts.MockPriceFeed.bytecode as `0x${string}`,
      args: ["BTC / USD", 8, 9700000000000n, account.address], // $97,000
      // gas: 300000n,
      gasPrice: 1000000000n, // 1 gwei
    });

    console.log(`   Transaction: ${btcPriceFeedHash}`);
    console.log("   Waiting for confirmation...");

    const btcPriceFeedReceipt = await publicClient.waitForTransactionReceipt({
      hash: btcPriceFeedHash,
      timeout: 60000,
    });

    if (btcPriceFeedReceipt.contractAddress) {
      deployedContracts.btcPriceFeed = btcPriceFeedReceipt.contractAddress;
      console.log(
        `   ✅ BTC Price Feed deployed: ${btcPriceFeedReceipt.contractAddress}`
      );
    } else {
      throw new Error("Contract deployment failed - no contract address");
    }

    await sleep(10000);
  } catch (error) {
    console.error("   ❌ BTC Price Feed deployment failed:", error);
    throw error;
  }

  // 6. Deploy ETH Price Feed
  console.log("\n6️⃣  Deploying ETH Price Feed...");
  try {
    const ethPriceFeedHash = await walletClient.deployContract({
      abi: contracts.MockPriceFeed.abi,
      bytecode: contracts.MockPriceFeed.bytecode as `0x${string}`,
      args: ["ETH / USD", 8, 350000000000n, account.address], // $3,500
      // gas: 300000n,
      gasPrice: 1000000000n, // 1 gwei
    });

    console.log(`   Transaction: ${ethPriceFeedHash}`);
    console.log("   Waiting for confirmation...");

    const ethPriceFeedReceipt = await publicClient.waitForTransactionReceipt({
      hash: ethPriceFeedHash,
      timeout: 60000,
    });

    if (ethPriceFeedReceipt.contractAddress) {
      deployedContracts.ethPriceFeed = ethPriceFeedReceipt.contractAddress;
      console.log(
        `   ✅ ETH Price Feed deployed: ${ethPriceFeedReceipt.contractAddress}`
      );
    } else {
      throw new Error("Contract deployment failed - no contract address");
    }

    await sleep(10000);
  } catch (error) {
    console.error("   ❌ ETH Price Feed deployment failed:", error);
    throw error;
  }

  // 7. Deploy CitreaOptionsTrading (Main Contract)
  console.log("\n7️⃣  Deploying CitreaOptionsTrading (Main Contract)...");
  try {
    const optionsTradingHash = await walletClient.deployContract({
      abi: contracts.CitreaOptionsTrading.abi,
      bytecode: contracts.CitreaOptionsTrading.bytecode as `0x${string}`,
      args: [account.address, deployedContracts.timeOracle],
      // gas: 800000n, // Higher gas for main contract but still reduced
      gasPrice: 1000000000n, // 1 gwei
    });

    console.log(`   Transaction: ${optionsTradingHash}`);
    console.log("   Waiting for confirmation...");

    const optionsTradingReceipt = await publicClient.waitForTransactionReceipt({
      hash: optionsTradingHash,
      timeout: 120000, // 2 minutes for main contract
    });

    if (optionsTradingReceipt.contractAddress) {
      deployedContracts.optionsTrading = optionsTradingReceipt.contractAddress;
      console.log(
        `   ✅ CitreaOptionsTrading deployed: ${optionsTradingReceipt.contractAddress}`
      );
    } else {
      throw new Error("Contract deployment failed - no contract address");
    }

    await sleep(15000); // Wait 15 seconds for main contract
  } catch (error) {
    console.error("   ❌ CitreaOptionsTrading deployment failed:", error);
    throw error;
  }

  // 8. Deploy CitreaLayeredOptionsTrading (Layered Contract)
  console.log(
    "\n8️⃣  Deploying CitreaLayeredOptionsTrading (Layered Contract)..."
  );
  try {
    const layeredOptionsTradingHash = await walletClient.deployContract({
      abi: contracts.CitreaLayeredOptionsTrading.abi,
      bytecode: contracts.CitreaLayeredOptionsTrading.bytecode as `0x${string}`,
      args: [account.address],
      gasPrice: 1000000000n, // 1 gwei
    });

    console.log(`   Transaction: ${layeredOptionsTradingHash}`);
    console.log("   Waiting for confirmation...");

    const layeredOptionsTradingReceipt =
      await publicClient.waitForTransactionReceipt({
        hash: layeredOptionsTradingHash,
        timeout: 120000, // 2 minutes for layered contract
      });

    if (layeredOptionsTradingReceipt.contractAddress) {
      deployedContracts.layeredOptionsTrading =
        layeredOptionsTradingReceipt.contractAddress;
      console.log(
        `   ✅ CitreaLayeredOptionsTrading deployed: ${layeredOptionsTradingReceipt.contractAddress}`
      );
    } else {
      throw new Error("Contract deployment failed - no contract address");
    }

    await sleep(15000); // Wait 15 seconds for layered contract
  } catch (error) {
    console.error(
      "   ❌ CitreaLayeredOptionsTrading deployment failed:",
      error
    );
    throw error;
  }

  // Save deployment addresses
  const deploymentData = {
    network: "citrea",
    chainId: citreaTestnet.id,
    rpcUrl: citreaTestnet.rpcUrls.default.http[0],
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    contracts: deployedContracts,
  };

  fs.writeFileSync(
    "./deployed-addresses.json",
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\n🎉 Deployment Complete!");
  console.log("📄 Addresses saved to deployed-addresses.json");
  console.log("\n📋 Deployed Contracts:");
  Object.entries(deployedContracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });

  console.log("\n⚙️  Performing initial setup...");

  try {
    // Setup for original CitreaOptionsTrading contract
    console.log("   Setting up CitreaOptionsTrading...");

    // Create a contract instance
    const optionsContract = {
      address: deployedContracts.optionsTrading as `0x${string}`,
      abi: contracts.CitreaOptionsTrading.abi,
    };

    // Add supported assets
    await walletClient.writeContract({
      ...optionsContract,
      functionName: "addSupportedAsset",
      args: [
        deployedContracts.bitcoinToken,
        deployedContracts.btcPriceFeed,
        2000n, // 20% volatility
        500n, // 5% risk-free rate
      ],
      gasPrice: 1000000000n,
    });

    await sleep(5000);

    // Add supported collateral
    await walletClient.writeContract({
      ...optionsContract,
      functionName: "addSupportedCollateral",
      args: [deployedContracts.stableCoin],
      gasPrice: 1000000000n,
    });

    console.log("   ✅ CitreaOptionsTrading setup complete");
    await sleep(5000);

    // Setup for CitreaLayeredOptionsTrading contract
    console.log("   Setting up CitreaLayeredOptionsTrading...");

    const layeredOptionsContract = {
      address: deployedContracts.layeredOptionsTrading as `0x${string}`,
      abi: contracts.CitreaLayeredOptionsTrading.abi,
    };

    // Add supported assets to layered contract
    await walletClient.writeContract({
      ...layeredOptionsContract,
      functionName: "addSupportedAsset",
      args: [deployedContracts.bitcoinToken],
      gasPrice: 1000000000n,
    });

    console.log("   ✅ CitreaLayeredOptionsTrading setup complete");
  } catch (error) {
    console.log("   ⚠️  Setup failed (contracts still deployed):", error);
  }

  console.log("\n✅ Ready for frontend integration!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

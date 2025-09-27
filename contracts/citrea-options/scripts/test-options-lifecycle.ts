import {
  createWalletClient,
  createPublicClient,
  http,
  formatUnits,
  parseUnits,
  getAddress,
  getContract,
  parseEther,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
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
} as const;

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load deployed addresses
const deployedAddresses = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../deployed-addresses.json"), "utf8")
);

// Contract ABIs (simplified for testing)
const ERC20_ABI = [
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const PRICE_FEED_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

const OPTIONS_ABI = [
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "priceFeed", type: "address" },
      { name: "volatility", type: "uint256" },
      { name: "riskFreeRate", type: "uint256" },
    ],
    name: "addSupportedAsset",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "collateral", type: "address" }],
    name: "addSupportedCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "optionType", type: "uint8" },
      { name: "strikePrice", type: "uint256" },
      { name: "underlyingAsset", type: "address" },
      { name: "contractSize", type: "uint256" },
    ],
    name: "calculateCollateralRequired",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "optionType", type: "uint8" },
      { name: "strikePrice", type: "uint256" },
      { name: "expiryTimestamp", type: "uint256" },
      { name: "underlyingAsset", type: "address" },
      { name: "collateralToken", type: "address" },
      { name: "contractSize", type: "uint256" },
    ],
    name: "createOption",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "optionId", type: "uint256" }],
    name: "purchaseOption",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "options",
    outputs: [
      { name: "id", type: "uint256" },
      { name: "writer", type: "address" },
      { name: "buyer", type: "address" },
      { name: "optionType", type: "uint8" },
      { name: "strikePrice", type: "uint256" },
      { name: "premium", type: "uint256" },
      { name: "collateralAmount", type: "uint256" },
      { name: "expiryTimestamp", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "underlyingAsset", type: "address" },
      { name: "collateralToken", type: "address" },
      { name: "contractSize", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface TestStep {
  step: number;
  action: string;
  status: "pending" | "success" | "failed";
  timestamp: string;
  txHash?: string;
  gasUsed?: string;
  data?: any;
  error?: string;
}

interface TestResults {
  testName: string;
  network: string;
  chainId: number;
  startTime: string;
  endTime?: string;
  totalSteps: number;
  completedSteps: number;
  success: boolean;
  tester: string;
  contracts: typeof deployedAddresses.contracts;
  steps: TestStep[];
  summary: {
    tokensMinted: { usdc: string; btc: string };
    optionCreated?: {
      optionId: string;
      strike: string;
      premium: string;
      collateral: string;
    };
    optionPurchased?: {
      optionId: string;
      buyer: string;
      premiumPaid: string;
    };
    finalBalances: {
      writer: { usdc: string; btc: string };
      buyer: { usdc: string; btc: string };
    };
  };
}

/**
 * Comprehensive Options Lifecycle Test Script
 * Tests: Mint tokens → Create option → Purchase option → Check balances
 */
async function testOptionsLifecycle(): Promise<void> {
  console.log("🚀 Starting Options Lifecycle Test\n");

  // Create accounts
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Please set PRIVATE_KEY in your .env file");
  }

  const deployerAccount = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  
  // Generate a throwaway private key for testing
  const throwawayPrivateKey = generatePrivateKey();
  const buyerAccount = privateKeyToAccount(throwawayPrivateKey);

  console.log(`🔑 Generated throwaway buyer account: ${buyerAccount.address}`);
  console.log(`💰 Funding buyer account with gas tokens...`);

  // Create clients for funding
  const publicClient = createPublicClient({
    chain: citreaTestnet,
    transport: http(),
  });

  const deployerWalletClient = createWalletClient({
    chain: citreaTestnet,
    transport: http(),
    account: deployerAccount,
  });

  // Fund the buyer account with gas tokens (0.1 cBTC)
  const fundingAmount = parseEther("0.1");
  const fundingTx = await deployerWalletClient.sendTransaction({
    to: buyerAccount.address,
    value: fundingAmount,
  });
  
  console.log(`📤 Funding transaction sent: ${fundingTx}`);
  await publicClient.waitForTransactionReceipt({ hash: fundingTx });
  
  const buyerBalance = await publicClient.getBalance({ address: buyerAccount.address });
  console.log(`✅ Buyer account funded with ${formatUnits(buyerBalance, 18)} cBTC\n`);

  const buyerWalletClient = createWalletClient({
    chain: citreaTestnet,
    transport: http(),
    account: buyerAccount,
  });

  // Create contract instances for writer (deployer)
  const stableCoin = getContract({
    address: getAddress(deployedAddresses.contracts.stableCoin),
    abi: ERC20_ABI,
    client: { public: publicClient, wallet: deployerWalletClient },
  });

  const bitcoinToken = getContract({
    address: getAddress(deployedAddresses.contracts.bitcoinToken),
    abi: ERC20_ABI,
    client: { public: publicClient, wallet: deployerWalletClient },
  });

  const optionsTrading = getContract({
    address: getAddress(deployedAddresses.contracts.optionsTrading),
    abi: OPTIONS_ABI,
    client: { public: publicClient, wallet: deployerWalletClient },
  });

  const btcPriceFeed = getContract({
    address: getAddress(deployedAddresses.contracts.btcPriceFeed),
    abi: PRICE_FEED_ABI,
    client: { public: publicClient, wallet: deployerWalletClient },
  });

  // Create contract instances for buyer
  const stableCoinBuyer = getContract({
    address: getAddress(deployedAddresses.contracts.stableCoin),
    abi: ERC20_ABI,
    client: { public: publicClient, wallet: buyerWalletClient },
  });

  const optionsTradingBuyer = getContract({
    address: getAddress(deployedAddresses.contracts.optionsTrading),
    abi: OPTIONS_ABI,
    client: { public: publicClient, wallet: buyerWalletClient },
  });
  
  const testResults: TestResults = {
    testName: "Options Lifecycle End-to-End Test",
    network: "Citrea Testnet",
    chainId: 5115,
    startTime: new Date().toISOString(),
    totalSteps: 10,
    completedSteps: 0,
    success: false,
    tester: deployerAccount.address,
    contracts: deployedAddresses.contracts,
    steps: [],
    summary: {
      tokensMinted: { usdc: "0", btc: "0" },
      finalBalances: {
        writer: { usdc: "0", btc: "0" },
        buyer: { usdc: "0", btc: "0" },
      },
    },
  };

  const logStep = (step: number, action: string, status: "pending" | "success" | "failed", data?: any, error?: string, txHash?: string, gasUsed?: string) => {
    const stepData: TestStep = {
      step,
      action,
      status,
      timestamp: new Date().toISOString(),
      data,
      error,
      txHash,
      gasUsed,
    };
    
    testResults.steps.push(stepData);
    
    const statusEmoji = status === "success" ? "✅" : status === "failed" ? "❌" : "⏳";
    console.log(`${statusEmoji} Step ${step}: ${action}`);
    if (data) console.log(`   Data:`, JSON.stringify(data, null, 2));
    if (error) console.log(`   Error:`, error);
    if (txHash) console.log(`   TX: ${txHash}`);
    if (gasUsed) console.log(`   Gas: ${gasUsed}`);
    console.log();
  };

  try {
    // Load contract instances
    logStep(1, "Contract instances loaded successfully", "success", {
      stableCoin: stableCoin.address,
      bitcoinToken: bitcoinToken.address,
      optionsTrading: optionsTrading.address,
      btcPriceFeed: btcPriceFeed.address,
    });
    testResults.completedSteps = 1;

    // Step 2: Mint tokens for writer and buyer
    logStep(2, "Minting test tokens for writer and buyer", "pending");
    
    const mintAmount = parseUnits("10000", 6); // 10,000 USDC (6 decimals)
    const btcMintAmount = parseUnits("10", 8);  // 10 BTC (8 decimals)
    
    // Mint USDC and BTC for writer (deployer)
    const tx1 = await stableCoin.write.mint([deployerAccount.address, mintAmount]);
    await publicClient.waitForTransactionReceipt({ hash: tx1 });
    
    const tx3 = await bitcoinToken.write.mint([deployerAccount.address, btcMintAmount]);
    await publicClient.waitForTransactionReceipt({ hash: tx3 });
    
    // Mint USDC for buyer (for premium payment)
    const tx2 = await stableCoin.write.mint([buyerAccount.address, mintAmount]);
    await publicClient.waitForTransactionReceipt({ hash: tx2 });
    
    testResults.summary.tokensMinted = {
      usdc: formatUnits(mintAmount, 6),
      btc: formatUnits(btcMintAmount, 8),
    };
    
    logStep(2, "Tokens minted successfully", "success", {
      writerAddress: deployerAccount.address,
      buyerAddress: buyerAccount.address,
      usdcMinted: testResults.summary.tokensMinted.usdc,
      btcMinted: testResults.summary.tokensMinted.btc,
    });
    testResults.completedSteps = 2;

    // Step 3: Check initial balances
    logStep(3, "Checking initial token balances", "pending");
    
    const writerUsdcBalance = await stableCoin.read.balanceOf([deployerAccount.address]);
    const writerBtcBalance = await bitcoinToken.read.balanceOf([deployerAccount.address]);
    const buyerUsdcBalance = await stableCoin.read.balanceOf([buyerAccount.address]);
    
    logStep(3, "Initial balances verified", "success", {
      writer: {
        usdc: formatUnits(writerUsdcBalance, 6),
        btc: formatUnits(writerBtcBalance, 8),
      },
      buyer: {
        usdc: formatUnits(buyerUsdcBalance, 6),
        btc: "0", // Buyer doesn't need BTC
      },
    });
    testResults.completedSteps = 3;

    // Step 4: Set up market parameters (add supported asset)
    logStep(4, "Setting up market parameters for BTC options", "pending");
    
    const tx5 = await optionsTrading.write.addSupportedAsset([
      bitcoinToken.address,    // asset
      btcPriceFeed.address,   // priceFeed
      BigInt(2000),           // 20% volatility
      BigInt(500)             // 5% risk-free rate
    ]);
    const receipt5 = await publicClient.waitForTransactionReceipt({ hash: tx5 });
    
    // Also add supported collateral
    const tx5b = await optionsTrading.write.addSupportedCollateral([
      stableCoin.address
    ]);
    const receipt5b = await publicClient.waitForTransactionReceipt({ hash: tx5b });
    
    logStep(4, "Market parameters set successfully", "success", {
      underlyingAsset: bitcoinToken.address,
      priceFeed: btcPriceFeed.address,
      collateral: stableCoin.address,
      volatility: "20%",
      riskFreeRate: "5%",
      txHash: tx5,
      gasUsed: receipt5.gasUsed.toString(),
    });
    testResults.completedSteps = 4;

    // Step 5: Get current BTC price
    logStep(5, "Getting current BTC price from oracle", "pending");
    
    const priceData = await btcPriceFeed.read.latestRoundData();
    const currentPrice = priceData[1]; // answer field from latestRoundData
    const priceFormatted = formatUnits(currentPrice, 8);
    
    logStep(5, "Current BTC price retrieved", "success", {
      price: priceFormatted,
      priceWei: currentPrice.toString(),
      roundId: priceData[0].toString(),
      timestamp: priceData[3].toString(),
    });
    testResults.completedSteps = 5;

    // Step 6: Calculate collateral requirement and approve
    logStep(6, "Calculating collateral requirement and approving tokens", "pending");
    
    const strikePrice = (currentPrice * BigInt(120)) / BigInt(100); // 20% above current
    const contractSize = parseUnits("1", 8); // 1 BTC
    
    const collateralRequired = await optionsTrading.read.calculateCollateralRequired([
      0, // CALL option
      strikePrice,
      bitcoinToken.address,
      contractSize
    ]);
    
    // Add 20% buffer to be safe
    const approveAmount = (collateralRequired * BigInt(120)) / BigInt(100);
    
    const tx6 = await stableCoin.write.approve([optionsTrading.address, approveAmount]);
    const receipt6 = await publicClient.waitForTransactionReceipt({ hash: tx6 });
    
    logStep(6, "Collateral calculated and approved successfully", "success", {
      collateralRequired: formatUnits(collateralRequired, 6),
      approvedAmount: formatUnits(approveAmount, 6),
      strikePrice: formatUnits(strikePrice, 8),
      contractSize: formatUnits(contractSize, 8),
      txHash: tx6,
      gasUsed: receipt6.gasUsed.toString(),
    });
    testResults.completedSteps = 6;

    // Step 7: Create option (Call option)
    logStep(7, "Creating BTC call option", "pending");
    
    const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + 86400); // 1 day from now
    
    const tx7 = await optionsTrading.write.createOption([
      0, // CALL option
      strikePrice,
      expiryTimestamp,
      bitcoinToken.address, // underlying asset
      stableCoin.address,   // collateral token
      contractSize
    ]);
    const receipt7 = await publicClient.waitForTransactionReceipt({ hash: tx7 });
    
    // Assume option ID is 1 for the first option
    const optionId = BigInt(1);
    
    const optionDetails = await optionsTrading.read.options([optionId]);
    
    testResults.summary.optionCreated = {
      optionId: optionId.toString(),
      strike: formatUnits(strikePrice, 8),
      premium: formatUnits(optionDetails[5], 6), // premium field
      collateral: formatUnits(optionDetails[6], 6), // collateralAmount field
    };
    
    logStep(7, "Option created successfully", "success", {
      optionId: optionId.toString(),
      type: "CALL",
      strike: testResults.summary.optionCreated.strike,
      premium: testResults.summary.optionCreated.premium,
      collateral: testResults.summary.optionCreated.collateral,
      expiryTimestamp: expiryTimestamp.toString(),
      txHash: tx7,
      gasUsed: receipt7.gasUsed.toString(),
    });
    testResults.completedSteps = 7;

    // Step 8: Buyer approves premium payment
    logStep(8, "Buyer approving premium payment", "pending");
    
    const premiumAmount = optionDetails[5]; // premium field
    const tx8 = await stableCoinBuyer.write.approve([optionsTrading.address, premiumAmount]);
    const receipt8 = await publicClient.waitForTransactionReceipt({ hash: tx8 });
    
    logStep(8, "Premium approved successfully", "success", {
      amount: formatUnits(premiumAmount, 6),
      buyer: buyerAccount.address,
      txHash: tx8,
      gasUsed: receipt8.gasUsed.toString(),
    });
    testResults.completedSteps = 8;

    // Step 9: Purchase option
    logStep(9, "Buyer purchasing the option", "pending");
    
    const tx9 = await optionsTradingBuyer.write.purchaseOption([optionId]);
    const receipt9 = await publicClient.waitForTransactionReceipt({ hash: tx9 });
    
    testResults.summary.optionPurchased = {
      optionId: optionId.toString(),
      buyer: buyerAccount.address,
      premiumPaid: formatUnits(premiumAmount, 6),
    };
    
    logStep(9, "Option purchased successfully", "success", {
      optionId: optionId.toString(),
      buyer: buyerAccount.address,
      premiumPaid: testResults.summary.optionPurchased.premiumPaid,
      txHash: tx9,
      gasUsed: receipt9.gasUsed.toString(),
    });
    testResults.completedSteps = 9;

    // Step 10: Check final balances
    logStep(10, "Checking final token balances", "pending");
    
    const finalWriterUsdcBalance = await stableCoin.read.balanceOf([deployerAccount.address]);
    const finalWriterBtcBalance = await bitcoinToken.read.balanceOf([deployerAccount.address]);
    const finalBuyerUsdcBalance = await stableCoin.read.balanceOf([buyerAccount.address]);
    
    testResults.summary.finalBalances = {
      writer: {
        usdc: formatUnits(finalWriterUsdcBalance, 6),
        btc: formatUnits(finalWriterBtcBalance, 8),
      },
      buyer: {
        usdc: formatUnits(finalBuyerUsdcBalance, 6),
        btc: "0",
      },
    };
    
    logStep(10, "Final balances checked", "success", {
      writer: testResults.summary.finalBalances.writer,
      buyer: testResults.summary.finalBalances.buyer,
      changes: {
        writerUsdcGain: (+testResults.summary.finalBalances.writer.usdc - +testResults.summary.tokensMinted.usdc).toString(),
        buyerUsdcLoss: (+testResults.summary.tokensMinted.usdc - +testResults.summary.finalBalances.buyer.usdc).toString(),
      },
    });
    testResults.completedSteps = 10;

    testResults.success = true;
    testResults.endTime = new Date().toISOString();

    console.log("🎉 Options Lifecycle Test Completed Successfully!\n");

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    logStep(testResults.completedSteps + 1, "Test execution failed", "failed", undefined, error.message);
    testResults.success = false;
    testResults.endTime = new Date().toISOString();
  }

  // Save results to JSON file
  const resultsPath = path.join(__dirname, "../test-results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));

  // Print summary
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(50));
  console.log(`Test Name: ${testResults.testName}`);
  console.log(`Network: ${testResults.network} (Chain ID: ${testResults.chainId})`);
  console.log(`Success: ${testResults.success ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Completed Steps: ${testResults.completedSteps}/${testResults.totalSteps}`);
  console.log(`Duration: ${testResults.startTime} - ${testResults.endTime || "Interrupted"}`);
  console.log(`Results saved to: ${resultsPath}`);

  if (testResults.success) {
    console.log("\n💰 FINANCIAL SUMMARY");
    console.log("-".repeat(30));
    console.log(`Tokens Minted: ${testResults.summary.tokensMinted.usdc} USDC, ${testResults.summary.tokensMinted.btc} BTC per account`);
    if (testResults.summary.optionCreated) {
      console.log(`Option Created: ID ${testResults.summary.optionCreated.optionId}, Strike $${testResults.summary.optionCreated.strike}`);
      console.log(`Premium: ${testResults.summary.optionCreated.premium} USDC`);
      console.log(`Collateral: ${testResults.summary.optionCreated.collateral} USDC`);
    }
    console.log(`Writer Final USDC: ${testResults.summary.finalBalances.writer.usdc}`);
    console.log(`Buyer Final USDC: ${testResults.summary.finalBalances.buyer.usdc}`);
  }

  console.log("\n📋 Full test details available in test-results.json");
}

// Run the test
testOptionsLifecycle()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
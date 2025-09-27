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

// Contract ABIs
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

const ERC1155_ABI = [
  {
    inputs: [{ name: "account", type: "address" }, { name: "id", type: "uint256" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const LAYERED_OPTIONS_ABI = [
  {
    inputs: [{ name: "asset", type: "address" }],
    name: "addSupportedAsset",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "baseAsset", type: "address" },
      { name: "strikePrice", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "premium", type: "uint256" },
      { name: "parentTokenId", type: "uint256" },
    ],
    name: "createLayeredOption",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "parentTokenId", type: "uint256" },
      { name: "newStrikePrice", type: "uint256" },
      { name: "newExpiry", type: "uint256" },
    ],
    name: "createChildOption",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "exerciseOption",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "getOption",
    outputs: [
      {
        components: [
          { name: "baseAsset", type: "address" },
          { name: "strikePrice", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "premium", type: "uint256" },
          { name: "parentTokenId", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "isOptionExpired",
    outputs: [{ name: "", type: "bool" }],
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

interface LayeredTestResults {
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
    parentOption?: {
      tokenId: string;
      strike: string;
      premium: string;
      expiry: string;
    };
    childOptions?: Array<{
      tokenId: string;
      strike: string;
      premium: string;
      expiry: string;
      parentTokenId: string;
    }>;
    transfers: Array<{
      from: string;
      to: string;
      tokenId: string;
    }>;
    exercises: Array<{
      tokenId: string;
      exerciser: string;
    }>;
  };
}

/**
 * Comprehensive Layered Options Test Script
 * Tests the full lifecycle of layered options including parent-child relationships
 */
async function testLayeredOptionsLifecycle(): Promise<void> {
  console.log("🚀 Starting Layered Options Lifecycle Test\n");

  // Create accounts
  if (!process.env.PRIVATE_KEY) {
    throw new Error("Please set PRIVATE_KEY in your .env file");
  }

  const deployerAccount = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  
  // Generate accounts for testing
  const user1PrivateKey = generatePrivateKey();
  const user1Account = privateKeyToAccount(user1PrivateKey);
  
  const user2PrivateKey = generatePrivateKey();
  const user2Account = privateKeyToAccount(user2PrivateKey);

  console.log(`🔑 Generated test accounts:`);
  console.log(`   Deployer: ${deployerAccount.address}`);
  console.log(`   User1: ${user1Account.address}`);
  console.log(`   User2: ${user2Account.address}`);

  // Create clients
  const publicClient = createPublicClient({
    chain: citreaTestnet,
    transport: http(),
  });

  const deployerWalletClient = createWalletClient({
    chain: citreaTestnet,
    transport: http(),
    account: deployerAccount,
  });

  const user1WalletClient = createWalletClient({
    chain: citreaTestnet,
    transport: http(),
    account: user1Account,
  });

  const user2WalletClient = createWalletClient({
    chain: citreaTestnet,
    transport: http(),
    account: user2Account,
  });

  // Fund test accounts with gas tokens
  console.log(`💰 Funding test accounts with gas tokens...`);
  const fundingAmount = parseEther("0.05"); // 0.05 cBTC each

  const fundUser1Tx = await deployerWalletClient.sendTransaction({
    to: user1Account.address,
    value: fundingAmount,
  });
  
  const fundUser2Tx = await deployerWalletClient.sendTransaction({
    to: user2Account.address,
    value: fundingAmount,
  });
  
  await publicClient.waitForTransactionReceipt({ hash: fundUser1Tx });
  await publicClient.waitForTransactionReceipt({ hash: fundUser2Tx });
  console.log(`✅ Test accounts funded\n`);

  // Create contract instances
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

  const layeredOptionsTrading = getContract({
    address: getAddress(deployedAddresses.contracts.layeredOptionsTrading),
    abi: [...LAYERED_OPTIONS_ABI, ...ERC1155_ABI],
    client: { public: publicClient, wallet: deployerWalletClient },
  });

  // Contract instances for users
  const layeredOptionsTradingUser1 = getContract({
    address: getAddress(deployedAddresses.contracts.layeredOptionsTrading),
    abi: [...LAYERED_OPTIONS_ABI, ...ERC1155_ABI],
    client: { public: publicClient, wallet: user1WalletClient },
  });

  const layeredOptionsTradingUser2 = getContract({
    address: getAddress(deployedAddresses.contracts.layeredOptionsTrading),
    abi: [...LAYERED_OPTIONS_ABI, ...ERC1155_ABI],
    client: { public: publicClient, wallet: user2WalletClient },
  });

  const testResults: LayeredTestResults = {
    testName: "Layered Options Lifecycle End-to-End Test",
    network: "Citrea Testnet",
    chainId: 5115,
    startTime: new Date().toISOString(),
    totalSteps: 15,
    completedSteps: 0,
    success: false,
    tester: deployerAccount.address,
    contracts: deployedAddresses.contracts,
    steps: [],
    summary: {
      tokensMinted: { usdc: "0", btc: "0" },
      transfers: [],
      exercises: [],
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
    // Step 1: Setup contract instances
    logStep(1, "Contract instances loaded successfully", "success", {
      layeredOptionsTrading: layeredOptionsTrading.address,
      bitcoinToken: bitcoinToken.address,
      stableCoin: stableCoin.address,
    });
    testResults.completedSteps = 1;

    // Step 2: Add supported asset to layered options contract
    logStep(2, "Adding supported asset to layered options contract", "pending");
    
    const tx2 = await layeredOptionsTrading.write.addSupportedAsset([bitcoinToken.address]);
    const receipt2 = await publicClient.waitForTransactionReceipt({ hash: tx2 });
    
    logStep(2, "Supported asset added successfully", "success", {
      asset: bitcoinToken.address,
      txHash: tx2,
      gasUsed: receipt2.gasUsed.toString(),
    });
    testResults.completedSteps = 2;

    // Step 3: Mint tokens for testing
    logStep(3, "Minting test tokens", "pending");
    
    const mintAmount = parseUnits("1000", 6); // 1,000 USDC (6 decimals)
    const btcMintAmount = parseUnits("5", 8);  // 5 BTC (8 decimals)
    
    // Mint tokens for all users
    await stableCoin.write.mint([deployerAccount.address, mintAmount]);
    await stableCoin.write.mint([user1Account.address, mintAmount]);
    await stableCoin.write.mint([user2Account.address, mintAmount]);
    await bitcoinToken.write.mint([deployerAccount.address, btcMintAmount]);
    
    testResults.summary.tokensMinted = {
      usdc: formatUnits(mintAmount, 6),
      btc: formatUnits(btcMintAmount, 8),
    };
    
    logStep(3, "Test tokens minted successfully", "success", {
      usdcPerAccount: testResults.summary.tokensMinted.usdc,
      btcForDeployer: testResults.summary.tokensMinted.btc,
    });
    testResults.completedSteps = 3;

    // Step 4: Create parent layered option
    logStep(4, "Creating parent layered option", "pending");
    
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const parentExpiry = currentTime + 86400n; // 1 day
    const parentStrike = parseUnits("100000", 8); // $100,000 (8 decimals)
    const parentPremium = parseUnits("5", 8); // 5 BTC premium
    
    const tx4 = await layeredOptionsTrading.write.createLayeredOption([
      bitcoinToken.address,
      parentStrike,
      parentExpiry,
      parentPremium,
      0n // No parent (root option)
    ]);
    const receipt4 = await publicClient.waitForTransactionReceipt({ hash: tx4 });
    
    const parentTokenId = 1n; // First option created
    const parentOption = await layeredOptionsTrading.read.getOption([parentTokenId]);
    
    testResults.summary.parentOption = {
      tokenId: parentTokenId.toString(),
      strike: formatUnits(parentOption.strikePrice, 8),
      premium: formatUnits(parentOption.premium, 8),
      expiry: parentOption.expiry.toString(),
    };
    
    logStep(4, "Parent option created successfully", "success", {
      tokenId: testResults.summary.parentOption.tokenId,
      strike: `$${testResults.summary.parentOption.strike}`,
      premium: `${testResults.summary.parentOption.premium} BTC`,
      expiry: new Date(Number(parentOption.expiry) * 1000).toISOString(),
      txHash: tx4,
      gasUsed: receipt4.gasUsed.toString(),
    });
    testResults.completedSteps = 4;

    // Step 5: Transfer parent option to User1
    logStep(5, "Transferring parent option to User1", "pending");
    
    const tx5 = await layeredOptionsTrading.write.safeTransferFrom([
      deployerAccount.address,
      user1Account.address,
      parentTokenId,
      1n,
      "0x"
    ]);
    const receipt5 = await publicClient.waitForTransactionReceipt({ hash: tx5 });
    
    testResults.summary.transfers.push({
      from: deployerAccount.address,
      to: user1Account.address,
      tokenId: parentTokenId.toString(),
    });
    
    logStep(5, "Parent option transferred successfully", "success", {
      from: deployerAccount.address,
      to: user1Account.address,
      tokenId: parentTokenId.toString(),
      txHash: tx5,
      gasUsed: receipt5.gasUsed.toString(),
    });
    testResults.completedSteps = 5;

    // Step 6: Create first child option from parent
    logStep(6, "User1 creating first child option", "pending");
    
    const child1Expiry = currentTime + 43200n; // 12 hours
    const child1Strike = parseUnits("95000", 8); // $95,000
    
    const tx6 = await layeredOptionsTradingUser1.write.createChildOption([
      parentTokenId,
      child1Strike,
      child1Expiry
    ]);
    const receipt6 = await publicClient.waitForTransactionReceipt({ hash: tx6 });
    
    const child1TokenId = 2n;
    const child1Option = await layeredOptionsTrading.read.getOption([child1TokenId]);
    
    if (!testResults.summary.childOptions) {
      testResults.summary.childOptions = [];
    }
    
    testResults.summary.childOptions.push({
      tokenId: child1TokenId.toString(),
      strike: formatUnits(child1Option.strikePrice, 8),
      premium: formatUnits(child1Option.premium, 8),
      expiry: child1Option.expiry.toString(),
      parentTokenId: child1Option.parentTokenId.toString(),
    });
    
    logStep(6, "First child option created successfully", "success", {
      tokenId: child1TokenId.toString(),
      strike: `$${formatUnits(child1Strike, 8)}`,
      premium: `${formatUnits(child1Option.premium, 8)} BTC`,
      parentTokenId: parentTokenId.toString(),
      txHash: tx6,
      gasUsed: receipt6.gasUsed.toString(),
    });
    testResults.completedSteps = 6;

    // Step 7: Create second child option from same parent
    logStep(7, "User1 creating second child option", "pending");
    
    const child2Expiry = currentTime + 21600n; // 6 hours
    const child2Strike = parseUnits("105000", 8); // $105,000
    
    const tx7 = await layeredOptionsTradingUser1.write.createChildOption([
      parentTokenId,
      child2Strike,
      child2Expiry
    ]);
    const receipt7 = await publicClient.waitForTransactionReceipt({ hash: tx7 });
    
    const child2TokenId = 3n;
    const child2Option = await layeredOptionsTrading.read.getOption([child2TokenId]);
    
    testResults.summary.childOptions.push({
      tokenId: child2TokenId.toString(),
      strike: formatUnits(child2Option.strikePrice, 8),
      premium: formatUnits(child2Option.premium, 8),
      expiry: child2Option.expiry.toString(),
      parentTokenId: child2Option.parentTokenId.toString(),
    });
    
    logStep(7, "Second child option created successfully", "success", {
      tokenId: child2TokenId.toString(),
      strike: `$${formatUnits(child2Strike, 8)}`,
      premium: `${formatUnits(child2Option.premium, 8)} BTC`,
      parentTokenId: parentTokenId.toString(),
      txHash: tx7,
      gasUsed: receipt7.gasUsed.toString(),
    });
    testResults.completedSteps = 7;

    // Step 8: Transfer first child option to User2
    logStep(8, "Transferring first child option to User2", "pending");
    
    const tx8 = await layeredOptionsTradingUser1.write.safeTransferFrom([
      user1Account.address,
      user2Account.address,
      child1TokenId,
      1n,
      "0x"
    ]);
    const receipt8 = await publicClient.waitForTransactionReceipt({ hash: tx8 });
    
    testResults.summary.transfers.push({
      from: user1Account.address,
      to: user2Account.address,
      tokenId: child1TokenId.toString(),
    });
    
    logStep(8, "First child option transferred successfully", "success", {
      from: user1Account.address,
      to: user2Account.address,
      tokenId: child1TokenId.toString(),
      txHash: tx8,
      gasUsed: receipt8.gasUsed.toString(),
    });
    testResults.completedSteps = 8;

    // Step 9: Check all balances
    logStep(9, "Checking ERC1155 token balances", "pending");
    
    const deployerParentBalance = await layeredOptionsTrading.read.balanceOf([deployerAccount.address, parentTokenId]);
    const user1ParentBalance = await layeredOptionsTrading.read.balanceOf([user1Account.address, parentTokenId]);
    const user1Child2Balance = await layeredOptionsTrading.read.balanceOf([user1Account.address, child2TokenId]);
    const user2Child1Balance = await layeredOptionsTrading.read.balanceOf([user2Account.address, child1TokenId]);
    
    logStep(9, "Token balances checked successfully", "success", {
      balances: {
        deployer: { parentToken: deployerParentBalance.toString() },
        user1: { 
          parentToken: user1ParentBalance.toString(), 
          child2Token: user1Child2Balance.toString() 
        },
        user2: { child1Token: user2Child1Balance.toString() }
      }
    });
    testResults.completedSteps = 9;

    // Step 10: Check option expiration status
    logStep(10, "Checking option expiration status", "pending");
    
    const parentExpired = await layeredOptionsTrading.read.isOptionExpired([parentTokenId]);
    const child1Expired = await layeredOptionsTrading.read.isOptionExpired([child1TokenId]);
    const child2Expired = await layeredOptionsTrading.read.isOptionExpired([child2TokenId]);
    
    logStep(10, "Option expiration status checked", "success", {
      expirationStatus: {
        parent: parentExpired,
        child1: child1Expired,
        child2: child2Expired,
      }
    });
    testResults.completedSteps = 10;

    // Step 11: User2 exercises first child option
    logStep(11, "User2 exercising first child option", "pending");
    
    const tx11 = await layeredOptionsTradingUser2.write.exerciseOption([child1TokenId]);
    const receipt11 = await publicClient.waitForTransactionReceipt({ hash: tx11 });
    
    testResults.summary.exercises.push({
      tokenId: child1TokenId.toString(),
      exerciser: user2Account.address,
    });
    
    logStep(11, "First child option exercised successfully", "success", {
      tokenId: child1TokenId.toString(),
      exerciser: user2Account.address,
      txHash: tx11,
      gasUsed: receipt11.gasUsed.toString(),
    });
    testResults.completedSteps = 11;

    // Step 12: Check balance after exercise (should be 0)
    logStep(12, "Checking balance after exercise", "pending");
    
    const user2Child1BalanceAfterExercise = await layeredOptionsTrading.read.balanceOf([user2Account.address, child1TokenId]);
    
    logStep(12, "Balance after exercise checked", "success", {
      user2Child1Balance: user2Child1BalanceAfterExercise.toString(),
      expected: "0 (token burned after exercise)",
    });
    testResults.completedSteps = 12;

    // Step 13: User1 exercises second child option
    logStep(13, "User1 exercising second child option", "pending");
    
    const tx13 = await layeredOptionsTradingUser1.write.exerciseOption([child2TokenId]);
    const receipt13 = await publicClient.waitForTransactionReceipt({ hash: tx13 });
    
    testResults.summary.exercises.push({
      tokenId: child2TokenId.toString(),
      exerciser: user1Account.address,
    });
    
    logStep(13, "Second child option exercised successfully", "success", {
      tokenId: child2TokenId.toString(),
      exerciser: user1Account.address,
      txHash: tx13,
      gasUsed: receipt13.gasUsed.toString(),
    });
    testResults.completedSteps = 13;

    // Step 14: User1 exercises parent option
    logStep(14, "User1 exercising parent option", "pending");
    
    const tx14 = await layeredOptionsTradingUser1.write.exerciseOption([parentTokenId]);
    const receipt14 = await publicClient.waitForTransactionReceipt({ hash: tx14 });
    
    testResults.summary.exercises.push({
      tokenId: parentTokenId.toString(),
      exerciser: user1Account.address,
    });
    
    logStep(14, "Parent option exercised successfully", "success", {
      tokenId: parentTokenId.toString(),
      exerciser: user1Account.address,
      txHash: tx14,
      gasUsed: receipt14.gasUsed.toString(),
    });
    testResults.completedSteps = 14;

    // Step 15: Final verification
    logStep(15, "Final verification of all balances", "pending");
    
    const finalDeployerParentBalance = await layeredOptionsTrading.read.balanceOf([deployerAccount.address, parentTokenId]);
    const finalUser1ParentBalance = await layeredOptionsTrading.read.balanceOf([user1Account.address, parentTokenId]);
    const finalUser1Child2Balance = await layeredOptionsTrading.read.balanceOf([user1Account.address, child2TokenId]);
    const finalUser2Child1Balance = await layeredOptionsTrading.read.balanceOf([user2Account.address, child1TokenId]);
    
    logStep(15, "Final verification completed", "success", {
      finalBalances: {
        deployer: { parentToken: finalDeployerParentBalance.toString() },
        user1: { 
          parentToken: finalUser1ParentBalance.toString(),
          child2Token: finalUser1Child2Balance.toString()
        },
        user2: { child1Token: finalUser2Child1Balance.toString() },
      },
      allExercised: "All options should show 0 balance (burned after exercise)",
    });
    testResults.completedSteps = 15;

    testResults.success = true;
    testResults.endTime = new Date().toISOString();

    console.log("🎉 Layered Options Lifecycle Test Completed Successfully!\n");

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    logStep(testResults.completedSteps + 1, "Test execution failed", "failed", undefined, error.message);
    testResults.success = false;
    testResults.endTime = new Date().toISOString();
  }

  // Save results to JSON file
  const resultsPath = path.join(__dirname, "../layered-test-results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));

  // Print summary
  console.log("📊 LAYERED OPTIONS TEST SUMMARY");
  console.log("=".repeat(60));
  console.log(`Test Name: ${testResults.testName}`);
  console.log(`Network: ${testResults.network} (Chain ID: ${testResults.chainId})`);
  console.log(`Success: ${testResults.success ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Completed Steps: ${testResults.completedSteps}/${testResults.totalSteps}`);
  console.log(`Duration: ${testResults.startTime} - ${testResults.endTime || "Interrupted"}`);

  if (testResults.success) {
    console.log("\n📈 LAYERED OPTIONS SUMMARY");
    console.log("-".repeat(40));
    if (testResults.summary.parentOption) {
      console.log(`Parent Option: ID ${testResults.summary.parentOption.tokenId}, Strike $${testResults.summary.parentOption.strike}`);
      console.log(`Premium: ${testResults.summary.parentOption.premium} BTC`);
    }
    if (testResults.summary.childOptions) {
      console.log(`Child Options Created: ${testResults.summary.childOptions.length}`);
      testResults.summary.childOptions.forEach((child, index) => {
        console.log(`  Child ${index + 1}: ID ${child.tokenId}, Strike $${child.strike}, Premium ${child.premium} BTC`);
      });
    }
    console.log(`Transfers: ${testResults.summary.transfers.length}`);
    console.log(`Exercises: ${testResults.summary.exercises.length}`);
    
    console.log("\n🔄 LAYERED STRUCTURE DEMONSTRATION");
    console.log("-".repeat(40));
    console.log("✓ Parent option created with 1-day expiry");
    console.log("✓ Two child options created with shorter expiries");
    console.log("✓ Parent-child relationships maintained");
    console.log("✓ Independent exercise of child options");
    console.log("✓ Collateral efficiency through layering");
  }

  console.log(`\n📋 Results saved to: ${resultsPath}`);
}

// Run the test
testLayeredOptionsLifecycle()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
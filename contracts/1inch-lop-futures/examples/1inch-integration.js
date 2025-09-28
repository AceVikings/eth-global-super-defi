/**
 * 1inch SDK Integration Example for LOP Futures
 * 
 * This example demonstrates how to create limit orders with futures extensions
 * using the 1inch SDK and our deployed contracts.
 * 
 * Flow:
 * 1. Create a limit order with pre/post interaction adapters
 * 2. Taker locks collateral via pre-interaction
 * 3. 1inch executes swap when conditions are met
 * 4. Settlement contract receives swap output and credits maker
 * 5. Post-interaction opens bilateral futures position
 * 
 * Prerequisites:
 * - Deploy all contracts to Polygon
 * - Configure roles and permissions
 * - Maker and taker have USDC for collateral
 */

import { ethers } from "ethers";

// Contract addresses (replace with actual deployed addresses)
const CONTRACTS = {
  // Core system contracts
  futuresVault: "0x...", // Replace with deployed FuturesVault address
  futuresMarket: "0x...", // Replace with deployed FuturesMarket address
  preAdapter: "0x...", // Replace with deployed PreInteractionAdapter address
  postAdapter: "0x...", // Replace with deployed PostInteractionAdapter address
  settlement: "0x...", // Replace with deployed FuturesSettlement address
  
  // External contracts
  oneInchLOP: "0x111111125421ca6dc452d289314280a0f8842a65", // 1inch LOP on Polygon
  usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC on Polygon
  weth: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" // WETH on Polygon
};

// Position parameters for the futures trade
const POSITION_PARAMS = {
  size: ethers.parseUnits("1", 18), // 1 ETH worth (positive for long)
  leverage: 10, // 10x leverage
  makerMargin: ethers.parseUnits("200", 6), // 200 USDC
  takerMargin: ethers.parseUnits("200", 6), // 200 USDC
  notional: ethers.parseUnits("2000", 6) // $2000 USDC notional
};

/**
 * Create pre-interaction calldata for taker collateral locking
 */
async function createPreInteractionData(provider, takerAddress, takerMargin) {
  const preAdapterContract = new ethers.Contract(
    CONTRACTS.preAdapter,
    [
      "function createPreInteractionCalldata(address taker, uint256 amount) external pure returns (bytes memory)"
    ],
    provider
  );
  
  return await preAdapterContract.createPreInteractionCalldata(
    takerAddress,
    takerMargin
  );
}

/**
 * Create post-interaction calldata for position opening
 */
async function createPostInteractionData(provider, makerAddress, takerAddress) {
  const postAdapterContract = new ethers.Contract(
    CONTRACTS.postAdapter,
    [
      "function createPostInteractionCalldata(address maker, address taker, int256 signedSize, uint16 leverage, uint256 makerMargin, uint256 takerMargin, uint256 notional) external pure returns (bytes memory)"
    ],
    provider
  );
  
  return await postAdapterContract.createPostInteractionCalldata(
    makerAddress,
    takerAddress,
    POSITION_PARAMS.size, // Positive for long
    POSITION_PARAMS.leverage,
    POSITION_PARAMS.makerMargin,
    POSITION_PARAMS.takerMargin,
    POSITION_PARAMS.notional
  );
}

/**
 * Create settlement calldata for 1inch integration
 */
async function createSettlementCalldata(provider, makerAddress, orderHash, postInteractionData) {
  const settlementContract = new ethers.Contract(
    CONTRACTS.settlement,
    [
      "function createSettlementCalldata(address token, address maker, uint256 amount, bytes32 orderHash, address marketAddr, bytes calldata postInteractionData) external pure returns (bytes memory)"
    ],
    provider
  );
  
  return await settlementContract.createSettlementCalldata(
    CONTRACTS.usdc,
    makerAddress,
    POSITION_PARAMS.makerMargin,
    orderHash,
    CONTRACTS.futuresMarket,
    postInteractionData
  );
}

/**
 * Example: Create a limit order with futures extension
 * This creates a limit order that, when filled, opens a bilateral futures position
 */
async function createFuturesLimitOrder(provider, makerSigner) {
  console.log("🚀 Creating 1inch Limit Order with Futures Extension...");
  
  const makerAddress = await makerSigner.getAddress();
  console.log("Maker address:", makerAddress);
  
  // Step 1: Prepare interaction data
  const preInteractionData = await createPreInteractionData(
    provider,
    "0x...", // Taker address (will be filled when order is taken)
    POSITION_PARAMS.takerMargin
  );
  
  const postInteractionData = await createPostInteractionData(
    provider,
    makerAddress,
    "0x..." // Taker address placeholder
  );
  
  // Step 2: Create order hash (simplified - in practice use 1inch SDK)
  const orderData = {
    salt: ethers.randomBytes(32),
    maker: makerAddress,
    receiver: CONTRACTS.settlement, // Settlement contract as recipient
    makerAsset: CONTRACTS.weth,
    takerAsset: CONTRACTS.usdc,
    makingAmount: ethers.parseUnits("1", 18), // 1 WETH
    takingAmount: ethers.parseUnits("2000", 6), // 2000 USDC
    makerAssetData: "0x",
    takerAssetData: "0x",
    getMakerAmount: "0x",
    getTakerAmount: "0x",
    predicate: "0x",
    permit: "0x",
    preInteraction: preInteractionData,
    postInteraction: postInteractionData
  };
  
  const orderHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, bytes makerAssetData, bytes takerAssetData, bytes getMakerAmount, bytes getTakerAmount, bytes predicate, bytes permit, bytes preInteraction, bytes postInteraction)"],
      [orderData]
    )
  );
  
  console.log("📋 Order created with hash:", orderHash);
  console.log("💰 Trading: 1 WETH → 2000 USDC");
  console.log("📊 Will open bilateral futures position:");
  console.log("   - Size:", ethers.formatUnits(POSITION_PARAMS.size, 18), "ETH");
  console.log("   - Leverage:", POSITION_PARAMS.leverage + "x");
  console.log("   - Maker margin:", ethers.formatUnits(POSITION_PARAMS.makerMargin, 6), "USDC");
  console.log("   - Taker margin:", ethers.formatUnits(POSITION_PARAMS.takerMargin, 6), "USDC");
  
  return {
    orderData,
    orderHash,
    preInteractionData,
    postInteractionData
  };
}

/**
 * Example: Taker fills the limit order
 */
async function fillFuturesLimitOrder(provider, takerSigner, orderData) {
  console.log("\n💫 Taker filling the limit order...");
  
  const takerAddress = await takerSigner.getAddress();
  console.log("Taker address:", takerAddress);
  
  // Step 1: Deposit taker collateral to vault
  const vaultContract = new ethers.Contract(
    CONTRACTS.futuresVault,
    [
      "function deposit(uint256 amount) external",
      "function balanceOf(address account) external view returns (uint256)"
    ],
    takerSigner
  );
  
  // Check if taker has sufficient USDC
  const usdcContract = new ethers.Contract(
    CONTRACTS.usdc,
    ["function approve(address spender, uint256 amount) external"],
    takerSigner
  );
  
  // Approve vault to spend USDC
  console.log("Approving USDC spend...");
  await usdcContract.approve(CONTRACTS.futuresVault, POSITION_PARAMS.takerMargin);
  
  // Deposit collateral
  console.log("Depositing taker collateral...");
  await vaultContract.deposit(POSITION_PARAMS.takerMargin);
  
  const takerBalance = await vaultContract.balanceOf(takerAddress);
  console.log("Taker vault balance:", ethers.formatUnits(takerBalance, 6), "USDC");
  
  // Step 2: In practice, you'd use 1inch API to fill the order
  // This would trigger the pre-interaction, execute swap, and post-interaction
  console.log("🔄 Order execution would happen via 1inch API...");
  console.log("✅ Limit order ready for execution!");
  
  return {
    takerAddress,
    takerBalance
  };
}

/**
 * Monitor position after order execution
 */
async function monitorPosition(provider, positionId) {
  const marketContract = new ethers.Contract(
    CONTRACTS.futuresMarket,
    [
      "function getPosition(uint256 positionId) external view returns (tuple(address maker, address taker, int256 size, uint256 notional, uint256 makerMargin, uint256 takerMargin, uint256 entryPrice, bool isActive))"
    ],
    provider
  );
  
  try {
    const position = await marketContract.getPosition(positionId);
    
    console.log("\n📊 Position Created:");
    console.log("   ID:", positionId.toString());
    console.log("   Maker:", position.maker);
    console.log("   Taker:", position.taker);
    console.log("   Size:", ethers.formatUnits(position.size, 18), "ETH");
    console.log("   Notional:", ethers.formatUnits(position.notional, 6), "USDC");
    console.log("   Entry Price:", ethers.formatUnits(position.entryPrice, 18), "USD");
    console.log("   Active:", position.isActive);
    
    return position;
  } catch (error) {
    console.log("Position not yet created or invalid ID");
    return null;
  }
}

/**
 * Main example execution
 */
async function main() {
  console.log("🌟 1inch LOP Futures Integration Example");
  console.log("========================================");
  
  // Setup provider (replace with your Polygon RPC)
  const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
  
  // Setup signers (replace with your private keys)
  const makerSigner = new ethers.Wallet("0x...", provider); // Maker private key
  const takerSigner = new ethers.Wallet("0x...", provider); // Taker private key
  
  try {
    // Create the futures-enabled limit order
    const orderResult = await createFuturesLimitOrder(provider, makerSigner);
    
    // Simulate taker filling the order
    const fillResult = await fillFuturesLimitOrder(provider, takerSigner, orderResult.orderData);
    
    // In practice, the position would be created automatically
    // Here we'd monitor for the PositionOpened event
    console.log("\n🎯 Integration example complete!");
    console.log("In production, the 1inch API would:");
    console.log("1. Execute pre-interaction (lock taker collateral)");
    console.log("2. Perform the swap (WETH → USDC)");
    console.log("3. Send proceeds to settlement contract");
    console.log("4. Execute post-interaction (open bilateral position)");
    
  } catch (error) {
    console.error("Error in example:", error);
  }
}

/**
 * Real-world integration notes:
 * 
 * 1. Use 1inch SDK for proper order creation and signing
 * 2. Implement proper error handling and retries
 * 3. Monitor blockchain events for position creation
 * 4. Add position management functions (close, liquidate)
 * 5. Integrate with price oracles for real-time data
 * 6. Implement proper access controls and permissions
 * 7. Add comprehensive testing on Polygon fork
 * 8. Consider gas optimization for mainnet deployment
 */

// Uncomment to run the example
// main().catch(console.error);

export {
  createPreInteractionData,
  createPostInteractionData,
  createSettlementCalldata,
  createFuturesLimitOrder,
  fillFuturesLimitOrder,
  monitorPosition,
  CONTRACTS,
  POSITION_PARAMS
};
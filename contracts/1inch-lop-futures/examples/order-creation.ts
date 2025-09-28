import { ethers } from "ethers";
import { parseUnits, encodeFunctionData, parseAbi } from "viem";

/**
 * 1inch Limit Order Protocol Futures Integration Examples
 * 
 * This file demonstrates how to create 1inch limit orders with futures extensions
 * that work with our FuturesVault, PreInteractionAdapter, and PostInteractionAdapter
 * 
 * Flow:
 * 1. Create a limit order with preInteraction (locks taker collateral)
 * 2. Order gets filled by 1inch protocol
 * 3. Settlement contract receives swap output
 * 4. PostInteraction opens bilateral futures position
 */

// ===== CONTRACT ADDRESSES (from deployment) =====
interface DeployedContracts {
  vault: string;
  market: string;
  preAdapter: string;
  postAdapter: string;
  settlement: string;
  oracle: string;
  oneInchLOP: string;
  collateralToken: string; // USDC
}

// Example deployment addresses (replace with actual deployed addresses)
const contracts: DeployedContracts = {
  vault: "0x...", // FuturesVault address
  market: "0x...", // FuturesMarket address
  preAdapter: "0x...", // PreInteractionAdapter address
  postAdapter: "0x...", // PostInteractionAdapter address
  settlement: "0x...", // FuturesSettlement address
  oracle: "0x...", // MockOracle address
  oneInchLOP: "0x111111125421ca6dc452d289314280a0f8842a65", // Polygon 1inch LOP
  collateralToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174" // Polygon USDC
};

// ===== POSITION PARAMETERS =====
interface FuturesPositionParams {
  maker: string;
  taker: string;
  signedSize: bigint; // Positive for long, negative for short
  leverage: number;
  makerMargin: bigint;
  takerMargin: bigint;
  notional: bigint;
}

// ===== ABI DEFINITIONS =====
const preInteractionAbi = parseAbi([
  "function preInteraction(address taker, bytes calldata data) external",
  "function createPreInteractionCalldata(address taker, uint256 amount) external pure returns (bytes memory)"
]);

const postInteractionAbi = parseAbi([
  "function onPostInteraction(address marketAddr, bytes calldata data) external returns (uint256 positionId)",
  "function createPostInteractionCalldata(address maker, address taker, int256 signedSize, uint16 leverage, uint256 makerMargin, uint256 takerMargin, uint256 notional) external pure returns (bytes memory)"
]);

const settlementAbi = parseAbi([
  "function receiveTokens(address token, address maker, uint256 amount, bytes32 orderHash, address marketAddr, bytes calldata postInteractionData) external",
  "function createSettlementCalldata(address token, address maker, uint256 amount, bytes32 orderHash, address marketAddr, bytes calldata postInteractionData) external pure returns (bytes memory)"
]);

/**
 * Create calldata for PreInteractionAdapter
 * This locks the taker's collateral before order execution
 */
export function createPreInteractionCalldata(
  taker: string,
  takerMargin: bigint
): string {
  return encodeFunctionData({
    abi: preInteractionAbi,
    functionName: "createPreInteractionCalldata",
    args: [taker, takerMargin]
  });
}

/**
 * Create calldata for PostInteractionAdapter
 * This opens the bilateral futures position after settlement
 */
export function createPostInteractionCalldata(
  positionParams: FuturesPositionParams
): string {
  return encodeFunctionData({
    abi: postInteractionAbi,
    functionName: "createPostInteractionCalldata",
    args: [
      positionParams.maker,
      positionParams.taker,
      positionParams.signedSize,
      positionParams.leverage,
      positionParams.makerMargin,
      positionParams.takerMargin,
      positionParams.notional
    ]
  });
}

/**
 * Create calldata for FuturesSettlement
 * This handles the swap output and triggers position opening
 */
export function createSettlementCalldata(
  token: string,
  maker: string,
  amount: bigint,
  orderHash: string,
  marketAddr: string,
  postInteractionData: string
): string {
  return encodeFunctionData({
    abi: settlementAbi,
    functionName: "createSettlementCalldata",
    args: [token, maker, amount, orderHash, marketAddr, postInteractionData]
  });
}

/**
 * Example: Create a futures-enabled 1inch limit order
 * This demonstrates the complete integration flow
 */
export function createFuturesLimitOrder(
  maker: string,
  taker: string,
  makerAsset: string, // Token maker is selling
  takerAsset: string, // Token taker is buying (output of swap)
  makingAmount: bigint,
  takingAmount: bigint,
  positionSize: bigint, // Positive for long, negative for short
  leverage: number,
  makerMargin: bigint,
  takerMargin: bigint
) {
  
  // Calculate notional value
  const notional = positionSize > 0n ? positionSize : -positionSize;
  
  // Position parameters
  const positionParams: FuturesPositionParams = {
    maker,
    taker,
    signedSize: positionSize,
    leverage,
    makerMargin,
    takerMargin,
    notional
  };
  
  // Create pre-interaction calldata (locks taker collateral)
  const preInteractionData = createPreInteractionCalldata(taker, takerMargin);
  
  // Create post-interaction calldata (opens position after settlement)
  const postInteractionData = createPostInteractionCalldata(positionParams);
  
  // 1inch Limit Order structure (simplified)
  const limitOrder = {
    salt: BigInt(Math.floor(Math.random() * 1000000)), // Random salt
    maker: maker,
    receiver: contracts.settlement, // Settlement contract receives swap output
    makerAsset: makerAsset,
    takerAsset: takerAsset,
    makingAmount: makingAmount,
    takingAmount: takingAmount,
    
    // Futures extensions
    preInteraction: contracts.preAdapter, // PreInteractionAdapter address
    preInteractionData: preInteractionData,
    postInteraction: contracts.postAdapter, // PostInteractionAdapter address  
    postInteractionData: postInteractionData,
    
    // Additional fields for futures integration
    extension: encodeFuturesExtension(
      contracts.market,
      contracts.settlement,
      postInteractionData
    )
  };
  
  return limitOrder;
}

/**
 * Encode futures-specific extension data
 * This tells the system how to handle the futures position creation
 */
function encodeFuturesExtension(
  marketAddr: string,
  settlementAddr: string,
  postInteractionData: string
): string {
  // Extension format for futures integration
  const extensionData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "address", "bytes"],
    [marketAddr, settlementAddr, postInteractionData]
  );
  
  return extensionData;
}

/**
 * Example usage: Create a long ETH futures position via 1inch limit order
 */
export function exampleLongETHFutures() {
  const maker = "0x742d35Cc6634C0532925a3b8D4484F8f"; // Example maker
  const taker = "0x8ba1f109551bD432803012645Hac136c"; // Example taker
  
  // Maker sells USDC, wants ETH (but creates futures position instead of holding ETH)
  const makerAsset = contracts.collateralToken; // USDC
  const takerAsset = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"; // WETH on Polygon
  
  const makingAmount = parseUnits("2000", 6); // Maker sells 2000 USDC
  const takingAmount = parseUnits("1", 18); // Expects 1 ETH worth
  
  // Futures position: Long 1 ETH with 2x leverage
  const positionSize = parseUnits("1", 18); // 1 ETH long
  const leverage = 2;
  const makerMargin = parseUnits("1000", 6); // Maker deposits 1000 USDC margin
  const takerMargin = parseUnits("1000", 6); // Taker deposits 1000 USDC margin
  
  const order = createFuturesLimitOrder(
    maker,
    taker,
    makerAsset,
    takerAsset,
    makingAmount,
    takingAmount,
    positionSize, // Positive = long position
    leverage,
    makerMargin,
    takerMargin
  );
  
  console.log("Long ETH Futures Order:", JSON.stringify(order, null, 2));
  return order;
}

/**
 * Example usage: Create a short ETH futures position via 1inch limit order
 */
export function exampleShortETHFutures() {
  const maker = "0x742d35Cc6634C0532925a3b8D4484F8f"; // Example maker
  const taker = "0x8ba1f109551bD432803012645Hac136c"; // Example taker
  
  // Maker sells ETH, wants USDC (but creates short futures position)
  const makerAsset = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"; // WETH on Polygon  
  const takerAsset = contracts.collateralToken; // USDC
  
  const makingAmount = parseUnits("1", 18); // Maker sells 1 ETH
  const takingAmount = parseUnits("2000", 6); // Expects 2000 USDC
  
  // Futures position: Short 1 ETH with 2x leverage
  const positionSize = -parseUnits("1", 18); // -1 ETH (short)
  const leverage = 2;
  const makerMargin = parseUnits("1000", 6); // Maker deposits 1000 USDC margin
  const takerMargin = parseUnits("1000", 6); // Taker deposits 1000 USDC margin
  
  const order = createFuturesLimitOrder(
    maker,
    taker,
    makerAsset,
    takerAsset,
    makingAmount,
    takingAmount,
    positionSize, // Negative = short position
    leverage,
    makerMargin,
    takerMargin
  );
  
  console.log("Short ETH Futures Order:", JSON.stringify(order, null, 2));
  return order;
}

/**
 * EIP-712 signing for 1inch limit orders
 * This creates the proper signature for order execution
 */
export async function signLimitOrder(
  order: any,
  privateKey: string,
  chainId: number
): Promise<string> {
  const wallet = new ethers.Wallet(privateKey);
  
  // 1inch Limit Order EIP-712 domain
  const domain = {
    name: "1inch Limit Order Protocol",
    version: "3",
    chainId: chainId,
    verifyingContract: contracts.oneInchLOP
  };
  
  // 1inch Limit Order types (simplified - check 1inch docs for complete types)
  const types = {
    Order: [
      { name: "salt", type: "uint256" },
      { name: "maker", type: "address" },
      { name: "receiver", type: "address" },
      { name: "makerAsset", type: "address" },
      { name: "takerAsset", type: "address" },
      { name: "makingAmount", type: "uint256" },
      { name: "takingAmount", type: "uint256" },
      { name: "preInteraction", type: "address" },
      { name: "preInteractionData", type: "bytes" },
      { name: "postInteraction", type: "address" },
      { name: "postInteractionData", type: "bytes" },
      { name: "extension", type: "bytes" }
    ]
  };
  
  // Sign the order
  const signature = await wallet.signTypedData(domain, types, order);
  return signature;
}

/**
 * Integration helper: Complete order creation and signing
 */
export async function createSignedFuturesOrder(
  maker: string,
  privateKey: string,
  orderType: "long" | "short",
  chainId: number = 137
) {
  // Create the order based on type
  const order = orderType === "long" 
    ? exampleLongETHFutures() 
    : exampleShortETHFutures();
  
  // Sign the order
  const signature = await signLimitOrder(order, privateKey, chainId);
  
  return {
    order,
    signature,
    chainId
  };
}

// ===== MAIN EXAMPLE EXECUTION =====
if (require.main === module) {
  console.log("1inch Futures Integration Examples");
  console.log("==================================");
  
  console.log("\n1. Long ETH Futures Order:");
  exampleLongETHFutures();
  
  console.log("\n2. Short ETH Futures Order:");
  exampleShortETHFutures();
  
  console.log("\n3. Integration Flow:");
  console.log("- Create limit order with preInteraction (locks taker collateral)");
  console.log("- 1inch executes the swap");
  console.log("- Settlement contract receives swap output");
  console.log("- PostInteraction opens bilateral futures position");
  console.log("- Both parties now have leveraged exposure without holding the underlying asset");
}
// Contract addresses on Citrea testnet - Updated with new deployment (Sept 28, 2025)
export const CONTRACT_ADDRESSES = {
  LAYERED_OPTIONS_TRADING:
    "0x78650fe648fea6a50523fc0c90b100103b3a815f" as `0x${string}`,
  TIME_ORACLE: "0x7dc5f317cf0d928bfa0f87b9eefaeef2e15318a4" as `0x${string}`,
  MOCK_WBTC: "0xd78efe947fdceab5665a5264244ce4b7f9209b62" as `0x${string}`,
  STABLECOIN: "0x6dad502a7b4881d53f615fbb4bfbe01033b11915" as `0x${string}`,
  // Legacy compatibility
  BTC_PRICE_FEED: "0x2574b49a1ded38c9f239682769e3c3e708797c7a" as `0x${string}`,
  ETH_PRICE_FEED: "0x7d0c4127c937aaf59b0af8f686d63d602e27a777" as `0x${string}`,
  MOCK_WETH: "0x52e5d5ff769e71dfeead1a3fc5c440f87031a3e3" as `0x${string}`,
} as const;

// Layered Options Trading ABI (updated with call/put support)
export const LAYERED_OPTIONS_ABI = [
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
      { name: "maturity", type: "uint256" }, // Changed from expiry to match contract
      { name: "premium", type: "uint256" },
      { name: "parentTokenId", type: "uint256" },
      { name: "optionType", type: "uint8" }, // 0 = CALL, 1 = PUT
      // premiumToken parameter REMOVED - matches deployed contract
    ],
    name: "createLayeredOption",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable", // Changed from payable - writers provide collateral, not pay premium
    type: "function",
  },
  {
    inputs: [
      { name: "parentTokenId", type: "uint256" },
      { name: "newStrikePrice", type: "uint256" },
      // maturity parameter REMOVED - child options inherit parent maturity automatically
    ],
    name: "createChildOption",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable", // Changed from payable - premium paid in stablecoin via approval
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "purchaseOption",
    outputs: [],
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
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    name: "safeTransferFrom",
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
          { name: "optionType", type: "uint8" },
          { name: "premiumToken", type: "address" },
          { name: "isExercised", type: "bool" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextTokenId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Mock ERC20 ABI for token interactions
export const MOCK_ERC20_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
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
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
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

// Option types
export const OptionType = {
  CALL: 0,
  PUT: 1,
} as const;

export type OptionType = (typeof OptionType)[keyof typeof OptionType];

// Type definitions
export interface LayeredOption {
  baseAsset: `0x${string}`;
  strikePrice: bigint;
  expiry: bigint;
  premium: bigint;
  parentTokenId: bigint;
  optionType: OptionType;
  premiumToken: `0x${string}`;
  isExercised: boolean;
}

// Supported assets for different option types
export const SUPPORTED_ASSETS = {
  CALL: {
    BTC: {
      address: CONTRACT_ADDRESSES.MOCK_WBTC,
      symbol: "BTC",
      name: "Bitcoin",
      decimals: 18,
    },
  },
  PUT: {
    USD: {
      address: CONTRACT_ADDRESSES.STABLECOIN,
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  },
} as const;

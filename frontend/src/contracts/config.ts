// Contract addresses on Citrea testnet
export const CONTRACT_ADDRESSES = {
  LAYERED_OPTIONS_TRADING: "0x5159326b4faf867eb45c324842e77543a8eae63d" as `0x${string}`,
  BTC_PRICE_FEED: "0xdefd3f543b9b815c3868747ccfb69b207fa52642" as `0x${string}`,
  ETH_PRICE_FEED: "0x8f643b663cbea913157f503a27294a7b430d7cfe" as `0x${string}`,
  MOCK_WBTC: "0x4dc54591faba530bf5fa3087b7ca50234b3dfe8a" as `0x${string}`,
  STABLECOIN: "0x807fcda7a2d39f5cf52dc84a05477bb6857b7f80" as `0x${string}`,
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
      { name: "expiry", type: "uint256" },
      { name: "premium", type: "uint256" },
      { name: "parentTokenId", type: "uint256" },
      { name: "optionType", type: "uint8" }, // 0 = CALL, 1 = PUT
      { name: "premiumToken", type: "address" }, // Address of premium token (0x0 for ETH)
    ],
    name: "createLayeredOption",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "parentTokenId", type: "uint256" },
      { name: "newStrikePrice", type: "uint256" },
      { name: "newExpiry", type: "uint256" },
      { name: "optionType", type: "uint8" }, // 0 = CALL, 1 = PUT
    ],
    name: "createChildOption",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
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

export type OptionType = typeof OptionType[keyof typeof OptionType];

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
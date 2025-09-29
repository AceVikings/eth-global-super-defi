// Contract addresses on Citrea testnet - Updated with FIXED SETTLEMENT deployment (Sept 28, 2025)
export const CONTRACT_ADDRESSES = {
  LAYERED_OPTIONS_TRADING:
    "0x711e3478ed87ed7551d0d80c0273465319a5d7a7" as `0x${string}`,
  TIME_ORACLE: "0xce34b7ebb976b6a4dca43597850b17560d40a577" as `0x${string}`,
  MOCK_WBTC: "0xce311c5cbe26263fa0208d4f5923ba5ef06f8eac" as `0x${string}`,
  MOCK_WETH: "0xfe69aaf32ac992913a2ad4c1daffaf23b1f7f588" as `0x${string}`,
  STABLECOIN: "0xd42eb748558f423f3ea5fe587149477fc3c558d3" as `0x${string}`,
  BTC_PRICE_FEED: "0x2091288042d849d66b4e24b1c3bb6b59b51dd6eb" as `0x${string}`,
  ETH_PRICE_FEED: "0x457098140c5e83f28a31fb676cf8c00c8c4a9033" as `0x${string}`,
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
    name: "settleOption",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "isOptionMatured",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
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
  {
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" }
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "parentTokenId", type: "uint256" },
      { name: "finalPrice", type: "uint256" }
    ],
    name: "calculateParentProfit",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "childTokenId", type: "uint256" },
      { name: "finalPrice", type: "uint256" }
    ],
    name: "calculateChildProfit",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "parentTokenId", type: "uint256" }],
    name: "settleOptionTree",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "claimSettlement",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "parentTokenId", type: "uint256" }],
    name: "getOptionChildren",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "settlements",
    outputs: [
      { name: "maturityPrice", type: "uint256" },
      { name: "priceSet", type: "bool" },
      { name: "totalPayout", type: "uint256" }
    ],
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

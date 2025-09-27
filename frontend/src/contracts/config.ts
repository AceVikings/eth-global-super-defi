// Contract addresses on Citrea testnet
export const CONTRACT_ADDRESSES = {
  LAYERED_OPTIONS_TRADING: "0x5159326b4faf867eb45c324842e77543a8eae63d" as `0x${string}`,
  BTC_PRICE_FEED: "0xdefd3f543b9b815c3868747ccfb69b207fa52642" as `0x${string}`,
  ETH_PRICE_FEED: "0x8f643b663cbea913157f503a27294a7b430d7cfe" as `0x${string}`,
  MOCK_WBTC: "0x4dc54591faba530bf5fa3087b7ca50234b3dfe8a" as `0x${string}`,
  STABLECOIN: "0x807fcda7a2d39f5cf52dc84a05477bb6857b7f80" as `0x${string}`,
} as const;

// Layered Options Trading ABI (simplified for frontend)
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
      { name: "expirationTime", type: "uint256" },
    ],
    name: "createLayeredOption",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "parentId", type: "uint256" },
      { name: "childStrike", type: "uint256" },
      { name: "childExpiry", type: "uint256" },
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
          { name: "creator", type: "address" },
          { name: "baseAsset", type: "address" },
          { name: "strikePrice", type: "uint256" },
          { name: "expirationTime", type: "uint256" },
          { name: "premium", type: "uint256" },
          { name: "isExercised", type: "bool" },
          { name: "parentId", type: "uint256" },
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
] as const;
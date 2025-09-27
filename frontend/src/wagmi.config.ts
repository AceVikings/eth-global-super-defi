import { http } from "viem";
import { defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Define Citrea testnet as proper Viem chain
export const citreaTestnet = defineChain({
  id: 5115,
  name: "Citrea Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Bitcoin",
    symbol: "cBTC",
  },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.citrea.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Citrea Explorer",
      url: "https://explorer.testnet.citrea.xyz",
    },
  },
  testnet: true,
});

// Configure wagmi to use ONLY Citrea testnet
export const config = getDefaultConfig({
  appName: "Super DeFi",
  projectId: "YOUR_PROJECT_ID", // Get from WalletConnect Cloud
  chains: [citreaTestnet], // Only Citrea testnet
  transports: {
    [citreaTestnet.id]: http("https://rpc.testnet.citrea.xyz"),
  },
  ssr: false,
});

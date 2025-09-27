import { http } from "viem";
import { mainnet, base } from "viem/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Define Citrea testnet
export const citreaTestnet = {
  id: 62298,
  name: "Citrea Testnet",
  network: "citrea-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Bitcoin",
    symbol: "cBTC",
  },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.citrea.xyz"] },
    public: { http: ["https://rpc.testnet.citrea.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Citrea Explorer",
      url: "https://explorer.testnet.citrea.xyz",
    },
  },
  testnet: true,
} as const;

// Define the chains we want to support
export const config = getDefaultConfig({
  appName: "Super DeFi",
  projectId: "YOUR_PROJECT_ID", // Get from WalletConnect Cloud
  chains: [mainnet, base, citreaTestnet],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [citreaTestnet.id]: http(),
  },
  ssr: false, // If your dApp uses server side rendering (SSR)
});

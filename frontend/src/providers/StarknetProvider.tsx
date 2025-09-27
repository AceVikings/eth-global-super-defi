import { StarknetConfig, publicProvider } from "@starknet-react/core";
import { mainnet, sepolia } from "@starknet-react/chains";
import type { ReactNode } from "react";

interface StarknetProviderProps {
  children: ReactNode;
}

export function StarknetProvider({ children }: StarknetProviderProps) {
  const chains = [mainnet, sepolia];
  const provider = publicProvider();

  return (
    <StarknetConfig chains={chains} provider={provider} autoConnect={true}>
      {children}
    </StarknetConfig>
  );
}

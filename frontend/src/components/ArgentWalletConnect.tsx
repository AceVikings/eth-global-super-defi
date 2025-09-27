import { useState, useCallback } from "react";
import { connect } from "@starknet-io/get-starknet";

interface StarknetWalletState {
  wallet: any | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
}

export const ArgentWalletConnect = () => {
  const [walletState, setWalletState] = useState<StarknetWalletState>({
    wallet: null,
    address: null,
    isConnected: false,
    isConnecting: false,
  });

  const handleConnect = useCallback(async () => {
    setWalletState((prev) => ({ ...prev, isConnecting: true }));

    try {
      // Connect to wallet using get-starknet
      const wallet = await connect({
        modalMode: "canAsk",
        modalTheme: "light",
      });

      if (!wallet) {
        console.log("No Starknet wallet found or connection cancelled.");
        setWalletState((prev) => ({ ...prev, isConnecting: false }));
        return;
      }

      // Request account access
      try {
        const accounts = await wallet.request({
          type: "wallet_requestAccounts",
          params: {},
        });

        if (accounts && accounts.length > 0) {
          const address = accounts[0];

          setWalletState({
            wallet,
            address,
            isConnected: true,
            isConnecting: false,
          });

          console.log("Argent wallet connected:", address);
        } else {
          console.log("No accounts found.");
          setWalletState((prev) => ({ ...prev, isConnecting: false }));
        }
      } catch (requestError) {
        console.error("Error requesting accounts:", requestError);
        setWalletState((prev) => ({ ...prev, isConnecting: false }));
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      setWalletState((prev) => ({ ...prev, isConnecting: false }));
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setWalletState({
      wallet: null,
      address: null,
      isConnected: false,
      isConnecting: false,
    });
  }, []);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (walletState.isConnected && walletState.address) {
    return (
      <div className="flex gap-2">
        <button
          className="menu-item"
          style={{
            background: "var(--soft-purple)",
            color: "var(--white)",
          }}
        >
          Argent
        </button>
        <button
          onClick={handleDisconnect}
          className="menu-item"
          style={{
            background: "var(--light-green)",
            color: "var(--charcoal)",
          }}
        >
          {formatAddress(walletState.address)}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={walletState.isConnecting}
      className="menu-item"
      style={{
        opacity: walletState.isConnecting ? 0.7 : 1,
        cursor: walletState.isConnecting ? "not-allowed" : "pointer",
      }}
    >
      {walletState.isConnecting ? "Connecting..." : "Connect Argent"}
    </button>
  );
};

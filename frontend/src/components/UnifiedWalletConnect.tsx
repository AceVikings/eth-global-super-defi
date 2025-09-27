import { useState } from "react";
import { CustomConnectButton } from "./CustomConnectButton";
import { ArgentWalletConnect } from "./ArgentWalletConnect";
import { useAccount as useEvmAccount } from "wagmi";

export const UnifiedWalletConnect = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"evm" | "starknet">("evm");

  const { isConnected: isEvmConnected } = useEvmAccount();
  // For now, we'll use a simple state to track Starknet connection
  // This could be improved with a context or state management solution
  const [isStarknetConnected] = useState(false);

  // If either wallet is connected, show the connected state
  if (isEvmConnected || isStarknetConnected) {
    return (
      <div className="flex gap-2">
        {isEvmConnected && <CustomConnectButton />}
        {isStarknetConnected && <ArgentWalletConnect />}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsModalOpen(!isModalOpen)}
        className="menu-item"
      >
        Connect Wallet
      </button>

      {isModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div className="dialogue-box min-w-96 max-w-md">
              <h2
                className="text-xl mb-6 text-center"
                style={{ color: "var(--warm-red)" }}
              >
                CONNECT WALLET
              </h2>

              {/* Tab Navigation */}
              <div className="flex mb-6 border-2 border-charcoal rounded-lg overflow-hidden">
                <button
                  onClick={() => setActiveTab("evm")}
                  className={`flex-1 py-3 px-4 text-sm font-bold transition-all ${
                    activeTab === "evm"
                      ? "bg-sky-blue text-white"
                      : "bg-light-gray text-charcoal hover:bg-cream"
                  }`}
                  style={{
                    backgroundColor:
                      activeTab === "evm"
                        ? "var(--sky-blue)"
                        : "var(--light-gray)",
                    color:
                      activeTab === "evm" ? "var(--white)" : "var(--charcoal)",
                  }}
                >
                  EVM CHAINS
                </button>
                <button
                  onClick={() => setActiveTab("starknet")}
                  className={`flex-1 py-3 px-4 text-sm font-bold transition-all ${
                    activeTab === "starknet"
                      ? "bg-soft-purple text-white"
                      : "bg-light-gray text-charcoal hover:bg-cream"
                  }`}
                  style={{
                    backgroundColor:
                      activeTab === "starknet"
                        ? "var(--soft-purple)"
                        : "var(--light-gray)",
                    color:
                      activeTab === "starknet"
                        ? "var(--white)"
                        : "var(--charcoal)",
                  }}
                >
                  STARKNET
                </button>
              </div>

              {/* Tab Content */}
              <div className="mb-6">
                {activeTab === "evm" ? (
                  <div>
                    <p
                      className="text-sm mb-4 text-center"
                      style={{ color: "var(--charcoal)" }}
                    >
                      Connect to Ethereum, Arbitrum, Polygon, Base, and Optimism
                    </p>
                    <div onClick={() => setIsModalOpen(false)}>
                      <CustomConnectButton />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p
                      className="text-sm mb-4 text-center"
                      style={{ color: "var(--charcoal)" }}
                    >
                      Connect to Starknet for advanced scaling and privacy
                    </p>
                    <div onClick={() => setIsModalOpen(false)}>
                      <ArgentWalletConnect />
                    </div>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="nintendo-button w-full"
              >
                CLOSE
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

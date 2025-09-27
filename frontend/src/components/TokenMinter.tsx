import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useSmartContracts } from "../services/smartContracts";

const TokenMinter = () => {
  const [mintAmount, setMintAmount] = useState("1000");
  const [selectedToken, setSelectedToken] = useState("stablecoin");
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balances, setBalances] = useState({
    stablecoin: "0",
    bitcoin: "0",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { address, isConnected } = useAccount();
  const {
    mintMockToken,
    getTokenBalance,
    initializeContracts,
    contracts,
    isOnCorrectChain,
  } = useSmartContracts();

  // Load balances on component mount and when address changes
  // Remove contracts from dependencies to prevent infinite loops
  useEffect(() => {
    if (isConnected && address && isOnCorrectChain()) {
      loadBalances();
    }
  }, [isConnected, address]); // Removed contracts dependency

  const loadBalances = async () => {
    // Prevent concurrent balance loading calls
    if (balanceLoading || !isConnected || !address || !contracts) {
      return;
    }

    setBalanceLoading(true);
    try {
      await initializeContracts();

      const [stablecoinBalance, bitcoinBalance] = await Promise.all([
        getTokenBalance(contracts.STABLE_COIN, address),
        getTokenBalance(contracts.BITCOIN_TOKEN, address),
      ]);

      setBalances({
        stablecoin: stablecoinBalance,
        bitcoin: bitcoinBalance,
      });
    } catch (err) {
      console.error("Failed to load balances:", err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleMint = async () => {
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await mintMockToken(
        selectedToken as "stablecoin" | "bitcoin",
        mintAmount
      );
      setSuccess(
        `Successfully minted ${mintAmount} ${
          selectedToken === "stablecoin" ? "USDC" : "BTC"
        } tokens!`
      );

      // Reload balances after successful mint
      setTimeout(() => {
        loadBalances();
      }, 1000);
    } catch (err: any) {
      console.error("Minting failed:", err);
      setError(err.message || "Failed to mint tokens");
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return "0";
    if (num < 0.0001) return "< 0.0001";
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  if (!isConnected) {
    return (
      <div className="game-card bg-white">
        <h3
          className="font-bold text-xl mb-4"
          style={{
            color: "var(--charcoal)",
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          MOCK TOKEN MINTER
        </h3>
        <p style={{ color: "var(--warm-red)" }}>
          Please connect your wallet to mint test tokens
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3
        className="font-bold text-xl mb-4"
        style={{
          color: "var(--charcoal)",
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        MOCK TOKEN MINTER
      </h3>

      <div className="space-y-4">
        {/* Current Balances */}
        <div className="game-card bg-white">
          <h4
            className="font-bold mb-2"
            style={{
              color: "var(--charcoal)",
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            Your Balances:
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div
              className="p-3 rounded"
              style={{
                background: "var(--light-green)",
                color: "var(--charcoal)",
              }}
            >
              <span>USDC:</span>
              <span className="ml-2 font-bold">
                {formatBalance(balances.stablecoin)}
              </span>
            </div>
            <div
              className="p-3 rounded"
              style={{
                background: "var(--sky-blue)",
                color: "var(--charcoal)",
              }}
            >
              <span>BTC:</span>
              <span className="ml-2 font-bold">
                {formatBalance(balances.bitcoin)}
              </span>
            </div>
          </div>
        </div>

        {/* Mint Interface */}
        <div className="game-card bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Token Selection */}
            <div>
              <label
                className="block font-bold mb-2"
                style={{
                  color: "var(--charcoal)",
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                Select Token:
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="pixel-input"
              >
                <option value="stablecoin">USDC (StableCoin)</option>
                <option value="bitcoin">BTC (BitcoinToken)</option>
              </select>
            </div>

            {/* Amount Input */}
            <div>
              <label
                className="block font-bold mb-2"
                style={{
                  color: "var(--charcoal)",
                  fontFamily: "'Press Start 2P', monospace",
                }}
              >
                Amount to Mint:
              </label>
              <input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder="1000"
                min="0"
                step="0.01"
                className="pixel-input"
              />
            </div>
          </div>

          {/* Mint Button */}
          <button
            onClick={handleMint}
            disabled={loading || !mintAmount}
            className={`nintendo-button-primary w-full mt-4 disabled:opacity-50`}
          >
            {loading
              ? "MINTING..."
              : `MINT ${mintAmount} ${
                  selectedToken === "stablecoin" ? "USDC" : "BTC"
                }`}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div
            className="bg-red-100 border-2 border-red-400 p-3 rounded"
            style={{ color: "var(--warm-red)" }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="bg-green-100 border-2 border-green-400 p-3 rounded"
            style={{ color: "var(--light-green)" }}
          >
            {success}
          </div>
        )}

        {/* Instructions */}
        <div
          className="p-3 rounded border-2"
          style={{
            background: "var(--cream)",
            borderColor: "var(--border-gray)",
            color: "var(--charcoal)",
          }}
        >
          <strong>Instructions:</strong> These are test tokens for the Citrea
          testnet. Mint USDC for collateral and premiums, mint BTC to create
          options contracts. You'll need both tokens to fully test the options
          trading functionality.
        </div>
      </div>
    </div>
  );
};

export default TokenMinter;

import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts/config';

const PRICE_FEED_ABI = [
  {
    inputs: [{ name: "_price", type: "int256" }],
    name: "updateAnswer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "description",
    outputs: [{ name: "", type: "string" }],
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
] as const;

interface PriceUpdateComponentProps {
  className?: string;
}

export const PriceUpdateComponent: React.FC<PriceUpdateComponentProps> = ({ className = '' }) => {
  const [btcPrice, setBtcPrice] = useState('92000');
  const [ethPrice, setEthPrice] = useState('2500');
  const [currentBtcPrice, setCurrentBtcPrice] = useState<string>('');
  const [currentEthPrice, setCurrentEthPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Load current prices
  const loadCurrentPrices = async () => {
    if (!publicClient) return;

    try {
      const [btcResult, ethResult] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.BTC_PRICE_FEED,
          abi: PRICE_FEED_ABI,
          functionName: 'latestAnswer',
        }),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.ETH_PRICE_FEED,
          abi: PRICE_FEED_ABI,
          functionName: 'latestAnswer',
        }),
      ]);

      // Convert from int256 with 8 decimals to readable format
      setCurrentBtcPrice(formatUnits(btcResult as bigint, 8));
      setCurrentEthPrice(formatUnits(ethResult as bigint, 8));
    } catch (err: any) {
      console.error('Error loading current prices:', err);
    }
  };

  useEffect(() => {
    loadCurrentPrices();
    // Refresh prices every 10 seconds
    const interval = setInterval(loadCurrentPrices, 10000);
    return () => clearInterval(interval);
  }, [publicClient]);

  const updatePrice = async (asset: 'BTC' | 'ETH', price: string) => {
    if (!walletClient || !address || !isConnected) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const priceValue = parseFloat(price);
      if (isNaN(priceValue) || priceValue <= 0) {
        throw new Error('Invalid price value');
      }

      // Convert to 8 decimal format for price feeds
      const priceWithDecimals = parseUnits(price, 8);
      const contractAddress = asset === 'BTC' ? CONTRACT_ADDRESSES.BTC_PRICE_FEED : CONTRACT_ADDRESSES.ETH_PRICE_FEED;

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: PRICE_FEED_ABI,
        functionName: 'updateAnswer',
        args: [priceWithDecimals],
      });

      console.log(`${asset} price update transaction:`, hash);

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setSuccess(`${asset} price updated to $${price} successfully!`);
      
      // Refresh current prices
      setTimeout(loadCurrentPrices, 2000);

    } catch (err: any) {
      console.error(`Error updating ${asset} price:`, err);
      setError(err.message || `Failed to update ${asset} price`);
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <div className={className}>
      <div className="terminal-panel">
        <div className="mb-6">
          <h3 className="text-lg font-mono font-bold mb-2 uppercase tracking-wider" 
              style={{ color: "var(--retro-green)" }}>
            [ORACLE PRICE CONTROL]
          </h3>
          <p className="font-mono text-xs leading-relaxed" style={{ color: "var(--retro-off-white)" }}>
            &gt; UPDATE BTC AND ETH PRICES FOR DEMO PURPOSES
            <br />
            &gt; AFFECTS ALL OPTION PRICING CALCULATIONS
          </p>
        </div>

        <div className="mb-6">
          {/* Current Prices Display */}
          <div className="grid grid-cols-2 gap-4 terminal-window p-4 mb-6">
            <div className="text-center">
              <div className="text-xs font-mono mb-1 uppercase tracking-wide" style={{ color: "var(--retro-amber)" }}>
                CURRENT BTC PRICE
              </div>
              <div className="text-xl font-mono font-bold" style={{ color: "var(--retro-green)" }}>
                ${currentBtcPrice ? Number(currentBtcPrice).toLocaleString() : '...'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-mono mb-1 uppercase tracking-wide" style={{ color: "var(--retro-amber)" }}>
                CURRENT ETH PRICE
              </div>
              <div className="text-xl font-mono font-bold" style={{ color: "var(--retro-green)" }}>
                ${currentEthPrice ? Number(currentEthPrice).toLocaleString() : '...'}
              </div>
            </div>
          </div>

          {/* BTC Price Update */}
          <div className="mb-4">
            <label className="block text-sm font-mono mb-2 uppercase tracking-wide" 
                   style={{ color: "var(--retro-amber)" }}>
              Bitcoin (BTC) Price (USD)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={btcPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBtcPrice(e.target.value)}
                placeholder="92000"
                min="1"
                step="1000"
                className="retro-input flex-1 px-3 py-2 font-mono text-sm"
              />
              <button 
                onClick={() => updatePrice('BTC', btcPrice)}
                disabled={loading || !isConnected}
                className={loading || !isConnected ? 
                  "retro-button-secondary px-4 py-2 font-mono text-sm opacity-50 cursor-not-allowed" : 
                  "retro-button-primary px-4 py-2 font-mono text-sm"}
              >
                {loading ? 'UPDATING...' : 'UPDATE BTC'}
              </button>
            </div>
          </div>

          {/* ETH Price Update */}
          <div className="mb-4">
            <label className="block text-sm font-mono mb-2 uppercase tracking-wide" 
                   style={{ color: "var(--retro-amber)" }}>
              Ethereum (ETH) Price (USD)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={ethPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEthPrice(e.target.value)}
                placeholder="2500"
                min="1"
                step="100"
                className="retro-input flex-1 px-3 py-2 font-mono text-sm"
              />
              <button 
                onClick={() => updatePrice('ETH', ethPrice)}
                disabled={loading || !isConnected}
                className={loading || !isConnected ? 
                  "retro-button-secondary px-4 py-2 font-mono text-sm opacity-50 cursor-not-allowed" : 
                  "retro-button-primary px-4 py-2 font-mono text-sm"}
              >
                {loading ? 'UPDATING...' : 'UPDATE ETH'}
              </button>
            </div>
          </div>

          {/* Quick Price Presets */}
          <div className="mb-4">
            <label className="block text-sm font-mono mb-3 uppercase tracking-wide" 
                   style={{ color: "var(--retro-amber)" }}>
              Quick Price Scenarios
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-mono mb-2 uppercase" style={{ color: "var(--retro-green)" }}>
                  BTC SCENARIOS
                </div>
                <div className="flex gap-1 flex-wrap">
                  <button 
                    onClick={() => setBtcPrice('85000')}
                    className="retro-button-secondary px-2 py-1 font-mono text-xs"
                  >
                    $85K
                  </button>
                  <button 
                    onClick={() => setBtcPrice('100000')}
                    className="retro-button-secondary px-2 py-1 font-mono text-xs"
                  >
                    $100K
                  </button>
                  <button 
                    onClick={() => setBtcPrice('110000')}
                    className="retro-button-secondary px-2 py-1 font-mono text-xs"
                  >
                    $110K
                  </button>
                </div>
              </div>
              <div>
                <div className="text-sm font-mono mb-2 uppercase" style={{ color: "var(--retro-green)" }}>
                  ETH SCENARIOS
                </div>
                <div className="flex gap-1 flex-wrap">
                  <button 
                    onClick={() => setEthPrice('2000')}
                    className="retro-button-secondary px-2 py-1 font-mono text-xs"
                  >
                    $2K
                  </button>
                  <button 
                    onClick={() => setEthPrice('3000')}
                    className="retro-button-secondary px-2 py-1 font-mono text-xs"
                  >
                    $3K
                  </button>
                  <button 
                    onClick={() => setEthPrice('3500')}
                    className="retro-button-secondary px-2 py-1 font-mono text-xs"
                  >
                    $3.5K
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="terminal-window p-3 mb-4 border-retro-red">
              <div className="font-mono text-sm" style={{ color: "var(--retro-red)" }}>
                [ERROR] {error}
              </div>
            </div>
          )}

          {success && (
            <div className="terminal-window p-3 mb-4 border-retro-green">
              <div className="font-mono text-sm" style={{ color: "var(--retro-green)" }}>
                [SUCCESS] {success}
              </div>
            </div>
          )}

          {!isConnected && (
            <div className="terminal-window p-3 border-retro-amber">
              <div className="font-mono text-sm" style={{ color: "var(--retro-amber)" }}>
                [WARNING] CONNECT YOUR WALLET TO UPDATE ORACLE PRICES
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceUpdateComponent;
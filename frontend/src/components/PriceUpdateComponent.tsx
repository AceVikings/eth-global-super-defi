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

  const cardStyle: React.CSSProperties = {
    border: '1px solid var(--retro-border)',
    borderRadius: '0',
    padding: '24px',
    backgroundColor: 'var(--retro-black)',
    boxShadow: 'inset 2px 2px 5px rgba(0, 0, 0, 0.5)',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: 'var(--retro-dark-gray)',
    color: 'var(--retro-off-white)',
    padding: '8px 16px',
    borderRadius: '0',
    border: '1px solid var(--retro-border)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'normal',
    fontFamily: 'Courier New, monospace',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'var(--retro-light-gray)',
    cursor: 'not-allowed',
    opacity: 0.6,
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid var(--retro-border)',
    borderRadius: '0',
    fontSize: '14px',
    flex: 1,
    background: 'var(--retro-dark-gray)',
    color: 'var(--retro-off-white)',
    fontFamily: 'Courier New, monospace',
  };

  return (
    <div className={className}>
      <div style={cardStyle}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Courier New, monospace', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--retro-green)' }}>
            [ORACLE PRICE CONTROL]
          </h3>
          <p style={{ color: 'var(--retro-off-white)', fontSize: '12px', lineHeight: '1.4', fontFamily: 'Courier New, monospace' }}>
            &gt; UPDATE BTC AND ETH PRICES FOR DEMO PURPOSES
            <br />
            &gt; AFFECTS ALL OPTION PRICING CALCULATIONS
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          {/* Current Prices Display */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', backgroundColor: 'var(--retro-dark-gray)', border: '1px solid var(--retro-border)', marginBottom: '24px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--retro-amber)', marginBottom: '4px', fontFamily: 'Courier New, monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>CURRENT BTC PRICE</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--retro-green)', fontFamily: 'Courier New, monospace' }}>
                ${currentBtcPrice ? Number(currentBtcPrice).toLocaleString() : '...'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--retro-amber)', marginBottom: '4px', fontFamily: 'Courier New, monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>CURRENT ETH PRICE</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--retro-green)', fontFamily: 'Courier New, monospace' }}>
                ${currentEthPrice ? Number(currentEthPrice).toLocaleString() : '...'}
              </div>
            </div>
          </div>

          {/* BTC Price Update */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Bitcoin (BTC) Price (USD)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={btcPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBtcPrice(e.target.value)}
                placeholder="92000"
                min="1"
                step="1000"
                style={inputStyle}
              />
              <button 
                onClick={() => updatePrice('BTC', btcPrice)}
                disabled={loading || !isConnected}
                style={loading || !isConnected ? buttonDisabledStyle : buttonStyle}
              >
                {loading ? 'Updating...' : 'Update BTC'}
              </button>
            </div>
          </div>

          {/* ETH Price Update */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Ethereum (ETH) Price (USD)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="number"
                value={ethPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEthPrice(e.target.value)}
                placeholder="2500"
                min="1"
                step="100"
                style={inputStyle}
              />
              <button 
                onClick={() => updatePrice('ETH', ethPrice)}
                disabled={loading || !isConnected}
                style={loading || !isConnected ? buttonDisabledStyle : buttonStyle}
              >
                {loading ? 'Updating...' : 'Update ETH'}
              </button>
            </div>
          </div>

          {/* Quick Price Presets */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
              Quick Price Scenarios
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>BTC Scenarios</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setBtcPrice('85000')}
                    style={{ ...buttonStyle, backgroundColor: '#ef4444', fontSize: '12px', padding: '4px 8px' }}
                  >
                    📉 $85K
                  </button>
                  <button 
                    onClick={() => setBtcPrice('100000')}
                    style={{ ...buttonStyle, backgroundColor: '#10b981', fontSize: '12px', padding: '4px 8px' }}
                  >
                    📈 $100K
                  </button>
                  <button 
                    onClick={() => setBtcPrice('110000')}
                    style={{ ...buttonStyle, backgroundColor: '#8b5cf6', fontSize: '12px', padding: '4px 8px' }}
                  >
                    🚀 $110K
                  </button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>ETH Scenarios</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setEthPrice('2000')}
                    style={{ ...buttonStyle, backgroundColor: '#ef4444', fontSize: '12px', padding: '4px 8px' }}
                  >
                    📉 $2K
                  </button>
                  <button 
                    onClick={() => setEthPrice('3000')}
                    style={{ ...buttonStyle, backgroundColor: '#10b981', fontSize: '12px', padding: '4px 8px' }}
                  >
                    📈 $3K
                  </button>
                  <button 
                    onClick={() => setEthPrice('3500')}
                    style={{ ...buttonStyle, backgroundColor: '#8b5cf6', fontSize: '12px', padding: '4px 8px' }}
                  >
                    🚀 $3.5K
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ color: '#dc2626', fontSize: '14px' }}>{error}</div>
            </div>
          )}

          {success && (
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ color: '#16a34a', fontSize: '14px' }}>{success}</div>
            </div>
          )}

          {!isConnected && (
            <div style={{ padding: '12px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px' }}>
              <div style={{ color: '#0369a1', fontSize: '14px' }}>
                Connect your wallet to update oracle prices
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceUpdateComponent;
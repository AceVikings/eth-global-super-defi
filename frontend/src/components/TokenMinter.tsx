import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSmartContracts } from '../services/smartContracts';

const TokenMinter = () => {
  const [mintAmount, setMintAmount] = useState('1000');
  const [selectedToken, setSelectedToken] = useState('stablecoin');
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState({
    stablecoin: '0',
    bitcoin: '0'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { address, isConnected } = useAccount();
  const {
    mintMockToken,
    getTokenBalance,
    initializeContracts,
    contracts
  } = useSmartContracts();

  // Load balances on component mount and when address changes
  useEffect(() => {
    if (isConnected && address && contracts) {
      loadBalances();
    }
  }, [isConnected, address, contracts]);

  const loadBalances = async () => {
    try {
      await initializeContracts();
      
      const [stablecoinBalance, bitcoinBalance] = await Promise.all([
        getTokenBalance(contracts.STABLE_COIN, address),
        getTokenBalance(contracts.BITCOIN_TOKEN, address)
      ]);

      setBalances({
        stablecoin: stablecoinBalance,
        bitcoin: bitcoinBalance
      });
    } catch (err) {
      console.error('Failed to load balances:', err);
    }
  };

  const handleMint = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const receipt = await mintMockToken(selectedToken, mintAmount);
      setSuccess(`Successfully minted ${mintAmount} ${selectedToken === 'stablecoin' ? 'USDC' : 'BTC'} tokens!`);
      
      // Reload balances after successful mint
      setTimeout(() => {
        loadBalances();
      }, 1000);
      
    } catch (err) {
      console.error('Minting failed:', err);
      setError(err.message || 'Failed to mint tokens');
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance) => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  if (!isConnected) {
    return (
      <div className="bg-red-900 border-4 border-red-600 p-6 rounded-lg font-mono">
        <h3 className="text-yellow-400 font-bold text-xl mb-4 font-mono">
          🚀 MOCK TOKEN MINTER 🚀
        </h3>
        <p className="text-red-300">
          Please connect your wallet to mint test tokens
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-900 border-4 border-blue-600 p-6 rounded-lg font-mono">
      <h3 className="text-yellow-400 font-bold text-xl mb-4 font-mono">
        🪙 MOCK TOKEN MINTER 🪙
      </h3>
      
      <div className="space-y-4">
        {/* Current Balances */}
        <div className="bg-blue-800 p-4 rounded border-2 border-blue-500">
          <h4 className="text-white font-bold mb-2">Your Balances:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-green-700 p-2 rounded">
              <span className="text-green-200">USDC:</span>
              <span className="text-white ml-2 font-bold">
                {formatBalance(balances.stablecoin)}
              </span>
            </div>
            <div className="bg-orange-700 p-2 rounded">
              <span className="text-orange-200">BTC:</span>
              <span className="text-white ml-2 font-bold">
                {formatBalance(balances.bitcoin)}
              </span>
            </div>
          </div>
        </div>

        {/* Mint Interface */}
        <div className="bg-blue-800 p-4 rounded border-2 border-blue-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Token Selection */}
            <div>
              <label className="block text-white font-bold mb-2">
                Select Token:
              </label>
              <select 
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full bg-blue-700 text-white p-2 rounded border border-blue-500 font-mono"
              >
                <option value="stablecoin">USDC (StableCoin)</option>
                <option value="bitcoin">BTC (BitcoinToken)</option>
              </select>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-white font-bold mb-2">
                Amount to Mint:
              </label>
              <input
                type="number"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder="1000"
                min="0"
                step="0.01"
                className="w-full bg-blue-700 text-white p-2 rounded border border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Mint Button */}
          <button
            onClick={handleMint}
            disabled={loading || !mintAmount}
            className={`w-full mt-4 py-3 px-4 rounded font-bold transition-all duration-200 ${
              loading || !mintAmount
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500 text-white transform hover:scale-105 shadow-lg'
            }`}
          >
            {loading ? 'MINTING...' : `🎯 MINT ${mintAmount} ${selectedToken === 'stablecoin' ? 'USDC' : 'BTC'}`}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-800 p-3 rounded border-2 border-red-500 text-red-200">
            ❌ {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-800 p-3 rounded border-2 border-green-500 text-green-200">
            ✅ {success}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-yellow-800 p-3 rounded border-2 border-yellow-500 text-yellow-200 text-sm">
          <strong>💡 Instructions:</strong> These are test tokens for the Citrea testnet. 
          Mint USDC for collateral and premiums, mint BTC to create options contracts. 
          You'll need both tokens to fully test the options trading functionality.
        </div>
      </div>
    </div>
  );
};

export default TokenMinter;
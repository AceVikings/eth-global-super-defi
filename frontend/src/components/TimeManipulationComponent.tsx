import React, { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../contracts/config';

const TIME_ORACLE_ABI = [
  {
    inputs: [{ name: "_currentTime", type: "uint256" }],
    name: "setCurrentTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getCurrentTime",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_seconds", type: "uint256" }],
    name: "increaseTime",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

interface TimeManipulationComponentProps {
  className?: string;
}

export const TimeManipulationComponent: React.FC<TimeManipulationComponentProps> = ({ className = '' }) => {
  const [currentOracleTime, setCurrentOracleTime] = useState<string>('');
  const [targetDateTime, setTargetDateTime] = useState('');
  const [timeIncrement, setTimeIncrement] = useState('3600'); // 1 hour in seconds
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Load current oracle time
  const loadCurrentTime = async () => {
    if (!publicClient) return;

    try {
      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.TIME_ORACLE,
        abi: TIME_ORACLE_ABI,
        functionName: 'getCurrentTime',
      });

      const timestamp = Number(result);
      const date = new Date(timestamp * 1000);
      setCurrentOracleTime(date.toLocaleString());
    } catch (err: any) {
      console.error('Error loading current time:', err);
      setCurrentOracleTime('Error loading time');
    }
  };

  useEffect(() => {
    loadCurrentTime();
    // Refresh time every 5 seconds
    const interval = setInterval(loadCurrentTime, 5000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // Set current system time as default when component mounts
  useEffect(() => {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setTargetDateTime(localDateTime);
  }, []);

  const setOracleTime = async (timestamp: number) => {
    if (!walletClient || !address || !isConnected) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.TIME_ORACLE,
        abi: TIME_ORACLE_ABI,
        functionName: 'setCurrentTime',
        args: [BigInt(timestamp)],
      });

      console.log('Time oracle update transaction:', hash);

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      const date = new Date(timestamp * 1000);
      setSuccess(`Oracle time updated to ${date.toLocaleString()} successfully!`);
      
      // Refresh current time
      setTimeout(loadCurrentTime, 2000);

    } catch (err: any) {
      console.error('Error updating oracle time:', err);
      setError(err.message || 'Failed to update oracle time');
    } finally {
      setLoading(false);
    }
  };

  const increaseTime = async (seconds: number) => {
    if (!walletClient || !address || !isConnected) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.TIME_ORACLE,
        abi: TIME_ORACLE_ABI,
        functionName: 'increaseTime',
        args: [BigInt(seconds)],
      });

      console.log('Time increase transaction:', hash);

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      setSuccess(`Oracle time increased by ${hours}h ${minutes}m successfully!`);
      
      // Refresh current time
      setTimeout(loadCurrentTime, 2000);

    } catch (err: any) {
      console.error('Error increasing oracle time:', err);
      setError(err.message || 'Failed to increase oracle time');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDateTime = () => {
    if (!targetDateTime) {
      setError('Please select a date and time');
      return;
    }

    const timestamp = Math.floor(new Date(targetDateTime).getTime() / 1000);
    setOracleTime(timestamp);
  };

  const handleIncreaseTime = () => {
    const seconds = parseInt(timeIncrement);
    if (isNaN(seconds) || seconds <= 0) {
      setError('Please enter a valid time increment in seconds');
      return;
    }
    increaseTime(seconds);
  };

  return (
    <div className={className}>
      <div className="terminal-panel">
        <div className="mb-6">
          <h3 className="text-2xl font-mono font-bold mb-2 uppercase tracking-wider" 
              style={{ color: "var(--retro-amber)" }}>
            [TIME ORACLE CONTROL]
          </h3>
          <p className="font-mono text-sm leading-relaxed" style={{ color: "var(--retro-off-white)" }}>
            MANIPULATE TIME FOR DEMO PURPOSES. THIS AFFECTS OPTION EXPIRY CALCULATIONS 
            AND ALLOWS TESTING OF TIME-DEPENDENT FEATURES.
          </p>
        </div>

        <div className="mb-6">
          {/* Current Oracle Time Display */}
          <div className="terminal-window p-4 mb-6 text-center border-retro-green">
            <div className="text-sm font-mono mb-2 uppercase tracking-wide" style={{ color: "var(--retro-amber)" }}>
              CURRENT ORACLE TIME
            </div>
            <div className="text-2xl font-mono font-bold" style={{ color: "var(--retro-green)" }}>
              {currentOracleTime || 'LOADING...'}
            </div>
            <div className="text-xs font-mono mt-1" style={{ color: "var(--retro-off-white)" }}>
              REAL TIME: {new Date().toLocaleString()}
            </div>
          </div>

          {/* Set Specific DateTime */}
          <div className="mb-5">
            <label className="block text-sm font-mono mb-2 uppercase tracking-wide" 
                   style={{ color: "var(--retro-amber)" }}>
              Set Oracle to Specific Date & Time
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="datetime-local"
                value={targetDateTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetDateTime(e.target.value)}
                className="retro-input flex-1 px-3 py-2 font-mono text-sm"
              />
              <button 
                onClick={handleSetDateTime}
                disabled={loading || !isConnected}
                className={loading || !isConnected ? 
                  "retro-button-secondary px-4 py-2 font-mono text-sm opacity-50 cursor-not-allowed" : 
                  "retro-button-primary px-4 py-2 font-mono text-sm"}
              >
                {loading ? 'SETTING...' : 'SET TIME'}
              </button>
            </div>
          </div>

          {/* Increase Time */}
          <div className="mb-5">
            <label className="block text-sm font-mono mb-2 uppercase tracking-wide" 
                   style={{ color: "var(--retro-amber)" }}>
              Increase Oracle Time (Seconds)
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={timeIncrement}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeIncrement(e.target.value)}
                placeholder="3600"
                min="1"
                className="retro-input flex-1 px-3 py-2 font-mono text-sm"
              />
              <button 
                onClick={handleIncreaseTime}
                disabled={loading || !isConnected}
                className={loading || !isConnected ? 
                  "retro-button-secondary px-4 py-2 font-mono text-sm opacity-50 cursor-not-allowed" : 
                  "retro-button-primary px-4 py-2 font-mono text-sm"}
              >
                {loading ? 'INCREASING...' : 'INCREASE TIME'}
              </button>
            </div>
          </div>

          {/* Quick Time Actions */}
          <div className="mb-5">
            <label className="block text-sm font-mono mb-3 uppercase tracking-wide" 
                   style={{ color: "var(--retro-amber)" }}>
              Quick Time Actions
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <button 
                onClick={() => {
                  const now = Math.floor(Date.now() / 1000);
                  setOracleTime(now);
                }}
                disabled={loading || !isConnected}
                className={loading || !isConnected ? 
                  "retro-button-secondary px-3 py-2 font-mono text-xs opacity-50 cursor-not-allowed" : 
                  "retro-button-secondary px-3 py-2 font-mono text-xs"}
              >
                SET TO NOW
              </button>
              <button 
                onClick={() => increaseTime(3600)} // 1 hour
                disabled={loading || !isConnected}
                className={loading || !isConnected ? 
                  "retro-button-secondary px-3 py-2 font-mono text-xs opacity-50 cursor-not-allowed" : 
                  "retro-button-secondary px-3 py-2 font-mono text-xs"}
              >
                +1 HOUR
              </button>
              <button 
                onClick={() => increaseTime(86400)} // 1 day
                disabled={loading || !isConnected}
                className={loading || !isConnected ? 
                  "retro-button-secondary px-3 py-2 font-mono text-xs opacity-50 cursor-not-allowed" : 
                  "retro-button-secondary px-3 py-2 font-mono text-xs"}
              >
                +1 DAY
              </button>
              <button 
                onClick={() => increaseTime(604800)} // 1 week
                disabled={loading || !isConnected}
                className={loading || !isConnected ? 
                  "retro-button-secondary px-3 py-2 font-mono text-xs opacity-50 cursor-not-allowed" : 
                  "retro-button-secondary px-3 py-2 font-mono text-xs"}
              >
                +1 WEEK
              </button>
              <button 
                onClick={() => increaseTime(2592000)} // 30 days
                disabled={loading || !isConnected}
                className={loading || !isConnected ? 
                  "retro-button-secondary px-3 py-2 font-mono text-xs opacity-50 cursor-not-allowed" : 
                  "retro-button-secondary px-3 py-2 font-mono text-xs"}
              >
                +30 DAYS
              </button>
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
                [WARNING] CONNECT YOUR WALLET TO CONTROL ORACLE TIME
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeManipulationComponent;
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

  const cardStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '24px',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  };

  const buttonDisabledStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    flex: 1,
  };

  return (
    <div className={className}>
      <div style={cardStyle}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🕐 Time Oracle Control
          </h3>
          <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.4' }}>
            Manipulate time for demo purposes. This affects option expiry calculations and allows testing of time-dependent features.
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          {/* Current Oracle Time Display */}
          <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#0369a1', marginBottom: '8px' }}>Current Oracle Time</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>
              {currentOracleTime || 'Loading...'}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Real Time: {new Date().toLocaleString()}
            </div>
          </div>

          {/* Set Specific DateTime */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Set Oracle to Specific Date & Time
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="datetime-local"
                value={targetDateTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetDateTime(e.target.value)}
                style={{ ...inputStyle, minWidth: '200px' }}
              />
              <button 
                onClick={handleSetDateTime}
                disabled={loading || !isConnected}
                style={loading || !isConnected ? buttonDisabledStyle : buttonStyle}
              >
                {loading ? 'Setting...' : 'Set Time'}
              </button>
            </div>
          </div>

          {/* Increase Time */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Increase Oracle Time (seconds)
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                value={timeIncrement}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimeIncrement(e.target.value)}
                placeholder="3600"
                min="1"
                style={inputStyle}
              />
              <button 
                onClick={handleIncreaseTime}
                disabled={loading || !isConnected}
                style={loading || !isConnected ? buttonDisabledStyle : buttonStyle}
              >
                {loading ? 'Increasing...' : 'Increase Time'}
              </button>
            </div>
          </div>

          {/* Quick Time Actions */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
              Quick Time Actions
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => {
                  const now = Math.floor(Date.now() / 1000);
                  setOracleTime(now);
                }}
                disabled={loading || !isConnected}
                style={loading || !isConnected ? { ...buttonStyle, backgroundColor: '#10b981', opacity: 0.6 } : { ...buttonStyle, backgroundColor: '#10b981' }}
              >
                🕐 Set to Now
              </button>
              <button 
                onClick={() => increaseTime(3600)} // 1 hour
                disabled={loading || !isConnected}
                style={loading || !isConnected ? { ...buttonStyle, backgroundColor: '#f59e0b', opacity: 0.6 } : { ...buttonStyle, backgroundColor: '#f59e0b' }}
              >
                +1 Hour
              </button>
              <button 
                onClick={() => increaseTime(86400)} // 1 day
                disabled={loading || !isConnected}
                style={loading || !isConnected ? { ...buttonStyle, backgroundColor: '#f59e0b', opacity: 0.6 } : { ...buttonStyle, backgroundColor: '#f59e0b' }}
              >
                +1 Day
              </button>
              <button 
                onClick={() => increaseTime(604800)} // 1 week
                disabled={loading || !isConnected}
                style={loading || !isConnected ? { ...buttonStyle, backgroundColor: '#ef4444', opacity: 0.6 } : { ...buttonStyle, backgroundColor: '#ef4444' }}
              >
                +1 Week
              </button>
              <button 
                onClick={() => increaseTime(2592000)} // 30 days
                disabled={loading || !isConnected}
                style={loading || !isConnected ? { ...buttonStyle, backgroundColor: '#ef4444', opacity: 0.6 } : { ...buttonStyle, backgroundColor: '#ef4444' }}
              >
                +30 Days
              </button>
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
                Connect your wallet to control oracle time
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeManipulationComponent;
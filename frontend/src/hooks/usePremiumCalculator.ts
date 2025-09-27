import { useState, useEffect, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts/config';

const PRICE_FEED_ABI = [
  {
    inputs: [],
    name: "latestAnswer",
    outputs: [{ name: "", type: "int256" }],
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

export interface PriceData {
  btcPrice: string;
  ethPrice: string;
  loading: boolean;
  error: string | null;
}

export interface PremiumCalculationParams {
  baseAsset: string;
  strikePrice: string;
  expirationDate: Date;
  optionType: 'CALL' | 'PUT';
}

// Simple Black-Scholes-inspired premium calculation
// This is a simplified model for demo purposes
function calculatePremium(
  currentPrice: number,
  strikePrice: number,
  timeToExpiry: number, // in years
  optionType: 'CALL' | 'PUT'
): number {
  if (timeToExpiry <= 0) return 0;

  // Basic intrinsic value
  const intrinsicValue = optionType === 'CALL' 
    ? Math.max(0, currentPrice - strikePrice)
    : Math.max(0, strikePrice - currentPrice);

  // Time value calculation (simplified)
  const volatility = 0.25; // 25% assumed volatility
  
  // Simplified time value calculation
  const timeValue = currentPrice * volatility * Math.sqrt(timeToExpiry) * 0.4;
  
  // For PUT options, adjust the time value calculation
  const adjustedTimeValue = optionType === 'PUT' 
    ? timeValue * (strikePrice / currentPrice)
    : timeValue;

  const totalPremium = intrinsicValue + adjustedTimeValue;

  // Minimum premium to prevent zero values
  const minPremium = currentPrice * 0.001; // 0.1% of current price
  
  return Math.max(totalPremium, minPremium);
}

export function usePremiumCalculator(refreshInterval: number = 30000) {
  const [priceData, setPriceData] = useState<PriceData>({
    btcPrice: '0',
    ethPrice: '0',
    loading: true,
    error: null,
  });

  const publicClient = usePublicClient();

  // Fetch current prices from price feeds
  const loadCurrentPrices = async () => {
    if (!publicClient) return;

    try {
      setPriceData(prev => ({ ...prev, loading: true, error: null }));

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
      const btcPrice = formatUnits(btcResult as bigint, 8);
      const ethPrice = formatUnits(ethResult as bigint, 8);

      setPriceData({
        btcPrice,
        ethPrice,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Error loading current prices:', err);
      setPriceData(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch prices',
      }));
    }
  };

  // Auto-refresh prices
  useEffect(() => {
    loadCurrentPrices();
    
    const interval = setInterval(loadCurrentPrices, refreshInterval);
    
    return () => clearInterval(interval);
  }, [publicClient, refreshInterval]);

  // Calculate premium based on current market conditions
  const calculateOptionPremium = useMemo(() => {
    return (params: PremiumCalculationParams): { premium: string; loading: boolean; error: string | null } => {
      if (priceData.loading) {
        return { premium: '0', loading: true, error: null };
      }

      if (priceData.error) {
        return { premium: '0', loading: false, error: priceData.error };
      }

      try {
        // Determine current asset price
        let currentPrice: number;
        
        if (params.baseAsset === CONTRACT_ADDRESSES.MOCK_WBTC) {
          currentPrice = parseFloat(priceData.btcPrice);
        } else if (params.baseAsset === CONTRACT_ADDRESSES.MOCK_WETH) {
          currentPrice = parseFloat(priceData.ethPrice);
        } else {
          // For USDC or other assets, use a different approach
          // For PUT options on USDC, we might use BTC price as reference
          currentPrice = parseFloat(priceData.btcPrice);
        }

        if (isNaN(currentPrice) || currentPrice <= 0) {
          return { premium: '0', loading: false, error: 'Invalid current price' };
        }

        const strikePrice = parseFloat(params.strikePrice);
        if (isNaN(strikePrice) || strikePrice <= 0) {
          return { premium: '0', loading: false, error: 'Invalid strike price' };
        }

        // Calculate time to expiry in years
        const now = new Date();
        const timeToExpiryMs = params.expirationDate.getTime() - now.getTime();
        const timeToExpiry = Math.max(0, timeToExpiryMs / (365.25 * 24 * 60 * 60 * 1000));

        const premium = calculatePremium(currentPrice, strikePrice, timeToExpiry, params.optionType);
        
        // Convert to USDC terms (simplified - assuming 1:1 for now)
        // In a real system, you'd convert using current exchange rates
        const premiumInUSDC = premium * (currentPrice / 100000); // Scale appropriately
        
        return { 
          premium: Math.max(premiumInUSDC, 1).toFixed(2), // Minimum 1 USDC
          loading: false, 
          error: null 
        };
      } catch (err: any) {
        console.error('Error calculating premium:', err);
        return { premium: '0', loading: false, error: err.message || 'Calculation error' };
      }
    };
  }, [priceData]);

  return {
    priceData,
    calculateOptionPremium,
    refreshPrices: loadCurrentPrices,
  };
}
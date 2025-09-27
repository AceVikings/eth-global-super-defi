const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface LayeredOptionAPI {
  tokenId: string;
  creator: string;
  baseAsset: string;
  strikePrice: string;
  expirationTime: string;
  premium: string;
  parentId: string;
  isExercised: boolean;
  isParent: boolean;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  formattedStrike: string;
  formattedPremium: string;
  expirationDate: string;
  isExpired: boolean;
  balance?: number;
  exerciser?: string;
  payout?: string;
  formattedPayout?: string;
}

export interface TransactionAPI {
  type:
    | "OPTION_CREATED"
    | "CHILD_OPTION_CREATED"
    | "OPTION_EXERCISED"
    | "OPTION_TRANSFERRED";
  tokenId: string;
  timestamp: number;
  transactionHash: string;
  creator?: string;
  parentId?: string;
  exerciser?: string;
  payout?: string;
  from?: string;
  to?: string;
  value?: string;
}

export interface CapitalEfficiencyStats {
  totalOptions: number;
  parentOptions: number;
  childOptions: number;
  totalTraditionalCollateral: string;
  totalLayeredCollateral: string;
  totalSavings: string;
  savingsPercentage: string;
}

export interface OptionHierarchy {
  parent: LayeredOptionAPI;
  children: LayeredOptionAPI[];
  totalChildren: number;
  activeChildren: number;
}

class LayeredOptionsAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/layered-options`;
  }

  private async fetchAPI<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "API request failed");
    }
    return data.data;
  }

  // Get all layered options
  async getAllOptions(): Promise<LayeredOptionAPI[]> {
    return this.fetchAPI<LayeredOptionAPI[]>("/");
  }

  // Get available options (not exercised, not expired)
  async getAvailableOptions(): Promise<LayeredOptionAPI[]> {
    return this.fetchAPI<LayeredOptionAPI[]>("/available");
  }

  // Get specific option by token ID
  async getOptionById(tokenId: string): Promise<LayeredOptionAPI> {
    return this.fetchAPI<LayeredOptionAPI>(`/${tokenId}`);
  }

  // Get parent options only
  async getParentOptions(): Promise<LayeredOptionAPI[]> {
    return this.fetchAPI<LayeredOptionAPI[]>("/parents");
  }

  // Get child options for a parent
  async getChildOptions(parentId: string): Promise<LayeredOptionAPI[]> {
    return this.fetchAPI<LayeredOptionAPI[]>(`/parent/${parentId}/children`);
  }

  // Get options owned by user
  async getUserOptions(userAddress: string): Promise<LayeredOptionAPI[]> {
    return this.fetchAPI<LayeredOptionAPI[]>(`/user/${userAddress}`);
  }

  // Get user balances
  async getUserBalances(userAddress: string): Promise<Record<string, number>> {
    return this.fetchAPI<Record<string, number>>(
      `/user/${userAddress}/balances`
    );
  }

  // Get capital efficiency statistics
  async getCapitalEfficiencyStats(): Promise<CapitalEfficiencyStats> {
    return this.fetchAPI<CapitalEfficiencyStats>("/stats/efficiency");
  }

  // Get option hierarchy (parent + children)
  async getOptionHierarchy(parentId: string): Promise<OptionHierarchy> {
    return this.fetchAPI<OptionHierarchy>(`/${parentId}/hierarchy`);
  }

  // Get recent transactions
  async getRecentTransactions(limit = 50): Promise<TransactionAPI[]> {
    return this.fetchAPI<TransactionAPI[]>(
      `/transactions/recent?limit=${limit}`
    );
  }
}

// Create singleton instance
export const layeredOptionsAPI = new LayeredOptionsAPI();

// React hooks for using the API
import { useState, useEffect } from "react";

export function useLayeredOptionsAPI() {
  const [options, setOptions] = useState<LayeredOptionAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await layeredOptionsAPI.getAllOptions();
      setOptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch options");
      console.error("Error fetching options:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  return {
    options,
    loading,
    error,
    refetch: fetchOptions,
  };
}

export function useUserLayeredOptions(userAddress?: string) {
  const [userOptions, setUserOptions] = useState<LayeredOptionAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserOptions = async () => {
    if (!userAddress) return;

    try {
      setLoading(true);
      setError(null);
      const data = await layeredOptionsAPI.getUserOptions(userAddress);
      setUserOptions(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch user options"
      );
      console.error("Error fetching user options:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserOptions();
  }, [userAddress]);

  return {
    userOptions,
    loading,
    error,
    refetch: fetchUserOptions,
  };
}

export function useCapitalEfficiencyStats() {
  const [stats, setStats] = useState<CapitalEfficiencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await layeredOptionsAPI.getCapitalEfficiencyStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

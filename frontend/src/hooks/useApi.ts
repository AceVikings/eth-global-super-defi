import { useState, useEffect, useCallback } from "react";
import apiService from "../services/api";

/**
 * Custom hook for managing API calls with loading states and error handling
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeRequest = useCallback(async (apiCall: () => Promise<any>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      return result;
    } catch (err: any) {
      const errorMessage = err?.message || "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { makeRequest, loading, error };
}

/**
 * Hook for fetching options data
 */
export function useOptions(filters = {}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshOptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getOptions(filters);
      setOptions(response.data || []);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to fetch options";
      setError(errorMessage);
      console.error("Failed to fetch options:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refreshOptions();
  }, [refreshOptions]);

  return { options, loading, error, refreshOptions };
}

/**
 * Hook for user-specific data
 */
export function useUserData(address: string) {
  const [userData, setUserData] = useState({
    options: [],
    balances: {},
    loading: true,
    error: null,
  });

  const refreshUserData = useCallback(async () => {
    if (!address) return;

    setUserData((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [optionsResponse, balancesResponse] = await Promise.all([
        apiService.getUserOptions(address),
        apiService.getUserBalances(address),
      ]);

      setUserData({
        options: optionsResponse.data || [],
        balances: balancesResponse.data || {},
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setUserData((prev) => ({
        ...prev,
        loading: false,
        error: err?.message || "Failed to fetch user data",
      }));
      console.error("Failed to fetch user data:", err);
    }
  }, [address]);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  return { ...userData, refreshUserData };
}

/**
 * Hook for market data
 */
export function useMarketData() {
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getMarketData();
      setMarketData(response.data);
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to fetch market data";
      setError(errorMessage);
      console.error("Failed to fetch market data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMarketData();

    // Refresh market data every 30 seconds
    const interval = setInterval(refreshMarketData, 30000);
    return () => clearInterval(interval);
  }, [refreshMarketData]);

  return { marketData, loading, error, refreshMarketData };
}

/**
 * Hook for contract configuration
 */
export function useContracts() {
  const [contracts, setContracts] = useState(null);
  const [abis, setAbis] = useState(null);
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContractData = async () => {
      try {
        const [contractsResponse, abisResponse, networkResponse] =
          await Promise.all([
            apiService.getContracts(),
            apiService.getContractABIs(),
            apiService.getNetworkConfig(),
          ]);

        setContracts(contractsResponse.data);
        setAbis(abisResponse.data);
        setNetwork(networkResponse.data);
      } catch (err: any) {
        const errorMessage = err?.message || "Failed to fetch contract data";
        setError(errorMessage);
        console.error("Failed to fetch contract data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContractData();
  }, []);

  return { contracts, abis, network, loading, error };
}

/**
 * Hook for premium calculations
 */
export function usePremiumCalculator() {
  const { makeRequest, loading, error } = useApi();

  const calculatePremium = useCallback(
    async (optionParams: any) => {
      return makeRequest(() => apiService.calculatePremium(optionParams));
    },
    [makeRequest]
  );

  return { calculatePremium, loading, error };
}

/**
 * API Service for Citrea Options Trading
 * Handles communication with the backend Express.js server
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Generic HTTP request handler with error handling
   */
  async request(endpoint: string, options: RequestOptions = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed [${endpoint}]:`, error);
      throw error;
    }
  }

  // Health check
  async checkHealth() {
    return this.request('/health');
  }

  // ===== OPTIONS API =====

  /**
   * Get all available options
   */
  async getOptions(filters: Record<string, any> = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    
    const query = params.toString();
    return this.request(`/api/options${query ? `?${query}` : ''}`);
  }

  /**
   * Get user's options by address
   */
  async getUserOptions(address: string) {
    return this.request(`/api/options/user/${address}`);
  }

  /**
   * Get user balances for multiple tokens
   */
  async getUserBalances(address: string) {
    return this.request(`/api/balances/${address}`);
  }

  /**
   * Calculate option premium based on parameters
   */
  async calculatePremium(params: any) {
    return this.request('/api/options/calculate-premium', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get detailed option information
   */
  async getOptionDetails(optionId: string | number) {
    return this.request(`/api/options/${optionId}`);
  }

  // ===== CONTRACTS API =====

  /**
   * Get contract addresses and configuration
   */
  async getContracts() {
    return this.request('/api/contracts');
  }

  /**
   * Get contract ABIs
   */
  async getContractABIs() {
    return this.request('/api/contracts/abi');
  }

  /**
   * Get network configuration
   */
  async getNetworkConfig() {
    return this.request('/api/contracts/network');
  }

  // ===== MARKET DATA API =====

  /**
   * Get market data for assets
   */
  async getMarketData() {
    return this.request('/api/market-data');
  }

  // ===== WEBSOCKET CONNECTION =====
  
  /**
   * Connect to real-time updates (if websocket is implemented)
   */
  connectRealtime(_callbacks: Record<string, any> = {}) {
    // For future WebSocket implementation
    console.log('Real-time connection not yet implemented');
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;

// Export specific functions for convenience
export const {
  checkHealth,
  getOptions,
  getUserOptions,
  getUserBalances,
  calculatePremium,
  getOptionDetails,
  getContracts,
  getContractABIs,
  getNetworkConfig,
  getMarketData,
  connectRealtime
} = apiService;

// Export types for TypeScript users
export const OptionStatus = {
  ACTIVE: 0,
  EXERCISED: 1,
  EXPIRED: 2
};

export const OptionType = {
  CALL: 0,
  PUT: 1
};
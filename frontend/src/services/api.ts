/**
 * API Service for Citrea Options Trading
 * Handles communication with the backend Express.js server
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Generic HTTP request handler with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
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
  async getOptions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    
    const query = params.toString();
    return this.request(`/api/options${query ? `?${query}` : ''}`);
  }

  /**
   * Get options for a specific user
   */
  async getUserOptions(address) {
    return this.request(`/api/options/user/${address}`);
  }

  /**
   * Get user token balances
   */
  async getUserBalances(address) {
    return this.request(`/api/options/balances/${address}`);
  }

  /**
   * Get market data for options trading
   */
  async getMarketData() {
    return this.request('/api/options/market');
  }

  /**
   * Calculate premium for an option
   */
  async calculatePremium(params) {
    return this.request('/api/options/premium', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  /**
   * Get option details by ID
   */
  async getOptionDetails(optionId) {
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

  // ===== WEBSOCKET CONNECTION =====
  
  /**
   * Connect to real-time updates (if websocket is implemented)
   */
  connectRealtime(callbacks = {}) {
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
  getMarketData,
  calculatePremium,
  getOptionDetails,
  getContracts,
  getContractABIs,
  getNetworkConfig,
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
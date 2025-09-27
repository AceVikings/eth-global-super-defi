import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import cron from 'node-cron';

// Define Citrea testnet
const citrea = defineChain({
  id: 5115,
  name: 'Citrea Testnet',
  network: 'citrea-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'cBTC',
    symbol: 'cBTC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.citrea.xyz'],
    },
    public: {
      http: ['https://rpc.testnet.citrea.xyz'],
    },
  },
});

// Contract addresses - Updated for Citrea testnet deployment
const CONTRACT_ADDRESSES = {
  OPTIONS_TRADING: process.env.OPTIONS_TRADING_ADDRESS || '0xcd9948d810c4e8c2144c4e2fb84786502e6bedc8',
  STABLE_COIN: process.env.STABLE_COIN_ADDRESS || '0x43d109c41de6beab2e1d151d932bcc6318fa8f50',
  BITCOIN_TOKEN: process.env.BITCOIN_TOKEN_ADDRESS || '0x70b0efc2b112d37cfeb2641cfde41b8677375935',
  WETH_TOKEN: process.env.WETH_TOKEN_ADDRESS || '0x52e5d5ff769e71dfeead1a3fc5c440f87031a3e3',
  BTC_PRICE_FEED: process.env.BTC_PRICE_FEED_ADDRESS || '0x2574b49a1ded38c9f239682769e3c3e708797c7a',
  ETH_PRICE_FEED: process.env.ETH_PRICE_FEED_ADDRESS || '0x7d0c4127c937aaf59b0af8f686d63d602e27a777',
  TIME_ORACLE: process.env.TIME_ORACLE_ADDRESS || '0x12aece39b96768dc9a776b1b3176b2bc21063314'
};

// Contract ABIs (from compiled artifacts)
const OPTIONS_TRADING_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "optionId", "type": "uint256"}],
    "name": "getOption",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "writer", "type": "address"},
          {"internalType": "address", "name": "buyer", "type": "address"},
          {"internalType": "uint8", "name": "optionType", "type": "uint8"},
          {"internalType": "uint256", "name": "strikePrice", "type": "uint256"},
          {"internalType": "uint256", "name": "premium", "type": "uint256"},
          {"internalType": "uint256", "name": "collateralAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "expiryTimestamp", "type": "uint256"},
          {"internalType": "uint8", "name": "status", "type": "uint8"},
          {"internalType": "address", "name": "underlyingAsset", "type": "address"},
          {"internalType": "address", "name": "collateralToken", "type": "address"},
          {"internalType": "uint256", "name": "contractSize", "type": "uint256"}
        ],
        "internalType": "struct CitreaOptionsTrading.Option",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserOptions",
    "outputs": [{"internalType": "uint256[]", "name": "", "type": "uint256[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "asset", "type": "address"}],
    "name": "getCurrentPrice",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint8", "name": "optionType", "type": "uint8"},
      {"internalType": "uint256", "name": "strikePrice", "type": "uint256"},
      {"internalType": "uint256", "name": "expiryTimestamp", "type": "uint256"},
      {"internalType": "address", "name": "underlyingAsset", "type": "address"},
      {"internalType": "uint256", "name": "contractSize", "type": "uint256"}
    ],
    "name": "calculatePremium",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "asset", "type": "address"}],
    "name": "supportedAssets",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "collateral", "type": "address"}],
    "name": "supportedCollaterals", 
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view", 
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const PRICE_FEED_ABI = [
  {
    "inputs": [],
    "name": "latestRoundData",
    "outputs": [
      {"internalType": "uint80", "name": "roundId", "type": "uint80"},
      {"internalType": "int256", "name": "answer", "type": "int256"},
      {"internalType": "uint256", "name": "startedAt", "type": "uint256"},
      {"internalType": "uint256", "name": "updatedAt", "type": "uint256"},
      {"internalType": "uint80", "name": "answeredInRound", "type": "uint80"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "latestAnswer",
    "outputs": [{"internalType": "int256", "name": "", "type": "int256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "description",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

class OptionsIndexer {
  constructor() {
    this.client = createPublicClient({
      chain: citrea,
      transport: http()
    });
    
    this.options = new Map(); // Store all options
    this.lastProcessedBlock = 0n;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔍 Starting Options Indexer...');
    
    try {
      // Get initial data
      await this.indexExistingOptions();
      
      // Schedule regular updates every 30 seconds
      cron.schedule('*/30 * * * * *', () => {
        this.indexNewOptions();
      });
      
      console.log('✅ Options Indexer started successfully');
    } catch (error) {
      console.error('❌ Failed to start indexer:', error);
      this.isRunning = false;
    }
  }

  async indexExistingOptions() {
    try {
      // This is a simple approach - in production you'd track from events
      // For now, we'll try to read options starting from ID 1
      let optionId = 1;
      let foundOptions = 0;
      
      while (foundOptions < 100) { // Limit to prevent infinite loops
        try {
          const option = await this.client.readContract({
            address: CONTRACT_ADDRESSES.OPTIONS_TRADING,
            abi: OPTIONS_TRADING_ABI,
            functionName: 'getOption',
            args: [BigInt(optionId)]
          });
          
          if (option.id > 0n) {
            const enrichedOption = await this.enrichOptionData(option);
            this.options.set(optionId.toString(), enrichedOption);
            foundOptions++;
            console.log(`📋 Indexed option ${optionId}: ${option.optionType === 0 ? 'CALL' : 'PUT'} ${this.formatPrice(option.strikePrice)}`);
          } else {
            break; // No more options
          }
        } catch (error) {
          break; // Option doesn't exist
        }
        
        optionId++;
      }
      
      console.log(`📊 Indexed ${foundOptions} existing options`);
    } catch (error) {
      console.error('Error indexing existing options:', error);
    }
  }

  async indexNewOptions() {
    // In a production system, you'd listen to events or check recent blocks
    // For simplicity, we'll just re-scan periodically
    try {
      const currentBlock = await this.client.getBlockNumber();
      if (currentBlock > this.lastProcessedBlock) {
        // Simple re-scan approach
        await this.indexExistingOptions();
        this.lastProcessedBlock = currentBlock;
      }
    } catch (error) {
      console.error('Error indexing new options:', error);
    }
  }

  async enrichOptionData(option) {
    try {
      // Get current price for the underlying asset
      let currentPrice = '0';
      try {
        const price = await this.client.readContract({
          address: CONTRACT_ADDRESSES.OPTIONS_TRADING,
          abi: OPTIONS_TRADING_ABI,
          functionName: 'getCurrentPrice',
          args: [option.underlyingAsset]
        });
        currentPrice = price.toString();
      } catch (error) {
        console.warn('Could not fetch current price:', error.message);
      }

      // Get asset information
      let assetInfo = { name: 'Unknown', symbol: 'UNK', decimals: 18 };
      try {
        const [name, symbol, decimals] = await Promise.all([
          this.client.readContract({
            address: option.underlyingAsset,
            abi: ERC20_ABI,
            functionName: 'name'
          }),
          this.client.readContract({
            address: option.underlyingAsset,
            abi: ERC20_ABI,
            functionName: 'symbol'
          }),
          this.client.readContract({
            address: option.underlyingAsset,
            abi: ERC20_ABI,
            functionName: 'decimals'
          })
        ]);
        assetInfo = { name, symbol, decimals };
      } catch (error) {
        console.warn('Could not fetch asset info:', error.message);
      }

      // Calculate time to expiry
      const now = Math.floor(Date.now() / 1000);
      const expiryTime = Number(option.expiryTimestamp);
      const timeToExpiry = Math.max(0, expiryTime - now);
      const isExpired = timeToExpiry === 0;

      // Calculate if option is in the money
      const strike = Number(option.strikePrice);
      const current = Number(currentPrice);
      let isInTheMoney = false;
      let intrinsicValue = 0;

      if (current > 0) {
        if (option.optionType === 0) { // CALL
          isInTheMoney = current > strike;
          intrinsicValue = Math.max(0, current - strike);
        } else { // PUT
          isInTheMoney = strike > current;
          intrinsicValue = Math.max(0, strike - current);
        }
      }

      return {
        ...option,
        id: option.id.toString(),
        strikePrice: option.strikePrice.toString(),
        premium: option.premium.toString(),
        collateralAmount: option.collateralAmount.toString(),
        contractSize: option.contractSize.toString(),
        expiryTimestamp: option.expiryTimestamp.toString(),
        optionType: option.optionType === 0 ? 'CALL' : 'PUT',
        status: this.getStatusString(Number(option.status)),
        currentPrice,
        assetInfo,
        timeToExpiry,
        isExpired,
        isInTheMoney,
        intrinsicValue: intrinsicValue.toString(),
        formattedStrike: this.formatPrice(option.strikePrice),
        formattedPremium: this.formatPrice(option.premium),
        expiryDate: new Date(expiryTime * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error enriching option data:', error);
      return option;
    }
  }

  getStatusString(status) {
    const statusMap = {
      0: 'ACTIVE',
      1: 'EXERCISED',
      2: 'EXPIRED'
    };
    return statusMap[status] || 'UNKNOWN';
  }

  formatPrice(priceWei) {
    // Assuming 8 decimals for prices
    const price = Number(priceWei) / 1e8;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }

  // Public methods for API
  getAllOptions() {
    return Array.from(this.options.values());
  }

  getOptionById(id) {
    return this.options.get(id.toString());
  }

  getAvailableOptions() {
    return Array.from(this.options.values()).filter(option => 
      option.status === 'ACTIVE' && 
      !option.isExpired && 
      option.buyer === '0x0000000000000000000000000000000000000000'
    );
  }

  getOptionsByUser(userAddress) {
    return Array.from(this.options.values()).filter(option => 
      option.writer.toLowerCase() === userAddress.toLowerCase() ||
      option.buyer.toLowerCase() === userAddress.toLowerCase()
    );
  }

  async getUserBalances(userAddress) {
    try {
      const [stableBalance, btcBalance] = await Promise.all([
        this.client.readContract({
          address: CONTRACT_ADDRESSES.STABLE_COIN,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress]
        }),
        this.client.readContract({
          address: CONTRACT_ADDRESSES.BITCOIN_TOKEN,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [userAddress]
        })
      ]);

      return {
        stableBalance: stableBalance.toString(),
        btcBalance: btcBalance.toString(),
        formattedStable: (Number(stableBalance) / 1e6).toFixed(2) + ' USDC',
        formattedBtc: (Number(btcBalance) / 1e8).toFixed(8) + ' BTC'
      };
    } catch (error) {
      console.error('Error fetching user balances:', error);
      return {
        stableBalance: '0',
        btcBalance: '0',
        formattedStable: '0.00 USDC',
        formattedBtc: '0.00000000 BTC'
      };
    }
  }

  async getCurrentPrices() {
    try {
      const btcPrice = await this.client.readContract({
        address: CONTRACT_ADDRESSES.BTC_PRICE_FEED,
        abi: PRICE_FEED_ABI,
        functionName: 'latestAnswer'
      });

      return {
        btc: {
          price: btcPrice.toString(),
          formatted: this.formatPrice(btcPrice),
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error fetching prices:', error);
      return {
        btc: {
          price: '0',
          formatted: '$0.00',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  getStats() {
    const options = this.getAllOptions();
    const active = options.filter(o => o.status === 'ACTIVE').length;
    const purchased = options.filter(o => o.buyer !== '0x0000000000000000000000000000000000000000').length;
    const exercised = options.filter(o => o.status === 'EXERCISED').length;
    
    return {
      total: options.length,
      active,
      available: active - purchased,
      purchased,
      exercised,
      lastUpdate: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const indexer = new OptionsIndexer();
export { CONTRACT_ADDRESSES };
import { createPublicClient, http, parseAbiItem, formatUnits, getAddress } from 'viem';
import cron from 'node-cron';

// Citrea testnet configuration
const citreaTestnet = {
  id: 5115,
  name: 'Citrea Testnet',
  network: 'citrea',
  nativeCurrency: { decimals: 18, name: 'cBTC', symbol: 'cBTC' },
  rpcUrls: { default: { http: ['https://rpc.testnet.citrea.xyz'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://explorer.testnet.citrea.xyz' } },
};

// Contract configuration
const LAYERED_OPTIONS_ADDRESS = '0x5159326b4faf867eb45c324842e77543a8eae63d';

// Events to track
const EVENTS = {
  OptionCreated: parseAbiItem('event OptionCreated(uint256 indexed tokenId, address indexed creator, address indexed baseAsset, uint256 strikePrice, uint256 expirationTime, uint256 premium, uint256 parentId)'),
  ChildOptionCreated: parseAbiItem('event ChildOptionCreated(uint256 indexed tokenId, uint256 indexed parentId, address indexed creator, uint256 strikePrice, uint256 expirationTime, uint256 premium)'),
  OptionExercised: parseAbiItem('event OptionExercised(uint256 indexed tokenId, address indexed exerciser, uint256 payout)'),
  TransferSingle: parseAbiItem('event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)'),
};

class LayeredOptionsIndexer {
  constructor() {
    this.client = createPublicClient({
      chain: citreaTestnet,
      transport: http(),
    });
    
    this.options = new Map(); // tokenId -> option data
    this.transactions = []; // transaction history
    this.balances = new Map(); // user address -> { tokenId -> balance }
    this.isIndexing = false;
    this.lastProcessedBlock = null;
    
    this.init();
  }

  async init() {
    console.log('🔍 Initializing Layered Options Indexer...');
    try {
      const latestBlock = await this.client.getBlockNumber();
      this.lastProcessedBlock = latestBlock - 1000n; // Start from 1000 blocks ago
      console.log(`📊 Starting indexing from block ${this.lastProcessedBlock}`);
      await this.indexPastEvents();
    } catch (error) {
      console.error('Failed to initialize indexer:', error);
    }
  }

  async indexPastEvents() {
    if (this.isIndexing) return;
    
    this.isIndexing = true;
    
    try {
      const currentBlock = await this.client.getBlockNumber();
      
      // Index OptionCreated events
      const optionCreatedLogs = await this.client.getLogs({
        address: LAYERED_OPTIONS_ADDRESS,
        event: EVENTS.OptionCreated,
        fromBlock: this.lastProcessedBlock,
        toBlock: currentBlock,
      });

      // Index ChildOptionCreated events  
      const childOptionCreatedLogs = await this.client.getLogs({
        address: LAYERED_OPTIONS_ADDRESS,
        event: EVENTS.ChildOptionCreated,
        fromBlock: this.lastProcessedBlock,
        toBlock: currentBlock,
      });

      // Index OptionExercised events
      const optionExercisedLogs = await this.client.getLogs({
        address: LAYERED_OPTIONS_ADDRESS,
        event: EVENTS.OptionExercised,
        fromBlock: this.lastProcessedBlock,
        toBlock: currentBlock,
      });

      // Index Transfer events
      const transferLogs = await this.client.getLogs({
        address: LAYERED_OPTIONS_ADDRESS,
        event: EVENTS.TransferSingle,
        fromBlock: this.lastProcessedBlock,
        toBlock: currentBlock,
      });

      // Process events
      await this.processOptionCreatedEvents([...optionCreatedLogs, ...childOptionCreatedLogs]);
      await this.processOptionExercisedEvents(optionExercisedLogs);
      await this.processTransferEvents(transferLogs);

      this.lastProcessedBlock = currentBlock;
      console.log(`✅ Indexed to block ${currentBlock}, found ${this.options.size} options`);
      
    } catch (error) {
      console.error('Error indexing events:', error);
    }
    
    this.isIndexing = false;
  }

  async processOptionCreatedEvents(logs) {
    for (const log of logs) {
      try {
        const { tokenId, creator, baseAsset, strikePrice, expirationTime, premium, parentId } = log.args;
        
        const block = await this.client.getBlock({ blockHash: log.blockHash });
        
        const option = {
          tokenId: tokenId.toString(),
          creator: getAddress(creator),
          baseAsset: getAddress(baseAsset),
          strikePrice: strikePrice.toString(),
          expirationTime: expirationTime.toString(),
          premium: premium.toString(),
          parentId: parentId.toString(),
          isExercised: false,
          isParent: parentId.toString() === '0',
          blockNumber: Number(log.blockNumber),
          blockHash: log.blockHash,
          transactionHash: log.transactionHash,
          timestamp: Number(block.timestamp) * 1000,
          // Formatted values for easier consumption
          formattedStrike: formatUnits(strikePrice, 18),
          formattedPremium: formatUnits(premium, 18),
          expirationDate: new Date(Number(expirationTime) * 1000).toISOString(),
          isExpired: Number(expirationTime) * 1000 < Date.now(),
        };

        this.options.set(tokenId.toString(), option);
        
        // Add to transaction history
        this.transactions.push({
          type: option.isParent ? 'OPTION_CREATED' : 'CHILD_OPTION_CREATED',
          tokenId: option.tokenId,
          creator: option.creator,
          parentId: option.parentId,
          timestamp: option.timestamp,
          transactionHash: option.transactionHash,
        });

        console.log(`📝 ${option.isParent ? 'Parent' : 'Child'} option created: Token #${tokenId}`);
        
      } catch (error) {
        console.error('Error processing option created event:', error);
      }
    }
  }

  async processOptionExercisedEvents(logs) {
    for (const log of logs) {
      try {
        const { tokenId, exerciser, payout } = log.args;
        
        const option = this.options.get(tokenId.toString());
        if (option) {
          option.isExercised = true;
          option.exerciser = getAddress(exerciser);
          option.payout = payout.toString();
          option.formattedPayout = formatUnits(payout, 18);
        }

        const block = await this.client.getBlock({ blockHash: log.blockHash });
        
        // Add to transaction history
        this.transactions.push({
          type: 'OPTION_EXERCISED',
          tokenId: tokenId.toString(),
          exerciser: getAddress(exerciser),
          payout: payout.toString(),
          timestamp: Number(block.timestamp) * 1000,
          transactionHash: log.transactionHash,
        });

        console.log(`⚡ Option exercised: Token #${tokenId} by ${exerciser}`);
        
      } catch (error) {
        console.error('Error processing option exercised event:', error);
      }
    }
  }

  async processTransferEvents(logs) {
    for (const log of logs) {
      try {
        const { operator, from, to, id, value } = log.args;
        
        // Skip mint/burn events (from/to zero address)
        if (from === '0x0000000000000000000000000000000000000000' || 
            to === '0x0000000000000000000000000000000000000000') {
          continue;
        }

        const block = await this.client.getBlock({ blockHash: log.blockHash });
        
        // Update balances
        this.updateBalance(getAddress(from), id.toString(), -Number(value));
        this.updateBalance(getAddress(to), id.toString(), Number(value));
        
        // Add to transaction history
        this.transactions.push({
          type: 'OPTION_TRANSFERRED',
          tokenId: id.toString(),
          from: getAddress(from),
          to: getAddress(to),
          value: value.toString(),
          timestamp: Number(block.timestamp) * 1000,
          transactionHash: log.transactionHash,
        });

        console.log(`📤 Option transferred: Token #${id} from ${from} to ${to}`);
        
      } catch (error) {
        console.error('Error processing transfer event:', error);
      }
    }
  }

  updateBalance(userAddress, tokenId, change) {
    if (!this.balances.has(userAddress)) {
      this.balances.set(userAddress, new Map());
    }
    
    const userBalances = this.balances.get(userAddress);
    const currentBalance = userBalances.get(tokenId) || 0;
    const newBalance = Math.max(0, currentBalance + change);
    
    if (newBalance > 0) {
      userBalances.set(tokenId, newBalance);
    } else {
      userBalances.delete(tokenId);
    }
  }

  // Public API methods
  getAllOptions() {
    return Array.from(this.options.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getAvailableOptions() {
    return Array.from(this.options.values())
      .filter(option => !option.isExercised && !option.isExpired)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getOptionById(tokenId) {
    return this.options.get(tokenId.toString());
  }

  getParentOptions() {
    return Array.from(this.options.values())
      .filter(option => option.isParent)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getChildOptions(parentId) {
    return Array.from(this.options.values())
      .filter(option => !option.isParent && option.parentId === parentId.toString())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getOptionsByUser(userAddress) {
    const userBalances = this.balances.get(getAddress(userAddress));
    if (!userBalances) return [];

    const userOptions = [];
    for (const [tokenId, balance] of userBalances) {
      if (balance > 0) {
        const option = this.options.get(tokenId);
        if (option) {
          userOptions.push({
            ...option,
            balance,
          });
        }
      }
    }
    
    return userOptions.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getUserBalances(userAddress) {
    const userBalances = this.balances.get(getAddress(userAddress));
    if (!userBalances) return {};

    const balances = {};
    for (const [tokenId, balance] of userBalances) {
      if (balance > 0) {
        balances[tokenId] = balance;
      }
    }
    
    return balances;
  }

  getCapitalEfficiencyStats() {
    const allOptions = this.getAllOptions();
    const totalOptions = allOptions.length;
    const parentOptions = allOptions.filter(o => o.isParent);
    const childOptions = allOptions.filter(o => !o.isParent);
    
    let totalTraditionalCollateral = 0;
    let totalLayeredCollateral = 0;
    
    for (const option of allOptions) {
      if (option.isParent) {
        totalTraditionalCollateral += parseFloat(option.formattedStrike);
      }
      totalLayeredCollateral += parseFloat(option.formattedPremium);
    }
    
    const savings = totalTraditionalCollateral - totalLayeredCollateral;
    const savingsPercentage = totalTraditionalCollateral > 0 
      ? ((savings / totalTraditionalCollateral) * 100).toFixed(2)
      : '0';
    
    return {
      totalOptions,
      parentOptions: parentOptions.length,
      childOptions: childOptions.length,
      totalTraditionalCollateral: totalTraditionalCollateral.toFixed(6),
      totalLayeredCollateral: totalLayeredCollateral.toFixed(6),
      totalSavings: savings.toFixed(6),
      savingsPercentage: `${savingsPercentage}%`,
    };
  }

  getOptionHierarchy(parentId) {
    const parent = this.getOptionById(parentId);
    if (!parent || !parent.isParent) return null;
    
    const children = this.getChildOptions(parentId);
    
    return {
      parent,
      children,
      totalChildren: children.length,
      activeChildren: children.filter(c => !c.isExercised && !c.isExpired).length,
    };
  }

  getRecentTransactions(limit = 50) {
    return this.transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Start the indexing service
  start() {
    console.log('🔄 Starting Layered Options indexing service...');
    
    // Index every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      await this.indexPastEvents();
    });
    
    console.log('✅ Layered Options indexer started');
  }

  stop() {
    console.log('🛑 Stopping Layered Options indexer...');
    // cron jobs are automatically cleaned up
  }
}

// Create singleton instance
export const layeredIndexer = new LayeredOptionsIndexer();
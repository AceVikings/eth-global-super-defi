import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import apiService from './api';

/**
 * Smart Contract Service for Citrea Options Trading
 * Handles direct blockchain interactions using wagmi/viem
 */

class SmartContractService {
  constructor() {
    this.contracts = null;
    this.abis = null;
    this.network = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      const [contractsResponse, abisResponse, networkResponse] = await Promise.all([
        apiService.getContracts(),
        apiService.getContractABIs(),
        apiService.getNetworkConfig()
      ]);

      this.contracts = contractsResponse.data;
      this.abis = abisResponse.data;
      this.network = networkResponse.data;
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize contract service:', error);
      throw error;
    }
  }

  getContract(contractName) {
    if (!this.initialized) {
      throw new Error('Contract service not initialized. Call initialize() first.');
    }
    return {
      address: this.contracts[contractName],
      abi: this.abis[contractName]
    };
  }
}

const contractService = new SmartContractService();

/**
 * React hook for smart contract interactions
 */
export function useSmartContracts() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();

  // Initialize contract service
  const initializeContracts = async () => {
    await contractService.initialize();
  };

  // ===== MOCK TOKEN FUNCTIONS =====

  /**
   * Mint mock ERC20 tokens for testing
   */
  const mintMockToken = async (tokenType, amount) => {
    await contractService.initialize();
    
    const tokenContract = tokenType === 'stablecoin' 
      ? contractService.getContract('STABLE_COIN')
      : contractService.getContract('BITCOIN_TOKEN');
    
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    // Convert amount to proper decimals (assuming 18 decimals for both tokens)
    const amountWei = parseEther(amount.toString());

    const { request } = await publicClient.simulateContract({
      account: address,
      address: tokenContract.address,
      abi: tokenContract.abi,
      functionName: 'mint',
      args: [address, amountWei]
    });

    const hash = await walletClient.writeContract(request);
    
    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt;
  };

  /**
   * Get token balance for user
   */
  const getTokenBalance = async (tokenAddress, userAddress = address) => {
    await contractService.initialize();
    
    if (!userAddress) {
      throw new Error('User address required');
    }

    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: contractService.abis.ERC20, // Generic ERC20 ABI
      functionName: 'balanceOf',
      args: [userAddress]
    });

    return formatEther(balance);
  };

  /**
   * Approve token spending
   */
  const approveToken = async (tokenAddress, spenderAddress, amount) => {
    await contractService.initialize();
    
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    const amountWei = parseEther(amount.toString());

    const { request } = await publicClient.simulateContract({
      account: address,
      address: tokenAddress,
      abi: contractService.abis.ERC20,
      functionName: 'approve',
      args: [spenderAddress, amountWei]
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt;
  };

  // ===== OPTIONS TRADING FUNCTIONS =====

  /**
   * Create a new option
   */
  const createOption = async (params) => {
    await contractService.initialize();
    
    const optionsContract = contractService.getContract('OPTIONS_TRADING');
    
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    const {
      optionType,
      strikePrice,
      expiryTimestamp,
      underlyingAsset,
      collateralToken,
      contractSize
    } = params;

    // Convert values to proper format
    const strikePriceWei = parseUnits(strikePrice.toString(), 8); // 8 decimals for price
    const contractSizeWei = parseEther(contractSize.toString());

    const { request } = await publicClient.simulateContract({
      account: address,
      address: optionsContract.address,
      abi: optionsContract.abi,
      functionName: 'createOption',
      args: [
        optionType,
        strikePriceWei,
        expiryTimestamp,
        underlyingAsset,
        collateralToken,
        contractSizeWei
      ]
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt;
  };

  /**
   * Purchase an existing option
   */
  const purchaseOption = async (optionId) => {
    await contractService.initialize();
    
    const optionsContract = contractService.getContract('OPTIONS_TRADING');
    
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    const { request } = await publicClient.simulateContract({
      account: address,
      address: optionsContract.address,
      abi: optionsContract.abi,
      functionName: 'purchaseOption',
      args: [BigInt(optionId)]
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt;
  };

  /**
   * Exercise an option
   */
  const exerciseOption = async (optionId) => {
    await contractService.initialize();
    
    const optionsContract = contractService.getContract('OPTIONS_TRADING');
    
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    const { request } = await publicClient.simulateContract({
      account: address,
      address: optionsContract.address,
      abi: optionsContract.abi,
      functionName: 'exerciseOption',
      args: [BigInt(optionId)]
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt;
  };

  /**
   * Get option details from blockchain
   */
  const getOptionFromChain = async (optionId) => {
    await contractService.initialize();
    
    const optionsContract = contractService.getContract('OPTIONS_TRADING');
    
    const option = await publicClient.readContract({
      address: optionsContract.address,
      abi: optionsContract.abi,
      functionName: 'getOption',
      args: [BigInt(optionId)]
    });

    return option;
  };

  return {
    // Initialization
    initializeContracts,
    
    // Mock tokens
    mintMockToken,
    getTokenBalance,
    approveToken,
    
    // Options trading
    createOption,
    purchaseOption,
    exerciseOption,
    getOptionFromChain,
    
    // State
    isConnected: !!address,
    userAddress: address,
    contracts: contractService.contracts,
  };
}

export default contractService;
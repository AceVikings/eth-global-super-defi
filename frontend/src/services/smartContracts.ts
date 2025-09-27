import {
  useAccount,
  useWalletClient,
  usePublicClient,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { parseEther } from "viem";

// Allowed chains for this app
const ALLOWED_CHAINS = {
  CITREA_TESTNET: 5115,
} as const;

export function useSmartContracts() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  if (!publicClient) {
    throw new Error("Public client not available");
  }

  // Chain validation helper
  const ensureCorrectChain = async () => {
    if (chainId !== ALLOWED_CHAINS.CITREA_TESTNET) {
      console.log(
        `Current chain: ${chainId}, switching to Citrea testnet (${ALLOWED_CHAINS.CITREA_TESTNET})`
      );
      try {
        await switchChainAsync({ chainId: ALLOWED_CHAINS.CITREA_TESTNET });
      } catch (error) {
        throw new Error(
          `Please switch to Citrea testnet (Chain ID: ${ALLOWED_CHAINS.CITREA_TESTNET})`
        );
      }
    }
  };

  // Deployed contract addresses - Updated with latest deployment
  const DEPLOYED_CONTRACTS = {
    TIME_ORACLE: "0x2506fe09d6c08785463498577d1fd8f4fb9db76a" as const,
    STABLE_COIN: "0x471e11d879a395b8f1b66537ea1837e8ee113b80" as const,
    BITCOIN_TOKEN: "0xa06f12b8d9fe2515d41b62e556cce0467666e347" as const,
    WRAPPED_NATIVE: "0xbaa08d8e70e3b96d8325b1fb13fa936a846fa041" as const,
    BTC_PRICE_FEED: "0x333f8d70ce57f9e8be05acf3e879c0834f4db6b6" as const,
    ETH_PRICE_FEED: "0x0ba4363ffec8fe2226be2195f85acd7608eb8b21" as const,
    OPTIONS_TRADING: "0x41fefcebef394deefc228af5615064ba430b95ec" as const,
  } as const;

  // MockERC20 ABI - Exact ABI from compiled contract artifacts
  const MOCK_ERC20_ABI = [
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "name",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "symbol",
          "type": "string"
        },
        {
          "internalType": "uint8",
          "name": "decimals_",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "initialSupply",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "allowance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "ERC20InsufficientAllowance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "balance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "needed",
          "type": "uint256"
        }
      ],
      "name": "ERC20InsufficientBalance",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "approver",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidApprover",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidReceiver",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidSender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "ERC20InvalidSpender",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "burn",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "burnRaw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "faucet",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "mint",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "mintRaw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const;

  // Initialize (no-op)
  const initializeContracts = async () => Promise.resolve();

  // Mint tokens using faucet
  const mintMockToken = async (
    tokenType: "stablecoin" | "bitcoin",
    amount: string
  ) => {
    const tokenAddress =
      tokenType === "stablecoin"
        ? DEPLOYED_CONTRACTS.STABLE_COIN
        : DEPLOYED_CONTRACTS.BITCOIN_TOKEN;

    if (!walletClient || !address) {
      throw new Error("Wallet not connected");
    }

    // Ensure we're on the correct chain
    await ensureCorrectChain();

    // Use correct decimals for each token type
    // USDC has 6 decimals, BTC has 8 decimals
    const decimals = tokenType === "stablecoin" ? 6 : 8;
    const amountWei = BigInt(amount) * BigInt(10 ** decimals);

    const { request } = await publicClient.simulateContract({
      account: address,
      address: tokenAddress,
      abi: MOCK_ERC20_ABI,
      functionName: "faucet",
      args: [amountWei],
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt;
  };

  // Track failed attempts per address to prevent infinite retries
  const failureTracker = new Map<string, number>();
  const MAX_RETRIES = 3;
  const FAILURE_RESET_TIME = 60000; // Reset failures after 1 minute

  // Get token balance with retry limit
  const getTokenBalance = async (
    tokenAddress: string,
    userAddress = address,
    retryCount = 0
  ): Promise<string> => {
    if (!userAddress) throw new Error("User address required");

    const failureKey = `${tokenAddress}-${userAddress}`;
    const currentFailures = failureTracker.get(failureKey) || 0;

    // If we've exceeded max retries, return 0 and stop trying
    if (currentFailures >= MAX_RETRIES) {
      console.warn(`Max retries (${MAX_RETRIES}) exceeded for balance reading: ${tokenAddress}`);
      return "0";
    }

    try {
      // Ensure we're on the correct chain before reading
      if (chainId !== ALLOWED_CHAINS.CITREA_TESTNET) {
        console.warn(
          `Reading balance on wrong chain ${chainId}, expected ${ALLOWED_CHAINS.CITREA_TESTNET}`
        );
        return "0";
      }

      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: MOCK_ERC20_ABI,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`],
      });

      // Success - reset failure count
      failureTracker.delete(failureKey);
      console.log(`Balance read successfully for ${tokenAddress}:`, balance);
      
      // Format balance with correct decimals based on token type
      // USDC has 6 decimals, BTC has 8 decimals
      const decimals = tokenAddress === DEPLOYED_CONTRACTS.STABLE_COIN ? 6 : 8;
      const balanceFormatted = (Number(balance) / Math.pow(10, decimals)).toString();
      
      return balanceFormatted;
    } catch (error) {
      console.error(`Error reading balance (attempt ${retryCount + 1}):`, error);
      
      // Increment failure count
      const newFailureCount = currentFailures + 1;
      failureTracker.set(failureKey, newFailureCount);

      // Reset failure count after timeout
      setTimeout(() => {
        failureTracker.delete(failureKey);
      }, FAILURE_RESET_TIME);

      // If we haven't hit max retries, don't retry automatically here
      // Let the caller handle retries to prevent infinite loops
      return "0";
    }
  };

  // Approve token spending
  const approveToken = async (
    tokenAddress: string,
    spenderAddress: string,
    amount: string
  ) => {
    if (!walletClient || !address) throw new Error("Wallet not connected");

    const amountWei = parseEther(amount.toString());

    const { request } = await publicClient.simulateContract({
      account: address,
      address: tokenAddress as `0x${string}`,
      abi: MOCK_ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress as `0x${string}`, amountWei],
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return receipt;
  };

  // Options functions (stubs for now)
  const createOption = async (params: any) => {
    console.log("Creating option with params:", params);
    await ensureCorrectChain();
    throw new Error("Options trading functions require full contract ABI");
  };

  const purchaseOption = async (optionId: string) => {
    console.log("Purchasing option:", optionId);
    await ensureCorrectChain();
    throw new Error("Options trading functions require full contract ABI");
  };

  const exerciseOption = async (optionId: string) => {
    console.log("Exercising option:", optionId);
    await ensureCorrectChain();
    throw new Error("Options trading functions require full contract ABI");
  };

  const getOptionFromChain = async (optionId: string) => {
    console.log("Getting option from chain:", optionId);
    if (chainId !== ALLOWED_CHAINS.CITREA_TESTNET) {
      console.warn(
        `Reading option on wrong chain ${chainId}, expected ${ALLOWED_CHAINS.CITREA_TESTNET}`
      );
      return null;
    }
    throw new Error("Options trading functions require full contract ABI");
  };

  // Helper function to check if user is on correct chain
  const isOnCorrectChain = () => chainId === ALLOWED_CHAINS.CITREA_TESTNET;

  return {
    initializeContracts,
    mintMockToken,
    getTokenBalance,
    approveToken,
    createOption,
    purchaseOption,
    exerciseOption,
    getOptionFromChain,
    isConnected: !!address,
    userAddress: address,
    contracts: DEPLOYED_CONTRACTS,
    isOnCorrectChain,
    currentChainId: chainId,
    requiredChainId: ALLOWED_CHAINS.CITREA_TESTNET,
    ensureCorrectChain,
  };
}

export default useSmartContracts;

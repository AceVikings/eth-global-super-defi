import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES, LAYERED_OPTIONS_ABI, MOCK_ERC20_ABI } from '../contracts/config';
import { useState } from 'react';

export interface LayeredOption {
  creator: string;
  baseAsset: string;
  strikePrice: bigint;
  expirationTime: bigint;
  premium: bigint;
  isExercised: boolean;
  parentId: bigint;
}

export interface CreateOptionParams {
  baseAsset: string;
  strikePrice: string; // In dollars (e.g., "45000")
  expirationDays: number;
  premiumETH: string; // In ETH (e.g., "0.001")
}

export interface CreateChildOptionParams {
  parentId: number;
  strikePrice: string; // In dollars
  expirationDays: number;
  premiumETH: string; // In ETH
}

export function useLayeredOptions() {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [isExercising, setIsExercising] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Write contract hooks
  const { writeContract: writeCreateOption, data: createHash } = useWriteContract();
  const { writeContract: writeCreateChild, data: createChildHash } = useWriteContract();
  const { writeContract: writeExercise, data: exerciseHash } = useWriteContract();
  const { writeContract: writeTransfer, data: transferHash } = useWriteContract();
  const { writeContract: writeAddAsset, data: addAssetHash } = useWriteContract();

  // Wait for transaction confirmations
  const { isLoading: isCreatePending, isSuccess: isCreateSuccess } = useWaitForTransactionReceipt({
    hash: createHash,
  });
  const { isLoading: isChildPending, isSuccess: isChildSuccess } = useWaitForTransactionReceipt({
    hash: createChildHash,
  });
  const { isLoading: isExercisePending, isSuccess: isExerciseSuccess } = useWaitForTransactionReceipt({
    hash: exerciseHash,
  });
  const { isLoading: isTransferPending, isSuccess: isTransferSuccess } = useWaitForTransactionReceipt({
    hash: transferHash,
  });

  // Read contract hooks
  const { data: nextTokenId } = useReadContract({
    address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
    abi: LAYERED_OPTIONS_ABI,
    functionName: 'nextTokenId',
  });

  // Create a parent layered option
  const createLayeredOption = async (params: CreateOptionParams) => {
    try {
      setIsCreating(true);
      const strikePrice = parseUnits(params.strikePrice, 18);
      const expirationTime = BigInt(Math.floor(Date.now() / 1000) + params.expirationDays * 24 * 60 * 60);
      const premium = parseEther(params.premiumETH);

      await writeCreateOption({
        address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
        abi: LAYERED_OPTIONS_ABI,
        functionName: 'createLayeredOption',
        args: [params.baseAsset as `0x${string}`, strikePrice, expirationTime],
        value: premium,
      });
    } catch (error) {
      setIsCreating(false);
      throw error;
    }
  };

  // Create a child option
  const createChildOption = async (params: CreateChildOptionParams) => {
    try {
      setIsCreatingChild(true);
      const strikePrice = parseUnits(params.strikePrice, 18);
      const expirationTime = BigInt(Math.floor(Date.now() / 1000) + params.expirationDays * 24 * 60 * 60);
      const premium = parseEther(params.premiumETH);

      await writeCreateChild({
        address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
        abi: LAYERED_OPTIONS_ABI,
        functionName: 'createChildOption',
        args: [BigInt(params.parentId), strikePrice, expirationTime],
        value: premium,
      });
    } catch (error) {
      setIsCreatingChild(false);
      throw error;
    }
  };

  // Exercise an option
  const exerciseOption = async (tokenId: number) => {
    try {
      setIsExercising(true);
      await writeExercise({
        address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
        abi: LAYERED_OPTIONS_ABI,
        functionName: 'exerciseOption',
        args: [BigInt(tokenId)],
      });
    } catch (error) {
      setIsExercising(false);
      throw error;
    }
  };

  // Transfer an option
  const transferOption = async (from: string, to: string, tokenId: number) => {
    try {
      setIsTransferring(true);
      await writeTransfer({
        address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
        abi: LAYERED_OPTIONS_ABI,
        functionName: 'safeTransferFrom',
        args: [from as `0x${string}`, to as `0x${string}`, BigInt(tokenId), BigInt(1), '0x'],
      });
    } catch (error) {
      setIsTransferring(false);
      throw error;
    }
  };

  // Add supported asset (admin function)
  const addSupportedAsset = async (assetAddress: string) => {
    await writeAddAsset({
      address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
      abi: LAYERED_OPTIONS_ABI,
      functionName: 'addSupportedAsset',
      args: [assetAddress as `0x${string}`],
    });
  };

  // Reset loading states when transactions complete
  if (isCreateSuccess) setIsCreating(false);
  if (isChildSuccess) setIsCreatingChild(false);
  if (isExerciseSuccess) setIsExercising(false);
  if (isTransferSuccess) setIsTransferring(false);

  return {
    // Functions
    createLayeredOption,
    createChildOption,
    exerciseOption,
    transferOption,
    addSupportedAsset,
    
    // States
    isCreating: isCreating || isCreatePending,
    isCreatingChild: isCreatingChild || isChildPending,
    isExercising: isExercising || isExercisePending,
    isTransferring: isTransferring || isTransferPending,
    
    // Transaction hashes
    createHash,
    createChildHash,
    exerciseHash,
    transferHash,
    addAssetHash,
    
    // Success states
    isCreateSuccess,
    isChildSuccess,
    isExerciseSuccess,
    isTransferSuccess,
    
    // Data
    nextTokenId: nextTokenId ? Number(nextTokenId) : 1,
  };
}

// Hook to get option details
export function useOptionDetails(tokenId?: number) {
  const { data: optionData, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
    abi: LAYERED_OPTIONS_ABI,
    functionName: 'getOption',
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: !!tokenId,
    },
  });

  const option: LayeredOption | undefined = optionData ? {
    creator: optionData.creator,
    baseAsset: optionData.baseAsset,
    strikePrice: optionData.strikePrice,
    expirationTime: optionData.expirationTime,
    premium: optionData.premium,
    isExercised: optionData.isExercised,
    parentId: optionData.parentId,
  } : undefined;

  return {
    option,
    isLoading,
    error,
    // Formatted values for display
    formattedStrike: option ? formatUnits(option.strikePrice, 18) : '0',
    formattedPremium: option ? formatUnits(option.premium, 18) : '0',
    expirationDate: option ? new Date(Number(option.expirationTime) * 1000) : null,
    isExpired: option ? Number(option.expirationTime) * 1000 < Date.now() : false,
  };
}

// Hook to get user's option balance
export function useUserOptionBalance(userAddress?: string, tokenId?: number) {
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
    abi: LAYERED_OPTIONS_ABI,
    functionName: 'balanceOf',
    args: userAddress && tokenId ? [userAddress as `0x${string}`, BigInt(tokenId)] : undefined,
    query: {
      enabled: !!userAddress && !!tokenId,
    },
  });

  return {
    balance: balance ? Number(balance) : 0,
    hasOption: balance ? Number(balance) > 0 : false,
  };
}

// Hook for token operations (minting test tokens)
export function useTokenOperations() {
  const { writeContract: writeMint } = useWriteContract();
  const { writeContract: writeApprove } = useWriteContract();

  const mintTestTokens = async (tokenAddress: string, amount: string) => {
    const parsedAmount = parseUnits(amount, 18);
    await writeMint({
      address: tokenAddress as `0x${string}`,
      abi: MOCK_ERC20_ABI,
      functionName: 'mint',
      args: [CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING, parsedAmount],
    });
  };

  const approveTokens = async (tokenAddress: string, amount: string) => {
    const parsedAmount = parseUnits(amount, 18);
    await writeApprove({
      address: tokenAddress as `0x${string}`,
      abi: MOCK_ERC20_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING, parsedAmount],
    });
  };

  return {
    mintTestTokens,
    approveTokens,
  };
}
import {
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  CONTRACT_ADDRESSES,
  LAYERED_OPTIONS_ABI,
  MOCK_ERC20_ABI,
  OptionType,
  type LayeredOption,
} from "../contracts/config";
import { useState } from "react";

export interface CreateOptionParams {
  baseAsset: string;
  strikePrice: string; // In dollars (e.g., "45000")
  expirationDays: number;
  premium: string; // Premium amount
  // premiumToken REMOVED - writers provide collateral, not premium
  optionType: OptionType; // CALL or PUT
  parentTokenId?: number; // 0 for root options
}

export interface CreateChildOptionParams {
  parentId: number;
  strikePrice: string; // In dollars
  // expirationDays REMOVED - child options inherit parent maturity automatically
  // optionType REMOVED - child options inherit parent option type
}

export function useLayeredOptions() {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isExercising, setIsExercising] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Write contract hooks
  const { writeContract: writeCreateOption, data: createHash } =
    useWriteContract();
  const { writeContract: writeCreateChild, data: createChildHash } =
    useWriteContract();
  const { writeContract: writePurchase, data: purchaseHash } =
    useWriteContract();
  const { writeContract: writeExercise, data: exerciseHash } =
    useWriteContract();
  const { writeContract: writeTransfer, data: transferHash } =
    useWriteContract();
  const { writeContract: writeApprove } = useWriteContract();
  const { writeContract: writeAddAsset, data: addAssetHash } =
    useWriteContract();

  // Wait for transaction confirmations
  const { isLoading: isCreatePending, isSuccess: isCreateSuccess } =
    useWaitForTransactionReceipt({
      hash: createHash,
    });
  const { isLoading: isChildPending, isSuccess: isChildSuccess } =
    useWaitForTransactionReceipt({
      hash: createChildHash,
    });
  const { isLoading: isPurchasePending, isSuccess: isPurchaseSuccess } =
    useWaitForTransactionReceipt({
      hash: purchaseHash,
    });
  const { isLoading: isExercisePending, isSuccess: isExerciseSuccess } =
    useWaitForTransactionReceipt({
      hash: exerciseHash,
    });
  const { isLoading: isTransferPending, isSuccess: isTransferSuccess } =
    useWaitForTransactionReceipt({
      hash: transferHash,
    });

  // Read contract hooks
  const { data: nextTokenId } = useReadContract({
    address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
    abi: LAYERED_OPTIONS_ABI,
    functionName: "nextTokenId",
  });

  // Create a parent layered option
  const createLayeredOption = async (params: CreateOptionParams) => {
    try {
      setIsCreating(true);
      
      // First approve the base asset for collateral
      setIsApproving(true);
      await writeApprove({
        address: params.baseAsset as `0x${string}`,
        abi: MOCK_ERC20_ABI,
        functionName: "approve",
        args: [
          CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
          parseUnits("1000000", 18) // Approve large amount for simplicity
        ]
      });
      
      // Wait a moment for approval to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsApproving(false);
      
      const strikePrice = parseUnits(params.strikePrice, 18);
      const maturity = BigInt(
        Math.floor(Date.now() / 1000) + params.expirationDays * 24 * 60 * 60
      );
      const premium = parseUnits(params.premium, 18); // Premium in wei for calculations
      const parentTokenId = BigInt(params.parentTokenId || 0);

      await writeCreateOption({
        address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
        abi: LAYERED_OPTIONS_ABI,
        functionName: "createLayeredOption",
        args: [
          params.baseAsset as `0x${string}`,
          strikePrice,
          maturity, // Changed from expirationTime to maturity
          premium,
          parentTokenId,
          params.optionType,
          // premiumToken parameter REMOVED - matches contract ABI
        ],
        // value REMOVED - writers provide collateral, not pay premium via ETH
      });
    } catch (error) {
      setIsCreating(false);
      setIsApproving(false);
      throw error;
    }
  };

  // Create a child option (inherits parent maturity automatically)
  const createChildOption = async (params: CreateChildOptionParams) => {
    try {
      setIsCreatingChild(true);
      const strikePrice = parseUnits(params.strikePrice, 18);
      // No expiration time needed - child inherits parent maturity
      // No option type needed - child inherits parent option type

      await writeCreateChild({
        address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
        abi: LAYERED_OPTIONS_ABI,
        functionName: "createChildOption",
        args: [
          BigInt(params.parentId),
          strikePrice,
          // Only 2 parameters - maturity and option type inherited from parent!
        ],
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
        functionName: "exerciseOption",
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
        functionName: "safeTransferFrom",
        args: [
          from as `0x${string}`,
          to as `0x${string}`,
          BigInt(tokenId),
          BigInt(1),
          "0x",
        ],
      });
    } catch (error) {
      setIsTransferring(false);
      throw error;
    }
  };

  // Purchase an existing option from another user
  const purchaseOption = async (tokenId: number) => {
    try {
      setIsPurchasing(true);
      
      // First approve USDC for premium payment
      setIsApproving(true);
      await writeApprove({
        address: CONTRACT_ADDRESSES.STABLECOIN as `0x${string}`,
        abi: MOCK_ERC20_ABI,
        functionName: "approve",
        args: [
          CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
          parseUnits("1000000", 6) // Approve large USDC amount (6 decimals)
        ]
      });
      
      // Wait a moment for approval to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsApproving(false);
      
      await writePurchase({
        address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
        abi: LAYERED_OPTIONS_ABI,
        functionName: "purchaseOption",
        args: [BigInt(tokenId)],
      });
    } catch (error) {
      setIsPurchasing(false);
      setIsApproving(false);
      throw error;
    }
  };

  // Add supported asset (admin function)
  const addSupportedAsset = async (assetAddress: string) => {
    await writeAddAsset({
      address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
      abi: LAYERED_OPTIONS_ABI,
      functionName: "addSupportedAsset",
      args: [assetAddress as `0x${string}`],
    });
  };

  // Reset loading states when transactions complete
  if (isCreateSuccess) setIsCreating(false);
  if (isChildSuccess) setIsCreatingChild(false);
  if (isPurchaseSuccess) setIsPurchasing(false);
  if (isExerciseSuccess) setIsExercising(false);
  if (isTransferSuccess) setIsTransferring(false);

  return {
    // Functions
    createLayeredOption,
    createChildOption,
    purchaseOption,
    exerciseOption,
    transferOption,
    addSupportedAsset,

    // States
    isCreating: isCreating || isCreatePending,
    isCreatingChild: isCreatingChild || isChildPending,
    isPurchasing: isPurchasing || isPurchasePending,
    isExercising: isExercising || isExercisePending,
    isTransferring: isTransferring || isTransferPending,
    isApproving, // Add approval state

    // Transaction hashes
    createHash,
    createChildHash,
    purchaseHash,
    exerciseHash,
    transferHash,
    addAssetHash,

    // Success states
    isCreateSuccess,
    isChildSuccess,
    isPurchaseSuccess,
    isExerciseSuccess,
    isTransferSuccess,

    // Data
    nextTokenId: nextTokenId ? Number(nextTokenId) : 1,
  };
}

// Hook to get option details
export function useOptionDetails(tokenId?: number) {
  const {
    data: optionData,
    isLoading,
    error,
  } = useReadContract({
    address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
    abi: LAYERED_OPTIONS_ABI,
    functionName: "getOption",
    args: tokenId ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: !!tokenId,
    },
  });

  const option: LayeredOption | undefined = optionData
    ? {
        baseAsset: optionData.baseAsset,
        strikePrice: optionData.strikePrice,
        expiry: optionData.expiry,
        premium: optionData.premium,
        parentTokenId: optionData.parentTokenId,
        optionType: optionData.optionType as OptionType,
        premiumToken: optionData.premiumToken,
        isExercised: optionData.isExercised,
      }
    : undefined;

  return {
    option,
    isLoading,
    error,
    // Formatted values for display
    formattedStrike: option ? formatUnits(option.strikePrice, 18) : "0",
    formattedPremium: option ? formatUnits(option.premium, 18) : "0",
    expirationDate: option ? new Date(Number(option.expiry) * 1000) : null,
    isExpired: option ? Number(option.expiry) * 1000 < Date.now() : false,
    optionTypeText: option
      ? option.optionType === OptionType.CALL
        ? "CALL"
        : "PUT"
      : "Unknown",
  };
}

// Hook to get user's option balance
export function useUserOptionBalance(userAddress?: string, tokenId?: number) {
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING,
    abi: LAYERED_OPTIONS_ABI,
    functionName: "balanceOf",
    args:
      userAddress && tokenId
        ? [userAddress as `0x${string}`, BigInt(tokenId)]
        : undefined,
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
      functionName: "mint",
      args: [CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING, parsedAmount],
    });
  };

  const approveTokens = async (tokenAddress: string, amount: string) => {
    const parsedAmount = parseUnits(amount, 18);
    await writeApprove({
      address: tokenAddress as `0x${string}`,
      abi: MOCK_ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESSES.LAYERED_OPTIONS_TRADING, parsedAmount],
    });
  };

  return {
    mintTestTokens,
    approveTokens,
  };
}

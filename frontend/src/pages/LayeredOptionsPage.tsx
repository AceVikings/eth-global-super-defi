import React, { useState, useMemo } from "react";
import { Navigation } from "../components/Navigation";
import { useAccount } from "wagmi";
import {
  useLayeredOptions,
  useOptionDetails,
  useUserOptionBalance,
  useTokenOperations,
  type CreateOptionParams,
  type CreateChildOptionParams,
} from "../hooks/useLayeredOptions";
import {
  useLayeredOptionsAPI,
  useUserLayeredOptions,
  useCapitalEfficiencyStats,
} from "../services/layeredOptionsAPI";
import { CONTRACT_ADDRESSES, OptionType } from "../contracts/config";
import PriceUpdateComponent from "../components/PriceUpdateComponent";
import TimeManipulationComponent from "../components/TimeManipulationComponent";
import { usePremiumCalculator } from "../hooks/usePremiumCalculator";

const LayeredOptionsPage = () => {
  const { address, isConnected } = useAccount();
  const [selectedTab, setSelectedTab] = useState<
    "create" | "purchase" | "manage" | "exercise" | "browse" | "demo"
  >("create");
  const [selectedTokenId, setSelectedTokenId] = useState<number>(1);
  const [viewTokenId, setViewTokenId] = useState<number>(1);

  // Forms state
  const [createForm, setCreateForm] = useState<CreateOptionParams>({
    baseAsset: CONTRACT_ADDRESSES.MOCK_WBTC,
    strikePrice: "45000",
    expirationDays: 30,
    premium: "0.001",
    // premiumToken REMOVED - writers provide collateral, not premium
    optionType: OptionType.CALL,
    parentTokenId: 0,
  });

  const [childForm, setChildForm] = useState<CreateChildOptionParams>({
    parentId: 1,
    strikePrice: "46000",
    // expirationDays and optionType removed - inherited from parent
  });

  const [transferForm, setTransferForm] = useState({
    to: "",
    tokenId: 1,
  });

  const [purchaseForm, setPurchaseForm] = useState({
    tokenId: 1,
  });

  // Hooks
  const {
    createLayeredOption,
    createChildOption,
    purchaseOption,
    exerciseOption,
    transferOption,
    addSupportedAsset,
    isCreating,
    isCreatingChild,
    isPurchasing,
    isExercising,
    isTransferring,
    isApproving,
    nextTokenId,
    createHash,
    createChildHash,
    exerciseHash,
    transferHash,
  } = useLayeredOptions();

  // API hooks for indexed data
  const { options: allOptions, loading: optionsLoading } =
    useLayeredOptionsAPI();
  const { userOptions, loading: userLoading } = useUserLayeredOptions(address);
  const { stats, loading: statsLoading } = useCapitalEfficiencyStats();

  const {
    option: viewOption,
    formattedStrike,
    formattedPremium,
    expirationDate,
    isExpired,
  } = useOptionDetails(viewTokenId);

  // Option details for purchase form
  const {
    option: purchaseViewOption,
    formattedStrike: purchaseFormattedStrike,
    formattedPremium: purchaseFormattedPremium,
    expirationDate: purchaseExpirationDate,
  } = useOptionDetails(purchaseForm.tokenId);

  const { balance: userBalance, hasOption } = useUserOptionBalance(
    address,
    selectedTokenId
  );
  const { mintTestTokens } = useTokenOperations();

  // Premium calculation hook
  const { priceData, calculateOptionPremium, refreshPrices } =
    usePremiumCalculator();

  // Calculate premium for current form values
  const calculatedPremium = useMemo(() => {
    if (!createForm.strikePrice || !createForm.expirationDays) {
      return { premium: "0", loading: false, error: null };
    }

    // Calculate expiration date from days
    const expirationDate = new Date(
      Date.now() + createForm.expirationDays * 24 * 60 * 60 * 1000
    );

    return calculateOptionPremium({
      baseAsset: createForm.baseAsset,
      strikePrice: createForm.strikePrice,
      expirationDate,
      optionType: createForm.optionType === OptionType.CALL ? "CALL" : "PUT",
    });
  }, [
    createForm.baseAsset,
    createForm.strikePrice,
    createForm.expirationDays,
    createForm.optionType,
    calculateOptionPremium,
  ]);

  // Calculate premium for child options (using parent option data)
  const calculatedChildPremium = useMemo(() => {
    if (!childForm.strikePrice) {
      return { premium: "0", loading: false, error: null };
    }

    // Get parent option details to inherit maturity and option type
    const parentOption = allOptions?.find(opt => opt.tokenId === String(childForm.parentId));
    if (!parentOption) {
      return { premium: "0", loading: false, error: "Parent option not found" };
    }

    return calculateOptionPremium({
      baseAsset: parentOption.baseAsset,
      strikePrice: childForm.strikePrice,
      expirationDate: new Date(parseInt(parentOption.expirationTime) * 1000), // Use parent maturity
      optionType: "CALL", // Assume CALL for now - we'll get this from contract later
    });
  }, [
    childForm.strikePrice,
    childForm.parentId,
    allOptions,
    calculateOptionPremium,
  ]);

  // Handle form submissions
  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;

    // Check if premium calculation is ready
    if (calculatedPremium.loading) {
      alert("Please wait for premium calculation to complete");
      return;
    }

    if (calculatedPremium.error) {
      alert(`Premium calculation error: ${calculatedPremium.error}`);
      return;
    }

    try {
      // Create form with calculated premium
      const formWithCalculatedPremium = {
        ...createForm,
        premium: calculatedPremium.premium,
      };

      await createLayeredOption(formWithCalculatedPremium);
    } catch (error) {
      console.error("Failed to create option:", error);
    }
  };

  // Smart UI: Handle option type change
  const handleOptionTypeChange = (optionType: OptionType) => {
    const newForm = { ...createForm, optionType };

    // Auto-update base asset for PUT options
    if (optionType === OptionType.PUT) {
      newForm.baseAsset = CONTRACT_ADDRESSES.STABLECOIN; // USDC for PUT
    } else {
      newForm.baseAsset = CONTRACT_ADDRESSES.MOCK_WBTC; // WBTC for CALL
    }

    setCreateForm(newForm);
  };

  // Smart UI: Auto-fill child form based on parent data
  const handleParentIdChange = (parentId: number) => {
    const newChildForm = { ...childForm, parentId };
    
    // Child option will automatically inherit parent's maturity and option type
    // No additional form fields need to be updated
    
    setChildForm(newChildForm);
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;

    // Check if premium calculation is ready
    if (calculatedChildPremium.loading) {
      alert("Please wait for premium calculation to complete");
      return;
    }

    if (calculatedChildPremium.error) {
      alert(`Premium calculation error: ${calculatedChildPremium.error}`);
      return;
    }

    try {
      // For child options, the premium is automatically calculated and paid by the protocol
      // based on the parent option collateral, so we don't need to set it explicitly
      await createChildOption(childForm);
    } catch (error) {
      console.error("Failed to create child option:", error);
    }
  };

  const handleExerciseOption = async () => {
    if (!isConnected) return;

    try {
      await exerciseOption(selectedTokenId);
    } catch (error) {
      console.error("Failed to exercise option:", error);
    }
  };

  const handleTransferOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) return;

    try {
      await transferOption(address, transferForm.to, transferForm.tokenId);
    } catch (error) {
      console.error("Failed to transfer option:", error);
    }
  };

  const handlePurchaseOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;

    try {
      await purchaseOption(purchaseForm.tokenId);
    } catch (error) {
      console.error("Failed to purchase option:", error);
    }
  };

  const handleMintTestTokens = async () => {
    if (!isConnected) return;

    try {
      await mintTestTokens(CONTRACT_ADDRESSES.MOCK_WBTC, "10");
    } catch (error) {
      console.error("Failed to mint test tokens:", error);
    }
  };

  const handleMintUSDC = async () => {
    if (!isConnected) return;

    try {
      // Mint 10,000 USDC (6 decimals)
      await mintTestTokens(CONTRACT_ADDRESSES.STABLECOIN, "10000");
    } catch (error) {
      console.error("Failed to mint USDC:", error);
    }
  };

  const handleAddSupportedAsset = async () => {
    if (!isConnected) return;

    try {
      await addSupportedAsset(CONTRACT_ADDRESSES.MOCK_WBTC);
    } catch (error) {
      console.error("Failed to add supported asset:", error);
    }
  };

  return (
    <div
      className="min-h-screen w-screen"
      style={{
        background: "var(--retro-black)",
        color: "var(--retro-off-white)",
      }}
    >
      <Navigation />

      <div className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1
              className="text-4xl md:text-6xl mb-4 font-mono uppercase tracking-wider"
              style={{
                color: "var(--retro-white)",
                textShadow: "0 0 20px var(--retro-glow)",
              }}
            >
              LAYERED OPTIONS
            </h1>
            <p
              className="text-xl mb-4 font-mono"
              style={{ color: "var(--retro-green)" }}
            >
              &gt; REVOLUTIONARY CAPITAL-EFFICIENT OPTIONS ON CITREA
            </p>
            <div className="terminal-panel max-w-2xl mx-auto">
              <p
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--retro-amber)" }}
              >
                [INFO] WHAT ARE LAYERED OPTIONS?
              </p>
              <p className="text-sm font-mono leading-relaxed">
                CREATE PARENT OPTIONS THAT SPAWN MULTIPLE CHILD OPTIONS,
                <br />
                REDUCING COLLATERAL REQUIREMENTS BY 65-85% VS TRADITIONAL.
                <br />
                FULL FUNCTIONALITY. MAXIMUM EFFICIENCY.
              </p>
            </div>
          </div>

          {!isConnected && (
            <div className="text-center mb-8">
              <div className="terminal-window">
                <p
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--retro-amber)" }}
                >
                  [WARNING] WALLET NOT CONNECTED
                </p>
                <p style={{ color: "var(--retro-off-white)" }}>
                  PLEASE CONNECT YOUR WALLET TO ACCESS LAYERED OPTIONS SYSTEM
                </p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="terminal-panel flex gap-2">
              {(
                ["create", "purchase", "manage", "exercise", "browse", "demo"] as const
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`px-6 py-3 font-mono text-sm transition-all border ${
                    selectedTab === tab
                      ? "retro-button-primary"
                      : "retro-button"
                  }`}
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {tab === "demo" ? "[DEMO]" : `[${tab.toUpperCase()}]`}
                </button>
              ))}
            </div>
          </div>

          {/* Create Tab */}
          {selectedTab === "create" && (
            <div className="space-y-8">
              {/* Current Market Prices Display */}
              <div className="terminal-panel">
                <div className="flex justify-between items-center mb-4">
                  <h3
                    className="text-xl font-mono font-bold uppercase tracking-wider"
                    style={{ color: "var(--retro-amber)" }}
                  >
                    [CURRENT MARKET PRICES]
                  </h3>
                  <button
                    onClick={refreshPrices}
                    disabled={priceData.loading}
                    className="retro-button-secondary px-3 py-1 font-mono text-xs"
                  >
                    {priceData.loading ? "UPDATING..." : "REFRESH"}
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="terminal-window p-4">
                    <div className="flex justify-between items-center">
                      <span
                        className="font-mono text-sm"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        BTC:
                      </span>
                      <span
                        className="font-mono text-lg font-bold"
                        style={{ color: "var(--retro-green)" }}
                      >
                        {priceData.loading
                          ? "LOADING..."
                          : priceData.error
                          ? "ERROR"
                          : `$${parseFloat(priceData.btcPrice).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                  <div className="terminal-window p-4">
                    <div className="flex justify-between items-center">
                      <span
                        className="font-mono text-sm"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        ETH:
                      </span>
                      <span
                        className="font-mono text-lg font-bold"
                        style={{ color: "var(--retro-green)" }}
                      >
                        {priceData.loading
                          ? "LOADING..."
                          : priceData.error
                          ? "ERROR"
                          : `$${parseFloat(priceData.ethPrice).toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </div>
                <p
                  className="text-xs mt-2 font-mono text-center"
                  style={{ color: "var(--retro-green)" }}
                >
                  PRICES UPDATE AUTOMATICALLY EVERY 30 SECONDS
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Create Parent Option */}
                <div className="terminal-panel">
                  <h3
                    className="text-2xl font-mono font-bold mb-4 uppercase tracking-wider"
                    style={{ color: "var(--retro-green)" }}
                  >
                    [CREATE PARENT OPTION]
                  </h3>
                  <form onSubmit={handleCreateOption} className="space-y-4">
                    <div>
                      <label
                        className="block text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Option Type
                      </label>
                      <select
                        value={createForm.optionType}
                        onChange={(e) =>
                          handleOptionTypeChange(
                            parseInt(e.target.value) as OptionType
                          )
                        }
                        className="retro-input w-full px-4 py-3 font-mono"
                        style={{
                          background: "var(--retro-dark-gray)",
                          color: "var(--retro-off-white)",
                          border: "1px solid var(--retro-border)",
                        }}
                      >
                        <option value={OptionType.CALL}>CALL OPTION</option>
                        <option value={OptionType.PUT}>PUT OPTION</option>
                      </select>
                    </div>

                    <div>
                      <label
                        className="block text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Base Asset
                      </label>
                      <select
                        value={createForm.baseAsset}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            baseAsset: e.target.value,
                          })
                        }
                        className="retro-input w-full px-4 py-3 font-mono"
                        style={{
                          background: "var(--retro-dark-gray)",
                          color: "var(--retro-off-white)",
                          border: "1px solid var(--retro-border)",
                        }}
                        disabled={createForm.optionType === OptionType.PUT} // Auto-managed for PUT
                      >
                        {createForm.optionType === OptionType.CALL ? (
                          <>
                            <option value={CONTRACT_ADDRESSES.MOCK_WBTC}>
                              WBTC
                            </option>
                            <option value={CONTRACT_ADDRESSES.MOCK_WETH}>
                              WETH
                            </option>
                          </>
                        ) : (
                          <option value={CONTRACT_ADDRESSES.STABLECOIN}>
                            USDC
                          </option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label
                        className="block text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Strike Price (USD)
                      </label>
                      <input
                        type="number"
                        value={createForm.strikePrice}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            strikePrice: e.target.value,
                          })
                        }
                        className="retro-input w-full px-4 py-3 font-mono"
                        style={{
                          background: "var(--retro-dark-gray)",
                          color: "var(--retro-off-white)",
                          border: "1px solid var(--retro-border)",
                        }}
                        placeholder="45000"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Expiration (days)
                      </label>
                      <input
                        type="number"
                        value={createForm.expirationDays}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            expirationDays: parseInt(e.target.value),
                          })
                        }
                        className="retro-input w-full px-4 py-3 font-mono"
                        style={{
                          background: "var(--retro-dark-gray)",
                          color: "var(--retro-off-white)",
                          border: "1px solid var(--retro-border)",
                        }}
                        placeholder="30"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Calculated Premium (USDC)
                      </label>
                      <div className="terminal-window p-4 font-mono">
                        {calculatedPremium.loading ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="animate-pulse"
                              style={{ color: "var(--retro-amber)" }}
                            >
                              CALCULATING...
                            </span>
                          </div>
                        ) : calculatedPremium.error ? (
                          <div style={{ color: "var(--retro-red)" }}>
                            ERROR: {calculatedPremium.error}
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span
                              style={{
                                color: "var(--retro-green)",
                                fontSize: "1.2em",
                                fontWeight: "bold",
                              }}
                            >
                              {calculatedPremium.premium} USDC
                            </span>
                            <span
                              style={{ color: "var(--retro-amber)" }}
                              className="text-xs"
                            >
                              REAL-TIME
                            </span>
                          </div>
                        )}
                      </div>
                      <p
                        className="text-xs mt-1 font-mono"
                        style={{ color: "var(--retro-green)" }}
                      >
                        PREMIUM AUTO-CALCULATED FROM CURRENT MARKET PRICES
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={!isConnected || isCreating}
                      className="retro-button-primary w-full py-3 px-6 font-mono"
                    >
                      {isCreating ? "CREATING..." : "CREATE PARENT OPTION"}
                    </button>

                    {createHash && (
                      <div className="terminal-window p-2">
                        <p
                          className="text-xs font-mono break-all"
                          style={{ color: "var(--retro-green)" }}
                        >
                          TX: {createHash}
                        </p>
                      </div>
                    )}
                  </form>
                </div>

                {/* Create Child Option */}
                <div className="terminal-panel">
                  <h3
                    className="text-2xl font-mono font-bold mb-4 uppercase tracking-wider"
                    style={{ color: "var(--retro-amber)" }}
                  >
                    [CREATE CHILD OPTION]
                  </h3>
                  <form onSubmit={handleCreateChild} className="space-y-4">
                    <div>
                      <label
                        className="block text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Parent Option ID
                      </label>
                      <input
                        type="number"
                        value={childForm.parentId}
                        onChange={(e) =>
                          handleParentIdChange(parseInt(e.target.value))
                        }
                        className="retro-input w-full px-4 py-3 font-mono"
                        style={{
                          background: "var(--retro-dark-gray)",
                          color: "var(--retro-off-white)",
                          border: "1px solid var(--retro-border)",
                        }}
                        placeholder="1"
                      />
                      <p
                        className="text-xs mt-1 font-mono"
                        style={{ color: "var(--retro-green)" }}
                      >
                        OTHER FIELDS AUTO-FILLED FROM PARENT DATA
                      </p>
                    </div>

                    <div>
                      <label
                        className="block text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Child Strike Price (USD)
                      </label>
                      <input
                        type="number"
                        value={childForm.strikePrice}
                        onChange={(e) =>
                          setChildForm({
                            ...childForm,
                            strikePrice: e.target.value,
                          })
                        }
                        className="retro-input w-full px-4 py-3 font-mono"
                        style={{
                          background: "var(--retro-dark-gray)",
                          color: "var(--retro-off-white)",
                          border: "1px solid var(--retro-border)",
                        }}
                        placeholder="46000"
                      />
                    </div>

                    {/* Child options automatically inherit parent's expiration and option type */}
                    <div className="bg-gray-800 border border-green-500 p-4 rounded">
                      <p className="text-green-400 font-mono text-sm">
                        ℹ️ AUTOMATIC INHERITANCE: Child options will inherit the parent option's maturity date and option type (CALL/PUT)
                      </p>
                    </div>

                    <div>
                      <label
                        className="block text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Calculated Premium (USDC)
                      </label>
                      <div className="terminal-window p-4 font-mono">
                        {calculatedChildPremium.loading ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="animate-pulse"
                              style={{ color: "var(--retro-amber)" }}
                            >
                              CALCULATING...
                            </span>
                          </div>
                        ) : calculatedChildPremium.error ? (
                          <div style={{ color: "var(--retro-red)" }}>
                            ERROR: {calculatedChildPremium.error}
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span
                              style={{
                                color: "var(--retro-green)",
                                fontSize: "1.2em",
                                fontWeight: "bold",
                              }}
                            >
                              {calculatedChildPremium.premium} USDC
                            </span>
                            <span
                              style={{ color: "var(--retro-amber)" }}
                              className="text-xs"
                            >
                              REAL-TIME
                            </span>
                          </div>
                        )}
                      </div>
                      <p
                        className="text-xs mt-1 font-mono"
                        style={{ color: "var(--retro-green)" }}
                      >
                        PAID FROM PARENT OPTION COLLATERAL
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={!isConnected || isCreatingChild}
                      className="retro-button-primary w-full py-3 px-6 font-mono"
                    >
                      {isCreatingChild ? "CREATING..." : "CREATE CHILD OPTION"}
                    </button>

                    {createChildHash && (
                      <div className="terminal-window p-2">
                        <p
                          className="text-xs font-mono break-all"
                          style={{ color: "var(--retro-green)" }}
                        >
                          TX: {createChildHash}
                        </p>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Token Minting Section */}
              <div className="mt-8">
                <div className="terminal-panel">
                  <h3
                    className="text-xl font-mono font-bold mb-4 uppercase tracking-wider"
                    style={{ color: "var(--retro-amber)" }}
                  >
                    [TOKEN MINTING UTILITIES]
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      onClick={handleMintUSDC}
                      disabled={!isConnected}
                      className="retro-button w-full py-3 px-4 font-mono text-sm"
                    >
                      MINT 10K USDC
                    </button>
                    <button
                      onClick={handleMintTestTokens}
                      disabled={!isConnected}
                      className="retro-button w-full py-3 px-4 font-mono text-sm"
                    >
                      MINT 10 WBTC
                    </button>
                    <button
                      onClick={handleAddSupportedAsset}
                      disabled={!isConnected}
                      className="retro-button w-full py-3 px-4 font-mono text-sm"
                    >
                      ADD WBTC SUPPORT
                    </button>
                  </div>
                  <p
                    className="text-xs mt-2 font-mono text-center"
                    style={{ color: "var(--retro-green)" }}
                  >
                    MINT TOKENS FOR TESTING - THESE ARE MOCK TOKENS
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Purchase Tab */}
          {selectedTab === "purchase" && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Purchase Option Form */}
              <div className="terminal-panel">
                <div className="terminal-header">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 text-center">
                    [PURCHASE EXISTING OPTION]
                  </div>
                </div>

                <form onSubmit={handlePurchaseOption} className="space-y-6">
                  <div>
                    <label
                      className="block text-sm font-mono mb-2 uppercase tracking-wide"
                      style={{ color: "var(--retro-amber)" }}
                    >
                      Option Token ID
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={purchaseForm.tokenId}
                      onChange={(e) =>
                        setPurchaseForm({
                          ...purchaseForm,
                          tokenId: parseInt(e.target.value) || 1,
                        })
                      }
                      className="retro-input w-full px-4 py-3 font-mono"
                      style={{
                        background: "var(--retro-dark-gray)",
                        color: "var(--retro-off-white)",
                        border: "1px solid var(--retro-border)",
                      }}
                      placeholder="1"
                    />
                    <p
                      className="text-xs mt-1 font-mono"
                      style={{ color: "var(--retro-green)" }}
                    >
                      ENTER THE TOKEN ID OF THE OPTION YOU WANT TO PURCHASE
                    </p>
                  </div>

                  {/* Option Details Display */}
                  {purchaseForm.tokenId && (
                    <div className="terminal-window p-4 font-mono">
                      <h4
                        className="text-sm font-semibold mb-2 uppercase"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        OPTION DETAILS - TOKEN #{purchaseForm.tokenId}
                      </h4>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span style={{ color: "var(--retro-off-white)" }}>
                            STATUS:
                          </span>
                          <span style={{ color: "var(--retro-green)" }}>
                            {purchaseViewOption ? "AVAILABLE" : "NOT FOUND"}
                          </span>
                        </div>
                        {purchaseViewOption && (
                          <>
                            <div className="flex justify-between">
                              <span style={{ color: "var(--retro-off-white)" }}>
                                TYPE:
                              </span>
                              <span style={{ color: "var(--retro-green)" }}>
                                {purchaseViewOption.baseAsset === CONTRACT_ADDRESSES.MOCK_WBTC ? "WBTC" : "WETH"} {purchaseViewOption.optionType === 0 ? "CALL" : "PUT"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ color: "var(--retro-off-white)" }}>
                                STRIKE:
                              </span>
                              <span style={{ color: "var(--retro-green)" }}>
                                ${purchaseFormattedStrike} USDC
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ color: "var(--retro-off-white)" }}>
                                PREMIUM:
                              </span>
                              <span style={{ color: "var(--retro-green)" }}>
                                {purchaseFormattedPremium} ETH
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ color: "var(--retro-off-white)" }}>
                                EXPIRES:
                              </span>
                              <span style={{ color: "var(--retro-green)" }}>
                                {purchaseExpirationDate?.toLocaleDateString()}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isConnected || isPurchasing || !purchaseViewOption}
                    className="retro-button-primary w-full py-4 font-mono text-sm uppercase tracking-wider disabled:opacity-50"
                  >
                    {isPurchasing ? "PURCHASING..." : "PURCHASE OPTION"}
                  </button>
                </form>
              </div>

              {/* Info Panel */}
              <div className="space-y-6">
                <div className="terminal-window">
                  <div className="terminal-title">
                    [INFO] PURCHASING EUROPEAN OPTIONS
                  </div>
                  <div className="terminal-content font-mono text-sm leading-relaxed">
                    <p className="mb-4">
                      PURCHASE EXISTING EUROPEAN-STYLE OPTIONS:
                    </p>
                    <ul className="space-y-2">
                      <li style={{ color: "var(--retro-green)" }}>
                        → PAY PREMIUM IN USDC TO ACQUIRE OPTION RIGHTS
                      </li>
                      <li style={{ color: "var(--retro-green)" }}>
                        → OPTIONS SETTLE AUTOMATICALLY AT MATURITY DATE
                      </li>
                      <li style={{ color: "var(--retro-amber)" }}>
                        → CANNOT EXERCISE EARLY - WAIT FOR MATURITY
                      </li>
                      <li style={{ color: "var(--retro-green)" }}>
                        → CREATE CHILD OPTIONS IF PARENT OPTION
                      </li>
                      <li style={{ color: "var(--retro-green)" }}>
                        → TRANSFER TO OTHER USERS ANYTIME
                      </li>
                    </ul>
                    <div className="mt-4 p-2 border border-blue-500">
                      <p style={{ color: "var(--retro-blue)" }} className="text-xs">
                        ℹ️ EUROPEAN STYLE: Options automatically settle at maturity based on spot price vs strike price. No early exercise allowed.
                      </p>
                    </div>
                    <div className="mt-2 p-2 border border-yellow-500">
                      <p style={{ color: "var(--retro-amber)" }}>
                        ⚠️ ENSURE SUFFICIENT USDC BALANCE FOR PREMIUM PAYMENT
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manage Tab */}
          {selectedTab === "manage" && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Option Details Viewer */}
              <div className="terminal-panel">
                <h3
                  className="text-2xl font-mono font-bold mb-4 uppercase tracking-wider"
                  style={{ color: "var(--retro-green)" }}
                >
                  [OPTION DETAILS]
                </h3>
                <div className="mb-4">
                  <label
                    className="block text-sm font-mono mb-2 uppercase tracking-wide"
                    style={{ color: "var(--retro-amber)" }}
                  >
                    View Option ID
                  </label>
                  <input
                    type="number"
                    value={viewTokenId}
                    onChange={(e) => setViewTokenId(parseInt(e.target.value))}
                    className="retro-input w-full px-4 py-3"
                    placeholder="1"
                  />
                </div>

                {viewOption && (
                  <div className="space-y-3">
                    <div className="terminal-window p-4">
                      <p className="font-mono text-sm mb-1">
                        BASE ASSET:{" "}
                        <span className="text-retro-green">
                          {viewOption.baseAsset}
                        </span>
                      </p>
                      <p className="font-mono text-sm mb-1">
                        TYPE:{" "}
                        <span
                          className={`${
                            viewOption.optionType === OptionType.CALL
                              ? "text-retro-green"
                              : "text-retro-amber"
                          }`}
                        >
                          {viewOption.optionType === OptionType.CALL
                            ? "CALL"
                            : "PUT"}
                        </span>
                      </p>
                      <p className="font-mono text-sm mb-1">
                        STRIKE:{" "}
                        <span className="text-retro-green">
                          ${formattedStrike}
                        </span>
                      </p>
                      <p className="font-mono text-sm mb-1">
                        PREMIUM:{" "}
                        <span className="text-retro-green">
                          {formattedPremium}{" "}
                          {viewOption.premiumToken ===
                          "0x0000000000000000000000000000000000000000"
                            ? "cBTC"
                            : "USDC"}
                        </span>
                      </p>
                      <p className="font-mono text-sm mb-1">
                        EXPIRY:{" "}
                        <span className="text-retro-green">
                          {expirationDate?.toLocaleDateString()}
                        </span>
                      </p>
                      <p className="font-mono text-sm mb-1">
                        PARENT ID:{" "}
                        <span className="text-retro-green">
                          {viewOption.parentTokenId.toString()}
                        </span>
                      </p>
                      <p
                        className={`font-mono text-sm mb-1 ${
                          viewOption.isExercised
                            ? "text-retro-red"
                            : "text-retro-green"
                        }`}
                      >
                        STATUS:{" "}
                        {viewOption.isExercised ? "EXERCISED" : "ACTIVE"}
                      </p>
                      <p
                        className={`font-mono text-sm ${
                          isExpired ? "text-retro-amber" : "text-retro-green"
                        }`}
                      >
                        {isExpired ? "[WARNING] EXPIRED" : "[OK] VALID"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Transfer Option */}
              <div className="terminal-panel">
                <h3
                  className="text-2xl font-mono font-bold mb-4 uppercase tracking-wider"
                  style={{ color: "var(--retro-amber)" }}
                >
                  [TRANSFER OPTION]
                </h3>
                <form onSubmit={handleTransferOption} className="space-y-4">
                  <div>
                    <label
                      className="block text-sm font-mono mb-2 uppercase tracking-wide"
                      style={{ color: "var(--retro-amber)" }}
                    >
                      Token ID to Transfer
                    </label>
                    <input
                      type="number"
                      value={transferForm.tokenId}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          tokenId: parseInt(e.target.value),
                        })
                      }
                      className="retro-input w-full px-4 py-3"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-sm font-mono mb-2 uppercase tracking-wide"
                      style={{ color: "var(--retro-amber)" }}
                    >
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={transferForm.to}
                      onChange={(e) =>
                        setTransferForm({ ...transferForm, to: e.target.value })
                      }
                      className="retro-input w-full px-4 py-3 font-mono text-xs"
                      placeholder="0x..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={
                      !isConnected || isTransferring || !transferForm.to
                    }
                    className="retro-button-primary w-full py-3 px-6 font-mono"
                  >
                    {isTransferring ? "TRANSFERRING..." : "TRANSFER OPTION"}
                  </button>
                  {transferHash && (
                    <div className="terminal-window p-2">
                      <p
                        className="text-xs font-mono break-all"
                        style={{ color: "var(--retro-green)" }}
                      >
                        TX: {transferHash}
                      </p>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* Exercise Tab */}
          {selectedTab === "exercise" && (
            <div className="max-w-2xl mx-auto">
              <div className="terminal-panel">
                <h3
                  className="text-2xl font-mono font-bold mb-4 uppercase tracking-wider"
                  style={{ color: "var(--retro-green)" }}
                >
                  [EXERCISE OPTION]
                </h3>
                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-sm font-mono mb-2 uppercase tracking-wide"
                      style={{ color: "var(--retro-amber)" }}
                    >
                      Option ID to Exercise
                    </label>
                    <input
                      type="number"
                      value={selectedTokenId}
                      onChange={(e) =>
                        setSelectedTokenId(parseInt(e.target.value))
                      }
                      className="retro-input w-full px-4 py-3"
                      placeholder="1"
                    />
                  </div>

                  <div className="terminal-window p-4">
                    <p
                      className="font-mono text-sm mb-2 uppercase"
                      style={{ color: "var(--retro-amber)" }}
                    >
                      Your Balance for Token #{selectedTokenId}:
                    </p>
                    <p
                      className={`text-lg font-mono ${
                        hasOption ? "text-retro-green" : "text-retro-red"
                      }`}
                    >
                      {userBalance}{" "}
                      {hasOption
                        ? "[OK] YOU OWN THIS OPTION"
                        : "[ERROR] YOU DON'T OWN THIS OPTION"}
                    </p>
                  </div>

                  <button
                    onClick={handleExerciseOption}
                    disabled={!isConnected || isExercising || !hasOption}
                    className="retro-button-primary w-full py-3 px-6 font-mono"
                  >
                    {isExercising ? "EXERCISING..." : "EXECUTE OPTION"}
                  </button>
                  {exerciseHash && (
                    <div className="terminal-window p-4">
                      <p
                        className="font-mono text-sm mb-1"
                        style={{ color: "var(--retro-green)" }}
                      >
                        [SUCCESS] OPTION EXERCISED
                      </p>
                      <p
                        className="text-xs font-mono break-all"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        TX: {exerciseHash}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Browse Tab */}
          {selectedTab === "browse" && (
            <div className="space-y-8">
              {/* Stats Section */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="terminal-panel text-center">
                  <h4
                    className="text-xl font-mono font-bold mb-2 uppercase"
                    style={{ color: "var(--retro-amber)" }}
                  >
                    [TOTAL OPTIONS]
                  </h4>
                  <p
                    className="text-3xl font-mono font-bold"
                    style={{ color: "var(--retro-green)" }}
                  >
                    {statsLoading ? "..." : stats?.totalOptions || 0}
                  </p>
                </div>
                <div className="terminal-panel text-center">
                  <h4
                    className="text-xl font-mono font-bold mb-2 uppercase"
                    style={{ color: "var(--retro-amber)" }}
                  >
                    [PARENT OPTIONS]
                  </h4>
                  <p
                    className="text-3xl font-mono font-bold"
                    style={{ color: "var(--retro-green)" }}
                  >
                    {statsLoading ? "..." : stats?.parentOptions || 0}
                  </p>
                </div>
                <div className="terminal-panel text-center">
                  <h4
                    className="text-xl font-mono font-bold mb-2 uppercase"
                    style={{ color: "var(--retro-amber)" }}
                  >
                    [CHILD OPTIONS]
                  </h4>
                  <p
                    className="text-3xl font-mono font-bold"
                    style={{ color: "var(--retro-green)" }}
                  >
                    {statsLoading ? "..." : stats?.childOptions || 0}
                  </p>
                </div>
              </div>

              {/* Capital Efficiency Section */}
              {stats && (
                <div className="terminal-panel">
                  <h3
                    className="text-2xl font-mono font-bold mb-4 uppercase tracking-wider"
                    style={{ color: "var(--retro-green)" }}
                  >
                    [CAPITAL EFFICIENCY ANALYSIS]
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="terminal-window p-4">
                      <p
                        className="text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Traditional System Collateral:
                      </p>
                      <p className="text-2xl font-mono font-bold text-retro-red">
                        ${stats.totalTraditionalCollateral}
                      </p>
                    </div>
                    <div className="terminal-window p-4">
                      <p
                        className="text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Layered System Collateral:
                      </p>
                      <p
                        className="text-2xl font-mono font-bold"
                        style={{ color: "var(--retro-green)" }}
                      >
                        {stats.totalLayeredCollateral} cBTC
                      </p>
                    </div>
                    <div className="terminal-window p-4">
                      <p
                        className="text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Total Savings:
                      </p>
                      <p
                        className="text-2xl font-mono font-bold"
                        style={{ color: "var(--retro-green)" }}
                      >
                        ${stats.totalSavings}
                      </p>
                    </div>
                    <div className="terminal-window p-4">
                      <p
                        className="text-sm font-mono mb-2 uppercase tracking-wide"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        Savings Percentage:
                      </p>
                      <p
                        className="text-3xl font-mono font-bold"
                        style={{ color: "var(--retro-green)" }}
                      >
                        {stats.savingsPercentage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* All Options List */}
              <div className="terminal-panel">
                <div className="flex justify-between items-center mb-4">
                  <h3
                    className="text-2xl font-mono font-bold uppercase tracking-wider"
                    style={{ color: "var(--retro-amber)" }}
                  >
                    [ALL LAYERED OPTIONS]
                  </h3>
                  <div
                    className="text-sm font-mono"
                    style={{ color: "var(--retro-green)" }}
                  >
                    {optionsLoading
                      ? "LOADING..."
                      : `${allOptions.length} OPTIONS FOUND`}
                  </div>
                </div>

                {optionsLoading ? (
                  <div className="text-center py-8">
                    <div className="terminal-window p-4">
                      <p
                        className="font-mono animate-pulse"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        LOADING OPTIONS...
                      </p>
                    </div>
                  </div>
                ) : allOptions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="terminal-window p-4">
                      <p
                        className="text-lg font-mono"
                        style={{ color: "var(--retro-amber)" }}
                      >
                        NO LAYERED OPTIONS FOUND YET
                      </p>
                      <p
                        className="text-sm font-mono mt-2"
                        style={{ color: "var(--retro-green)" }}
                      >
                        CREATE THE FIRST OPTION TO GET STARTED!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {allOptions.map((option) => (
                      <div
                        key={option.tokenId}
                        className="terminal-window p-4 hover:bg-retro-black/80 transition-all border-2 border-retro-green/30"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-mono font-bold text-lg"
                              style={{ color: "var(--retro-green)" }}
                            >
                              TOKEN #{option.tokenId}
                            </span>
                            <span
                              className={`px-2 py-1 font-mono text-xs font-bold border ${
                                option.isParent
                                  ? "border-retro-green text-retro-green"
                                  : "border-retro-amber text-retro-amber"
                              }`}
                            >
                              {option.isParent ? "PARENT" : "CHILD"}
                            </span>
                            <span
                              className={`px-2 py-1 font-mono text-xs font-bold border ${
                                option.isExercised
                                  ? "border-retro-red text-retro-red"
                                  : option.isExpired
                                  ? "border-retro-amber text-retro-amber"
                                  : "border-retro-green text-retro-green"
                              }`}
                            >
                              {option.isExercised
                                ? "EXERCISED"
                                : option.isExpired
                                ? "EXPIRED"
                                : "ACTIVE"}
                            </span>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-sm font-mono"
                              style={{ color: "var(--retro-amber)" }}
                            >
                              STRIKE: ${option.formattedStrike}
                            </p>
                            <p
                              className="text-sm font-mono"
                              style={{ color: "var(--retro-amber)" }}
                            >
                              PREMIUM: {option.formattedPremium} cBTC
                            </p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm font-mono">
                          <div>
                            <p>
                              <span style={{ color: "var(--retro-amber)" }}>
                                CREATOR:
                              </span>{" "}
                              <span style={{ color: "var(--retro-green)" }}>
                                {option.creator.slice(0, 6)}...
                                {option.creator.slice(-4)}
                              </span>
                            </p>
                            <p>
                              <span style={{ color: "var(--retro-amber)" }}>
                                EXPIRES:
                              </span>{" "}
                              <span style={{ color: "var(--retro-green)" }}>
                                {new Date(
                                  option.expirationDate
                                ).toLocaleDateString()}
                              </span>
                            </p>
                          </div>
                          <div>
                            {!option.isParent && (
                              <p>
                                <span style={{ color: "var(--retro-amber)" }}>
                                  PARENT ID:
                                </span>{" "}
                                <span style={{ color: "var(--retro-green)" }}>
                                  #{option.parentId}
                                </span>
                              </p>
                            )}
                            <p>
                              <span style={{ color: "var(--retro-amber)" }}>
                                CREATED:
                              </span>{" "}
                              <span style={{ color: "var(--retro-green)" }}>
                                {new Date(
                                  option.timestamp
                                ).toLocaleDateString()}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User's Options */}
              {isConnected && (
                <div className="terminal-panel">
                  <div className="flex justify-between items-center mb-4">
                    <h3
                      className="text-2xl font-mono font-bold uppercase tracking-wider"
                      style={{ color: "var(--retro-green)" }}
                    >
                      [YOUR OPTIONS]
                    </h3>
                    <div
                      className="text-sm font-mono"
                      style={{ color: "var(--retro-amber)" }}
                    >
                      {userLoading
                        ? "LOADING..."
                        : `${userOptions.length} OPTIONS OWNED`}
                    </div>
                  </div>

                  {userLoading ? (
                    <div className="text-center py-8">
                      <div className="terminal-window p-4">
                        <p
                          className="font-mono animate-pulse"
                          style={{ color: "var(--retro-green)" }}
                        >
                          LOADING YOUR OPTIONS...
                        </p>
                      </div>
                    </div>
                  ) : userOptions.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="terminal-window p-4">
                        <p
                          className="text-lg font-mono"
                          style={{ color: "var(--retro-amber)" }}
                        >
                          YOU DON'T OWN ANY LAYERED OPTIONS YET
                        </p>
                        <p
                          className="text-sm font-mono mt-2"
                          style={{ color: "var(--retro-green)" }}
                        >
                          CREATE OR PURCHASE OPTIONS TO SEE THEM HERE!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userOptions.map((option) => (
                        <div
                          key={option.tokenId}
                          className="terminal-window p-4 border-l-4 border-retro-green"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-mono font-bold text-lg"
                                style={{ color: "var(--retro-green)" }}
                              >
                                TOKEN #{option.tokenId}
                              </span>
                              <span
                                className={`px-2 py-1 font-mono text-xs font-bold border ${
                                  option.isParent
                                    ? "border-retro-green text-retro-green"
                                    : "border-retro-amber text-retro-amber"
                                }`}
                              >
                                {option.isParent ? "PARENT" : "CHILD"}
                              </span>
                              <span className="px-2 py-1 font-mono text-xs font-bold border border-retro-amber text-retro-amber">
                                BALANCE: {option.balance}
                              </span>
                            </div>
                            <div className="text-right">
                              <p
                                className="text-sm font-mono"
                                style={{ color: "var(--retro-amber)" }}
                              >
                                STRIKE: ${option.formattedStrike}
                              </p>
                              <p
                                className="text-sm font-mono"
                                style={{ color: "var(--retro-amber)" }}
                              >
                                PREMIUM: {option.formattedPremium} cBTC
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-mono">
                                <span style={{ color: "var(--retro-amber)" }}>
                                  EXPIRES:
                                </span>{" "}
                                <span style={{ color: "var(--retro-green)" }}>
                                  {new Date(
                                    option.expirationDate
                                  ).toLocaleDateString()}
                                </span>
                              </p>
                              {!option.isParent && (
                                <p className="text-sm font-mono">
                                  <span style={{ color: "var(--retro-amber)" }}>
                                    PARENT ID:
                                  </span>{" "}
                                  <span style={{ color: "var(--retro-green)" }}>
                                    #{option.parentId}
                                  </span>
                                </p>
                              )}
                            </div>
                            {!option.isExercised && !option.isExpired && (
                              <button
                                onClick={() => {
                                  setSelectedTokenId(parseInt(option.tokenId));
                                  setSelectedTab("exercise");
                                }}
                                className="retro-button-secondary px-4 py-2 font-mono text-sm"
                              >
                                EXERCISE
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Demo Tab */}
          {selectedTab === "demo" && (
            <div className="space-y-8">
              <div className="terminal-panel">
                <h3
                  className="text-2xl font-mono font-bold mb-4 uppercase tracking-wider"
                  style={{ color: "var(--retro-green)" }}
                >
                  [DEMO CONTROLS]
                </h3>
                <p
                  className="font-mono mb-6"
                  style={{ color: "var(--retro-amber)" }}
                >
                  USE THESE CONTROLS TO MANIPULATE PRICES AND TIME FOR TESTING
                  OPTIONS BEHAVIOR. THESE TOOLS HELP DEMONSTRATE HOW OPTIONS
                  REACT TO PRICE MOVEMENTS AND TIME DECAY.
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Price Update Component */}
                  <div>
                    <PriceUpdateComponent />
                  </div>

                  {/* Time Manipulation Component */}
                  <div>
                    <TimeManipulationComponent />
                  </div>
                </div>
              </div>

              {/* Demo Instructions */}
              <div className="terminal-panel border-retro-amber">
                <h4
                  className="text-xl font-mono font-bold mb-4 uppercase tracking-wider"
                  style={{ color: "var(--retro-amber)" }}
                >
                  [DEMO INSTRUCTIONS]
                </h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="terminal-window p-4">
                    <h5
                      className="font-mono font-bold mb-2 uppercase"
                      style={{ color: "var(--retro-green)" }}
                    >
                      PRICE MANIPULATION
                    </h5>
                    <ul
                      className="text-sm space-y-1 font-mono"
                      style={{ color: "var(--retro-off-white)" }}
                    >
                      <li>• UPDATE BTC AND ETH PRICES VIA ORACLE CONTRACTS</li>
                      <li>• TEST HOW PRICE CHANGES AFFECT OPTION VALUES</li>
                      <li>• USE QUICK SCENARIOS FOR COMMON MARKET MOVEMENTS</li>
                      <li>
                        • PRICES UPDATE IMMEDIATELY AND AFFECT ALL CALCULATIONS
                      </li>
                    </ul>
                  </div>
                  <div className="terminal-window p-4">
                    <h5
                      className="font-mono font-bold mb-2 uppercase"
                      style={{ color: "var(--retro-green)" }}
                    >
                      TIME MANIPULATION
                    </h5>
                    <ul
                      className="text-sm space-y-1 font-mono"
                      style={{ color: "var(--retro-off-white)" }}
                    >
                      <li>• FAST-FORWARD TIME TO TEST OPTION EXPIRY</li>
                      <li>• SET SPECIFIC DATES FOR TESTING SCENARIOS</li>
                      <li>• OBSERVE TIME DECAY EFFECTS ON PREMIUMS</li>
                      <li>• TEST EXERCISE BEHAVIOR NEAR EXPIRATION</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-6 terminal-window p-4 border-retro-amber">
                  <p
                    className="text-sm font-mono"
                    style={{ color: "var(--retro-amber)" }}
                  >
                    <span className="font-bold">PRO TIP:</span> CREATE OPTIONS
                    WITH DIFFERENT STRIKES AND EXPIRATIONS, THEN USE THESE
                    CONTROLS TO SIMULATE VARIOUS MARKET CONDITIONS AND SEE HOW
                    LAYERED OPTIONS MAINTAIN CAPITAL EFFICIENCY WHILE PROVIDING
                    FULL FUNCTIONALITY.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats and Admin Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
              <h4 className="text-xl font-bold mb-2">Next Token ID</h4>
              <p className="text-3xl font-bold text-blue-600">{nextTokenId}</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
              <h4 className="text-xl font-bold mb-4">Test Utilities</h4>
              <button
                onClick={handleMintTestTokens}
                disabled={!isConnected}
                className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm mb-2"
              >
                Mint Test WBTC
              </button>
              <button
                onClick={handleAddSupportedAsset}
                disabled={!isConnected}
                className="w-full py-2 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Add WBTC Support
              </button>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
              <h4 className="text-xl font-bold mb-2">Capital Efficiency</h4>
              <div className="text-sm space-y-1">
                {statsLoading ? (
                  <p>Loading stats...</p>
                ) : stats ? (
                  <>
                    <p>Traditional: ${stats.totalTraditionalCollateral}</p>
                    <p className="text-green-600 font-semibold">
                      Layered: {stats.totalLayeredCollateral} cBTC
                    </p>
                    <p className="text-blue-600 font-bold">
                      Savings: {stats.savingsPercentage} 🚀
                    </p>
                  </>
                ) : (
                  <>
                    <p>Traditional: 100% collateral</p>
                    <p className="text-green-600 font-semibold">
                      Layered: 15-35% collateral
                    </p>
                    <p className="text-blue-600 font-bold">
                      Savings: 65-85% 🚀
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayeredOptionsPage;

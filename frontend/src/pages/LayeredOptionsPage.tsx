import React, { useState } from 'react';
import { Navigation } from '../components/Navigation';
import { useAccount } from 'wagmi';
import { 
  useLayeredOptions, 
  useOptionDetails, 
  useUserOptionBalance,
  useTokenOperations,
  type CreateOptionParams,
  type CreateChildOptionParams
} from '../hooks/useLayeredOptions';
import { 
  useLayeredOptionsAPI,
  useUserLayeredOptions,
  useCapitalEfficiencyStats
} from '../services/layeredOptionsAPI';
import { CONTRACT_ADDRESSES, OptionType } from '../contracts/config';

const LayeredOptionsPage = () => {
  const { address, isConnected } = useAccount();
  const [selectedTab, setSelectedTab] = useState<'create' | 'manage' | 'exercise' | 'browse'>('create');
  const [selectedTokenId, setSelectedTokenId] = useState<number>(1);
  const [viewTokenId, setViewTokenId] = useState<number>(1);
  
  // Forms state
  const [createForm, setCreateForm] = useState<CreateOptionParams>({
    baseAsset: CONTRACT_ADDRESSES.MOCK_WBTC,
    strikePrice: '45000',
    expirationDays: 30,
    premium: '0.001',
    premiumToken: '0x0000000000000000000000000000000000000000', // ETH
    optionType: OptionType.CALL,
    parentTokenId: 0,
  });

  const [childForm, setChildForm] = useState<CreateChildOptionParams>({
    parentId: 1,
    strikePrice: '46000',
    expirationDays: 15,
    optionType: OptionType.CALL,
  });

  const [transferForm, setTransferForm] = useState({
    to: '',
    tokenId: 1,
  });

  // Hooks
  const {
    createLayeredOption,
    createChildOption,
    exerciseOption,
    transferOption,
    addSupportedAsset,
    isCreating,
    isCreatingChild,
    isExercising,
    isTransferring,
    nextTokenId,
    createHash,
    createChildHash,
    exerciseHash,
    transferHash,
  } = useLayeredOptions();

  // API hooks for indexed data
  const { options: allOptions, loading: optionsLoading } = useLayeredOptionsAPI();
  const { userOptions, loading: userLoading } = useUserLayeredOptions(address);
  const { stats, loading: statsLoading } = useCapitalEfficiencyStats();

  const { option: viewOption, formattedStrike, formattedPremium, expirationDate, isExpired } = useOptionDetails(viewTokenId);
  const { balance: userBalance, hasOption } = useUserOptionBalance(address, selectedTokenId);
  const { mintTestTokens } = useTokenOperations();

  // Handle form submissions
  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;

    try {
      await createLayeredOption(createForm);
    } catch (error) {
      console.error('Failed to create option:', error);
    }
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;

    try {
      await createChildOption(childForm);
    } catch (error) {
      console.error('Failed to create child option:', error);
    }
  };

  const handleExerciseOption = async () => {
    if (!isConnected) return;

    try {
      await exerciseOption(selectedTokenId);
    } catch (error) {
      console.error('Failed to exercise option:', error);
    }
  };

  const handleTransferOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) return;

    try {
      await transferOption(address, transferForm.to, transferForm.tokenId);
    } catch (error) {
      console.error('Failed to transfer option:', error);
    }
  };

  const handleMintTestTokens = async () => {
    if (!isConnected) return;

    try {
      await mintTestTokens(CONTRACT_ADDRESSES.MOCK_WBTC, '10');
    } catch (error) {
      console.error('Failed to mint test tokens:', error);
    }
  };

  const handleAddSupportedAsset = async () => {
    if (!isConnected) return;

    try {
      await addSupportedAsset(CONTRACT_ADDRESSES.MOCK_WBTC);
    } catch (error) {
      console.error('Failed to add supported asset:', error);
    }
  };

  return (
    <div
      className="h-screen w-screen overflow-auto"
      style={{
        background:
          "linear-gradient(180deg, var(--sky-blue) 0%, var(--light-green) 50%, var(--cream) 100%)",
      }}
    >
      <Navigation />

      <div className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-8">
            <h1
              className="text-4xl md:text-6xl mb-4"
              style={{ color: "var(--charcoal)" }}
            >
              LAYERED OPTIONS
            </h1>
            <p className="text-xl mb-4" style={{ color: "var(--charcoal)" }}>
              Revolutionary Capital-Efficient Options on Citrea
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 max-w-2xl mx-auto">
              <p className="text-lg font-semibold mb-2">💡 What are Layered Options?</p>
              <p className="text-sm">
                Create parent options that can spawn multiple child options, reducing collateral requirements by 65-85% 
                compared to traditional options while maintaining full functionality.
              </p>
            </div>
          </div>

          {!isConnected && (
            <div className="text-center mb-8">
              <div className="bg-yellow-100/80 backdrop-blur-sm rounded-xl p-6">
                <p className="text-lg font-semibold text-yellow-800 mb-2">
                  🔗 Connect Your Wallet
                </p>
                <p className="text-yellow-700">
                  Please connect your wallet to interact with Layered Options
                </p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 flex gap-2">
              {(['create', 'manage', 'exercise', 'browse'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    selectedTab === tab
                      ? 'bg-white text-gray-800 shadow-lg'
                      : 'text-gray-700 hover:bg-white/30'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Create Tab */}
          {selectedTab === 'create' && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Create Parent Option */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>
                  Create Parent Option
                </h3>
                <form onSubmit={handleCreateOption} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Base Asset</label>
                    <select
                      value={createForm.baseAsset}
                      onChange={(e) => setCreateForm({ ...createForm, baseAsset: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white"
                    >
                      <option value={CONTRACT_ADDRESSES.MOCK_WBTC}>Mock WBTC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Strike Price ($)</label>
                    <input
                      type="number"
                      value={createForm.strikePrice}
                      onChange={(e) => setCreateForm({ ...createForm, strikePrice: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="45000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Expiration (days)</label>
                    <input
                      type="number"
                      value={createForm.expirationDays}
                      onChange={(e) => setCreateForm({ ...createForm, expirationDays: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Premium (cBTC)</label>
                    <input
                      type="text"
                      value={createForm.premium}
                      onChange={(e) => setCreateForm({ ...createForm, premium: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="0.001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Option Type</label>
                    <select
                      value={createForm.optionType}
                      onChange={(e) => setCreateForm({ ...createForm, optionType: parseInt(e.target.value) as OptionType })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white"
                    >
                      <option value={OptionType.CALL}>Call Option</option>
                      <option value={OptionType.PUT}>Put Option</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Premium Payment Token</label>
                    <select
                      value={createForm.premiumToken}
                      onChange={(e) => setCreateForm({ ...createForm, premiumToken: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white"
                    >
                      <option value="0x0000000000000000000000000000000000000000">cBTC (Native)</option>
                      <option value={CONTRACT_ADDRESSES.STABLECOIN}>USDC (Stablecoin)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={!isConnected || isCreating}
                    className="w-full py-3 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {isCreating ? 'Creating...' : 'Create Parent Option'}
                  </button>
                  {createHash && (
                    <p className="text-sm text-green-600 break-all">
                      Transaction: {createHash}
                    </p>
                  )}
                </form>
              </div>

              {/* Create Child Option */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>
                  Create Child Option
                </h3>
                <form onSubmit={handleCreateChild} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Parent Option ID</label>
                    <input
                      type="number"
                      value={childForm.parentId}
                      onChange={(e) => setChildForm({ ...childForm, parentId: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Child Strike Price ($)</label>
                    <input
                      type="number"
                      value={childForm.strikePrice}
                      onChange={(e) => setChildForm({ ...childForm, strikePrice: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="46000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Child Expiration (days)</label>
                    <input
                      type="number"
                      value={childForm.expirationDays}
                      onChange={(e) => setChildForm({ ...childForm, expirationDays: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Option Type</label>
                    <select
                      value={childForm.optionType}
                      onChange={(e) => setChildForm({ ...childForm, optionType: parseInt(e.target.value) as OptionType })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                    >
                      <option value={OptionType.CALL}>Call Option</option>
                      <option value={OptionType.PUT}>Put Option</option>
                    </select>
                  </div>
                  <p className="text-sm text-gray-600">* Premium will be automatically calculated as half of the parent option premium</p>
                  <button
                    type="submit"
                    disabled={!isConnected || isCreatingChild}
                    className="w-full py-3 px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {isCreatingChild ? 'Creating...' : 'Create Child Option'}
                  </button>
                  {createChildHash && (
                    <p className="text-sm text-green-600 break-all">
                      Transaction: {createChildHash}
                    </p>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* Manage Tab */}
          {selectedTab === 'manage' && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Option Details Viewer */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>
                  Option Details
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">View Option ID</label>
                  <input
                    type="number"
                    value={viewTokenId}
                    onChange={(e) => setViewTokenId(parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300"
                    placeholder="1"
                  />
                </div>
                
                {viewOption && (
                  <div className="space-y-3">
                    <div className="bg-white/30 rounded-lg p-4">
                      <p className="font-semibold">Base Asset: <span className="font-mono text-sm">{viewOption.baseAsset}</span></p>
                      <p className="font-semibold">Option Type: <span className={`${viewOption.optionType === OptionType.CALL ? 'text-green-600' : 'text-red-600'}`}>{viewOption.optionType === OptionType.CALL ? 'CALL' : 'PUT'}</span></p>
                      <p className="font-semibold">Strike Price: ${formattedStrike}</p>
                      <p className="font-semibold">Premium: {formattedPremium} {viewOption.premiumToken === '0x0000000000000000000000000000000000000000' ? 'cBTC' : 'USDC'}</p>
                      <p className="font-semibold">Expiration: {expirationDate?.toLocaleDateString()}</p>
                      <p className="font-semibold">Parent ID: {viewOption.parentTokenId.toString()}</p>
                      <p className={`font-semibold ${viewOption.isExercised ? 'text-red-600' : 'text-green-600'}`}>
                        Status: {viewOption.isExercised ? 'Exercised' : 'Active'}
                      </p>
                      <p className={`font-semibold ${isExpired ? 'text-orange-600' : 'text-blue-600'}`}>
                        {isExpired ? '⚠️ Expired' : '✅ Valid'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Transfer Option */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>
                  Transfer Option
                </h3>
                <form onSubmit={handleTransferOption} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Token ID to Transfer</label>
                    <input
                      type="number"
                      value={transferForm.tokenId}
                      onChange={(e) => setTransferForm({ ...transferForm, tokenId: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Recipient Address</label>
                    <input
                      type="text"
                      value={transferForm.to}
                      onChange={(e) => setTransferForm({ ...transferForm, to: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="0x..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!isConnected || isTransferring || !transferForm.to}
                    className="w-full py-3 px-6 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {isTransferring ? 'Transferring...' : 'Transfer Option'}
                  </button>
                  {transferHash && (
                    <p className="text-sm text-green-600 break-all">
                      Transaction: {transferHash}
                    </p>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* Exercise Tab */}
          {selectedTab === 'exercise' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>
                  Exercise Option
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Option ID to Exercise</label>
                    <input
                      type="number"
                      value={selectedTokenId}
                      onChange={(e) => setSelectedTokenId(parseInt(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300"
                      placeholder="1"
                    />
                  </div>
                  
                  <div className="bg-white/30 rounded-lg p-4">
                    <p className="font-semibold mb-2">Your Balance for Token #{selectedTokenId}:</p>
                    <p className={`text-lg ${hasOption ? 'text-green-600' : 'text-red-600'}`}>
                      {userBalance} {hasOption ? '✅ You own this option' : '❌ You don\'t own this option'}
                    </p>
                  </div>

                  <button
                    onClick={handleExerciseOption}
                    disabled={!isConnected || isExercising || !hasOption}
                    className="w-full py-3 px-6 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {isExercising ? 'Exercising...' : 'Exercise Option'}
                  </button>
                  {exerciseHash && (
                    <p className="text-sm text-green-600 break-all">
                      Transaction: {exerciseHash}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Browse Tab */}
          {selectedTab === 'browse' && (
            <div className="space-y-8">
              {/* Stats Section */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                  <h4 className="text-xl font-bold mb-2">Total Options</h4>
                  <p className="text-3xl font-bold text-blue-600">
                    {statsLoading ? '...' : stats?.totalOptions || 0}
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                  <h4 className="text-xl font-bold mb-2">Parent Options</h4>
                  <p className="text-3xl font-bold text-green-600">
                    {statsLoading ? '...' : stats?.parentOptions || 0}
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center">
                  <h4 className="text-xl font-bold mb-2">Child Options</h4>
                  <p className="text-3xl font-bold text-purple-600">
                    {statsLoading ? '...' : stats?.childOptions || 0}
                  </p>
                </div>
              </div>

              {/* Capital Efficiency Section */}
              {stats && (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                  <h3 className="text-2xl font-bold mb-4" style={{ color: "var(--charcoal)" }}>
                    💰 Capital Efficiency Analysis
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-semibold mb-2">Traditional System Collateral:</p>
                      <p className="text-2xl font-bold text-red-500">${stats.totalTraditionalCollateral}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Layered System Collateral:</p>
                      <p className="text-2xl font-bold text-green-500">{stats.totalLayeredCollateral} cBTC</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Total Savings:</p>
                      <p className="text-2xl font-bold text-blue-500">${stats.totalSavings}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Savings Percentage:</p>
                      <p className="text-3xl font-bold text-purple-500">{stats.savingsPercentage} 🚀</p>
                    </div>
                  </div>
                </div>
              )}

              {/* All Options List */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold" style={{ color: "var(--charcoal)" }}>
                    📋 All Layered Options
                  </h3>
                  <div className="text-sm text-gray-600">
                    {optionsLoading ? 'Loading...' : `${allOptions.length} options found`}
                  </div>
                </div>
                
                {optionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2">Loading options...</p>
                  </div>
                ) : allOptions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-lg">No layered options found yet.</p>
                    <p className="text-sm text-gray-600">Create the first option to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {allOptions.map((option) => (
                      <div 
                        key={option.tokenId} 
                        className="bg-white/30 rounded-lg p-4 hover:bg-white/40 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">Token #{option.tokenId}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              option.isParent 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {option.isParent ? 'Parent' : 'Child'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              option.isExercised 
                                ? 'bg-red-100 text-red-800' 
                                : option.isExpired
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-green-100 text-green-800'
                            }`}>
                              {option.isExercised ? 'Exercised' : option.isExpired ? 'Expired' : 'Active'}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Strike: ${option.formattedStrike}</p>
                            <p className="text-sm text-gray-600">Premium: {option.formattedPremium} cBTC</p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Creator:</strong> {option.creator.slice(0, 6)}...{option.creator.slice(-4)}</p>
                            <p><strong>Expires:</strong> {new Date(option.expirationDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            {!option.isParent && (
                              <p><strong>Parent ID:</strong> #{option.parentId}</p>
                            )}
                            <p><strong>Created:</strong> {new Date(option.timestamp).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* User's Options */}
              {isConnected && (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold" style={{ color: "var(--charcoal)" }}>
                      🏆 Your Options
                    </h3>
                    <div className="text-sm text-gray-600">
                      {userLoading ? 'Loading...' : `${userOptions.length} options owned`}
                    </div>
                  </div>
                  
                  {userLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                      <p className="mt-2">Loading your options...</p>
                    </div>
                  ) : userOptions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-lg">You don't own any layered options yet.</p>
                      <p className="text-sm text-gray-600">Create or purchase options to see them here!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userOptions.map((option) => (
                        <div 
                          key={option.tokenId} 
                          className="bg-white/30 rounded-lg p-4 border-l-4 border-green-500"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">Token #{option.tokenId}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                option.isParent 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {option.isParent ? 'Parent' : 'Child'}
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                Balance: {option.balance}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Strike: ${option.formattedStrike}</p>
                              <p className="text-sm text-gray-600">Premium: {option.formattedPremium} cBTC</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm"><strong>Expires:</strong> {new Date(option.expirationDate).toLocaleDateString()}</p>
                              {!option.isParent && (
                                <p className="text-sm"><strong>Parent ID:</strong> #{option.parentId}</p>
                              )}
                            </div>
                            {!option.isExercised && !option.isExpired && (
                              <button
                                onClick={() => {
                                  setSelectedTokenId(parseInt(option.tokenId));
                                  setSelectedTab('exercise');
                                }}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-semibold"
                              >
                                Exercise
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
                    <p className="text-green-600 font-semibold">Layered: {stats.totalLayeredCollateral} cBTC</p>
                    <p className="text-blue-600 font-bold">Savings: {stats.savingsPercentage} 🚀</p>
                  </>
                ) : (
                  <>
                    <p>Traditional: 100% collateral</p>
                    <p className="text-green-600 font-semibold">Layered: 15-35% collateral</p>
                    <p className="text-blue-600 font-bold">Savings: 65-85% 🚀</p>
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
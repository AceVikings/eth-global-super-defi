import express from 'express';
import { CONTRACT_ADDRESSES } from '../services/indexer.js';

const router = express.Router();

// Get contract addresses
router.get('/addresses', (req, res) => {
  res.json({
    success: true,
    data: CONTRACT_ADDRESSES
  });
});

// Contract ABIs for frontend integration
const ABIS = {
  OPTIONS_TRADING: [
    'function createOption(uint8 optionType, uint256 strikePrice, uint256 expiryTimestamp, address underlyingAsset, address collateralToken, uint256 contractSize) returns (uint256)',
    'function purchaseOption(uint256 optionId)',
    'function exerciseOption(uint256 optionId)',
    'function calculateCollateralRequired(uint8 optionType, uint256 strikePrice, address underlyingAsset, uint256 contractSize) view returns (uint256)',
    'function calculatePremium(uint8 optionType, uint256 strikePrice, uint256 expiryTimestamp, address underlyingAsset, uint256 contractSize) view returns (uint256)',
    'function getOption(uint256 optionId) view returns (tuple(uint256 id, address writer, address buyer, uint8 optionType, uint256 strikePrice, uint256 premium, uint256 collateralAmount, uint256 expiryTimestamp, uint8 status, address underlyingAsset, address collateralToken, uint256 contractSize))',
    'function supportedAssets(address asset) view returns (bool)',
    'function supportedCollaterals(address collateral) view returns (bool)'
  ],
  ERC20: [
    'function balanceOf(address account) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function faucet(uint256 amount)',
    'function mint(address to, uint256 amount)'
  ],
  PRICE_FEED: [
    'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
    'function updateAnswer(int256 price)',
    'function latestAnswer() view returns (int256)'
  ],
  TIME_ORACLE: [
    'function getCurrentTime() view returns (uint256)',
    'function fastForward(uint256 duration)',
    'function setAbsoluteTime(uint256 timestamp)',
    'function useBlockTime()'
  ]
};

// Get contract ABIs
router.get('/abis', (req, res) => {
  res.json({
    success: true,
    data: ABIS
  });
});

// Get specific contract ABI
router.get('/abis/:contract', (req, res) => {
  const { contract } = req.params;
  const contractName = contract.toUpperCase();
  
  if (!ABIS[contractName]) {
    return res.status(404).json({
      success: false,
      error: 'Contract ABI not found'
    });
  }
  
  res.json({
    success: true,
    data: ABIS[contractName]
  });
});

// Network configuration
router.get('/network', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Citrea Testnet',
      chainId: 5115,
      rpcUrl: 'https://rpc.testnet.citrea.xyz',
      nativeCurrency: {
        name: 'cBTC',
        symbol: 'cBTC',
        decimals: 18
      },
      blockExplorer: {
        name: 'Citrea Explorer',
        url: 'https://explorer.testnet.citrea.xyz'
      }
    }
  });
});

export { router as contractsRouter };
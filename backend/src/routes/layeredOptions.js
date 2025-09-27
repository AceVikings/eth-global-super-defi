import express from 'express';
import { layeredIndexer } from '../services/layeredIndexer.js';

const router = express.Router();

// Get all layered options
router.get('/', (req, res) => {
  try {
    const options = layeredIndexer.getAllOptions();
    res.json({
      success: true,
      data: options,
      count: options.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available options (not exercised, not expired)
router.get('/available', (req, res) => {
  try {
    const options = layeredIndexer.getAvailableOptions();
    res.json({
      success: true,
      data: options,
      count: options.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get layered option by token ID
router.get('/:tokenId', (req, res) => {
  try {
    const { tokenId } = req.params;
    const option = layeredIndexer.getOptionById(tokenId);
    
    if (!option) {
      return res.status(404).json({
        success: false,
        error: 'Layered option not found'
      });
    }
    
    res.json({
      success: true,
      data: option
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get parent options (parentId = 0)
router.get('/parents', (req, res) => {
  try {
    const options = layeredIndexer.getParentOptions();
    res.json({
      success: true,
      data: options,
      count: options.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get child options for a parent
router.get('/parent/:parentId/children', (req, res) => {
  try {
    const { parentId } = req.params;
    const children = layeredIndexer.getChildOptions(parentId);
    
    res.json({
      success: true,
      data: children,
      count: children.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get options by user address
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const options = await layeredIndexer.getOptionsByUser(address);
    
    res.json({
      success: true,
      data: options,
      count: options.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user balances for specific tokens
router.get('/user/:address/balances', async (req, res) => {
  try {
    const { address } = req.params;
    const balances = await layeredIndexer.getUserBalances(address);
    
    res.json({
      success: true,
      data: balances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get capital efficiency stats
router.get('/stats/efficiency', (req, res) => {
  try {
    const stats = layeredIndexer.getCapitalEfficiencyStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get option hierarchy (parent -> children tree)
router.get('/:parentId/hierarchy', (req, res) => {
  try {
    const { parentId } = req.params;
    const hierarchy = layeredIndexer.getOptionHierarchy(parentId);
    
    res.json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recent transactions
router.get('/transactions/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const transactions = layeredIndexer.getRecentTransactions(limit);
    
    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as layeredOptionsRouter };
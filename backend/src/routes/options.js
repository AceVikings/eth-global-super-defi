import express from 'express';
import { indexer } from '../services/indexer.js';

const router = express.Router();

// Get all options
router.get('/', (req, res) => {
  try {
    const options = indexer.getAllOptions();
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

// Get available options (not purchased, not expired)
router.get('/available', (req, res) => {
  try {
    const options = indexer.getAvailableOptions();
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

// Get option by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const option = indexer.getOptionById(id);
    
    if (!option) {
      return res.status(404).json({
        success: false,
        error: 'Option not found'
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

// Get options by user address
router.get('/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const options = indexer.getOptionsByUser(address);
    
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

// Get user balances
router.get('/user/:address/balances', async (req, res) => {
  try {
    const { address } = req.params;
    const balances = await indexer.getUserBalances(address);
    
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

// Get current market prices
router.get('/market/prices', async (req, res) => {
  try {
    const prices = await indexer.getCurrentPrices();
    
    res.json({
      success: true,
      data: prices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get platform statistics
router.get('/market/stats', (req, res) => {
  try {
    const stats = indexer.getStats();
    
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

export { router as optionsRouter };
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockOracle
 * @dev Mock price oracle for testing purposes
 * Returns price scaled to 1e18 for consistent precision across the system
 */
contract MockOracle is Ownable {
    uint256 public price; // scaled 1e18
    
    event PriceUpdated(uint256 oldPrice, uint256 newPrice, uint256 timestamp);
    
    // Custom errors
    error ZeroPrice();
    
    constructor(uint256 _initialPrice) Ownable(msg.sender) {
        if (_initialPrice == 0) revert ZeroPrice();
        price = _initialPrice;
        emit PriceUpdated(0, _initialPrice, block.timestamp);
    }

    /**
     * @dev Set a new price (only owner)
     * @param _newPrice New price scaled by 1e18
     */
    function setPrice(uint256 _newPrice) external onlyOwner {
        if (_newPrice == 0) revert ZeroPrice();
        uint256 oldPrice = price;
        price = _newPrice;
        emit PriceUpdated(oldPrice, _newPrice, block.timestamp);
    }

    /**
     * @dev Get current price
     * @return Current price scaled by 1e18
     */
    function getPrice() external view returns (uint256) {
        return price;
    }

    /**
     * @dev Chainlink-compatible function for integration testing
     * @return Latest price as int256
     */
    function latestAnswer() external view returns (int256) {
        return int256(price);
    }

    /**
     * @dev Chainlink-compatible function for full round data
     * @return roundId answeredInRound answer startedAt updatedAt
     */
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (1, int256(price), block.timestamp, block.timestamp, 1);
    }

    /**
     * @dev Simulate price movement for testing
     * @param percentageChange Percentage change in basis points (100 = 1%)
     * @param isIncrease True for price increase, false for decrease
     */
    function simulatePriceMovement(uint256 percentageChange, bool isIncrease) external onlyOwner {
        uint256 change = (price * percentageChange) / 10000;
        uint256 oldPrice = price;
        
        if (isIncrease) {
            price += change;
        } else {
            if (change >= price) {
                price = price / 2; // Prevent zero price, set to half
            } else {
                price -= change;
            }
        }
        
        emit PriceUpdated(oldPrice, price, block.timestamp);
    }
}
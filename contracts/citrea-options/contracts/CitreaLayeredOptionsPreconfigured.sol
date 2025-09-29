// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CitreaLayeredOptionsTrading.sol";

/**
 * @title CitreaLayeredOptionsPreconfigured
 * @dev LayeredOptions contract with pre-configured supported assets to avoid initialization issues
 */
contract CitreaLayeredOptionsPreconfigured is CitreaLayeredOptionsTrading {
    constructor(
        address initialOwner,
        address _stablecoin,
        address _timeOracle,
        address _wbtc,
        address _wbtcPriceFeed,
        address _weth,
        address _wethPriceFeed
    ) CitreaLayeredOptionsTrading(initialOwner, _stablecoin, _timeOracle, _wbtc, _weth, _wbtcPriceFeed, _wethPriceFeed) {
        // Assets are now preconfigured in the parent constructor
        // This contract now just provides a convenient interface
    }
}
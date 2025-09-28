// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILimitOrderProtocol
 * @dev Interface for 1inch Limit Order Protocol
 * Used for caller validation in pre/post interaction adapters
 */
interface ILimitOrderProtocol {
    // Marker interface for allowed caller checks
    // The actual 1inch protocol contract will implement this interface
    // Address on Polygon mainnet: 0x111111125421ca6dc452d289314280a0f8842a65
}
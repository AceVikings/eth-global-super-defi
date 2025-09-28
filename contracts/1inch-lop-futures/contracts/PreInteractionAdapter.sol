// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FuturesVault.sol";
import "./interfaces/ILimitOrderProtocol.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PreInteractionAdapter
 * @dev PreInteraction adapter: called by 1inch prior to settlement to lock taker collateral.
 * Expect calldata encoded as: abi.encode(uint256 takerRequiredMargin)
 * 
 * The LimitOrder `preInteraction` should be set to call this adapter with
 * calldata = abi.encodeWithSelector(PreInteractionAdapter.preInteraction.selector, taker, data)
 */
contract PreInteractionAdapter is Ownable, ReentrancyGuard {
    FuturesVault public vault;
    address public limitOrderProtocol; // 1inch protocol contract address for validation
    
    // Events
    event PreInteractionCalled(address indexed taker, uint256 amount, address indexed caller);
    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event LimitOrderProtocolUpdated(address indexed oldProtocol, address indexed newProtocol);

    // Custom errors
    error OnlyLimitOrderProtocol();
    error ZeroAddress();
    error ZeroAmount();
    error InvalidCalldata();

    constructor(FuturesVault _vault) Ownable(msg.sender) {
        if (address(_vault) == address(0)) revert ZeroAddress();
        vault = _vault;
    }

    // ===== ADMIN FUNCTIONS =====

    /**
     * @dev Set the 1inch Limit Order Protocol address for caller validation
     * @param _protocol 1inch LOP address (0x111111125421ca6dc452d289314280a0f8842a65 on Polygon)
     */
    function setLimitOrderProtocol(address _protocol) external onlyOwner {
        if (_protocol == address(0)) revert ZeroAddress();
        address oldProtocol = limitOrderProtocol;
        limitOrderProtocol = _protocol;
        emit LimitOrderProtocolUpdated(oldProtocol, _protocol);
    }

    /**
     * @dev Update vault reference
     * @param _vault New vault address
     */
    function setVault(FuturesVault _vault) external onlyOwner {
        if (address(_vault) == address(0)) revert ZeroAddress();
        address oldVault = address(vault);
        vault = _vault;
        emit VaultUpdated(oldVault, address(_vault));
    }

    // ===== PRE-INTERACTION LOGIC =====

    /**
     * @dev Called by 1inch settlement engine before finalizing the order fill
     * We expect msg.sender to be 1inch protocol (optional check)
     * @param taker The taker who is filling the order
     * @param data Must be abi.encode(uint256 requiredMargin)
     */
    function preInteraction(address taker, bytes calldata data) external nonReentrant {
        // Optional enforcement: require caller to be 1inch limit order protocol
        if (limitOrderProtocol != address(0) && msg.sender != limitOrderProtocol) {
            revert OnlyLimitOrderProtocol();
        }

        if (taker == address(0)) revert ZeroAddress();
        if (data.length == 0) revert InvalidCalldata();

        // Decode required margin amount
        uint256 requiredMargin;
        try this.decodePreInteractionData(data) returns (uint256 margin) {
            requiredMargin = margin;
        } catch {
            revert InvalidCalldata();
        }

        if (requiredMargin == 0) revert ZeroAmount();

        // Lock taker's collateral from their unlocked balance in the vault
        // This requires the taker to have previously deposited sufficient funds
        vault.lockFromPreInteraction(taker, requiredMargin);

        emit PreInteractionCalled(taker, requiredMargin, msg.sender);
    }

    /**
     * @dev External function to decode preInteraction data (used for validation)
     * @param data Encoded data
     * @return requiredMargin Decoded margin amount
     */
    function decodePreInteractionData(bytes calldata data) external pure returns (uint256 requiredMargin) {
        return abi.decode(data, (uint256));
    }

    /**
     * @dev Helper function to encode preInteraction data
     * @param requiredMargin Margin amount to encode
     * @return Encoded bytes
     */
    function encodePreInteractionData(uint256 requiredMargin) external pure returns (bytes memory) {
        return abi.encode(requiredMargin);
    }

    /**
     * @dev Create complete preInteraction calldata for 1inch order
     * @param taker Taker address
     * @param requiredMargin Required margin amount
     * @return Complete calldata for preInteraction
     */
    function createPreInteractionCalldata(
        address taker,
        uint256 requiredMargin
    ) external pure returns (bytes memory) {
        bytes memory data = abi.encode(requiredMargin);
        return abi.encodeWithSelector(PreInteractionAdapter.preInteraction.selector, taker, data);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @dev Check if taker has sufficient balance for required margin
     * @param taker Taker address
     * @param requiredMargin Required margin amount
     * @return Whether taker has sufficient balance
     */
    function checkTakerBalance(address taker, uint256 requiredMargin) external view returns (bool) {
        return vault.balanceOf(taker) >= requiredMargin;
    }

    /**
     * @dev Get taker's available balance in vault
     * @param taker Taker address
     * @return Available unlocked balance
     */
    function getTakerBalance(address taker) external view returns (uint256) {
        return vault.balanceOf(taker);
    }

    /**
     * @dev Validate preInteraction data format
     * @param data Data to validate
     * @return isValid Whether data is valid
     */
    function validatePreInteractionData(bytes calldata data) external view returns (bool isValid) {
        if (data.length == 0) return false;
        
        try this.decodePreInteractionData(data) returns (uint256 margin) {
            return margin > 0;
        } catch {
            return false;
        }
    }
}
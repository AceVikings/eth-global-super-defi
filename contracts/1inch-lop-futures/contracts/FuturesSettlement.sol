// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./FuturesVault.sol";
import "./PostInteractionAdapter.sol";

/**
 * @title FuturesSettlement
 * @dev Settlement contract that acts as recipient for 1inch swap outputs
 * This contract receives tokens from successful limit order swaps and:
 * 1. Credits maker's funds to the vault
 * 2. Triggers post-interaction to open bilateral futures positions
 * 
 * Flow:
 * - 1inch executes limit order with this contract as recipient
 * - receiveTokens() is called with the swapped tokens for maker
 * - Maker funds are credited to vault via creditMaker()
 * - Post-interaction adapter is called to open the bilateral position
 */
contract FuturesSettlement is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ===== STATE VARIABLES =====
    
    FuturesVault public vault;
    PostInteractionAdapter public postAdapter;
    
    // ===== EVENTS =====
    
    event TokensReceived(
        address indexed token,
        address indexed maker,
        uint256 amount,
        bytes32 indexed orderHash
    );
    
    event MakerCredited(
        address indexed maker,
        address indexed token,
        uint256 amount
    );
    
    event PostInteractionTriggered(
        address indexed market,
        uint256 indexed positionId,
        bytes32 indexed orderHash
    );
    
    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event PostAdapterUpdated(address indexed oldAdapter, address indexed newAdapter);

    // ===== ERRORS =====
    
    error ZeroAddress();
    error ZeroAmount();
    error InvalidToken();
    error VaultCreditFailed();
    error PostInteractionFailed();

    // ===== CONSTRUCTOR =====

    /**
     * @dev Initialize the settlement contract
     * @param _vault FuturesVault contract address
     * @param _postAdapter PostInteractionAdapter contract address
     * @param _owner Contract owner
     */
    constructor(
        FuturesVault _vault,
        PostInteractionAdapter _postAdapter,
        address _owner
    ) Ownable(_owner) {
        if (address(_vault) == address(0)) revert ZeroAddress();
        if (address(_postAdapter) == address(0)) revert ZeroAddress();
        if (_owner == address(0)) revert ZeroAddress();
        
        vault = _vault;
        postAdapter = _postAdapter;
    }

    // ===== ADMIN FUNCTIONS =====

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

    /**
     * @dev Update post-interaction adapter reference
     * @param _postAdapter New adapter address
     */
    function setPostAdapter(PostInteractionAdapter _postAdapter) external onlyOwner {
        if (address(_postAdapter) == address(0)) revert ZeroAddress();
        address oldAdapter = address(postAdapter);
        postAdapter = _postAdapter;
        emit PostAdapterUpdated(oldAdapter, address(_postAdapter));
    }

    // ===== SETTLEMENT LOGIC =====

    /**
     * @dev Receive tokens from 1inch limit order execution
     * This is the main entry point for settlement of limit orders
     * 
     * @param token The token being received (output of the swap)
     * @param maker The maker of the original limit order
     * @param amount Amount of tokens received
     * @param orderHash Hash of the original 1inch limit order
     * @param marketAddr Address of the futures market for position creation
     * @param postInteractionData Encoded data for position opening
     */
    function receiveTokens(
        address token,
        address maker,
        uint256 amount,
        bytes32 orderHash,
        address marketAddr,
        bytes calldata postInteractionData
    ) external nonReentrant {
        if (token == address(0)) revert ZeroAddress();
        if (maker == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20 tokenContract = IERC20(token);
        
        // Verify we actually received the tokens
        uint256 balanceBefore = tokenContract.balanceOf(address(this));
        if (balanceBefore < amount) revert InvalidToken();

        emit TokensReceived(token, maker, amount, orderHash);

        // Step 1: Credit maker's funds to the vault
        _creditMakerToVault(token, maker, amount);

        // Step 2: Trigger post-interaction to open bilateral position
        _triggerPostInteraction(marketAddr, postInteractionData, orderHash);
    }

    /**
     * @dev Alternative entry point for direct token transfer + settlement
     * Allows external contracts to transfer tokens and trigger settlement atomically
     */
    function settleWithTransfer(
        address token,
        address maker,
        uint256 amount,
        bytes32 orderHash,
        address marketAddr,
        bytes calldata postInteractionData
    ) external nonReentrant {
        if (token == address(0)) revert ZeroAddress();
        if (maker == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        // Transfer tokens from caller to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit TokensReceived(token, maker, amount, orderHash);

        // Follow same settlement flow
        _creditMakerToVault(token, maker, amount);
        _triggerPostInteraction(marketAddr, postInteractionData, orderHash);
    }

    /**
     * @dev Emergency function to forward any stuck tokens to vault
     * Only callable by owner in case of settlement issues
     */
    function forwardToVault(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        IERC20(token).safeTransfer(address(vault), amount);
    }

    // ===== INTERNAL FUNCTIONS =====

    /**
     * @dev Credit maker's tokens to the vault
     * @param token Token to credit
     * @param maker Maker address
     * @param amount Amount to credit
     */
    function _creditMakerToVault(address token, address maker, uint256 amount) internal {
        IERC20 tokenContract = IERC20(token);
        
        // Transfer tokens to vault first
        SafeERC20.safeTransfer(tokenContract, address(vault), amount);
        
        // Credit to vault - this increases maker's collateral balance
        try vault.creditMaker(maker, amount) {
            emit MakerCredited(maker, token, amount);
        } catch {
            revert VaultCreditFailed();
        }
    }

    /**
     * @dev Trigger post-interaction adapter to open bilateral position
     * @param marketAddr Market address for position
     * @param postInteractionData Encoded position parameters
     * @param orderHash Original order hash for tracking
     */
    function _triggerPostInteraction(
        address marketAddr,
        bytes calldata postInteractionData,
        bytes32 orderHash
    ) internal {
        try postAdapter.onPostInteraction(marketAddr, postInteractionData) returns (uint256 positionId) {
            emit PostInteractionTriggered(marketAddr, positionId, orderHash);
        } catch {
            revert PostInteractionFailed();
        }
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @dev Get current vault address
     */
    function getVault() external view returns (address) {
        return address(vault);
    }

    /**
     * @dev Get current post-interaction adapter address
     */
    function getPostAdapter() external view returns (address) {
        return address(postAdapter);
    }

    /**
     * @dev Check contract's token balance
     * @param token Token to check
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ===== HELPER FUNCTIONS FOR 1INCH INTEGRATION =====

    /**
     * @dev Create settlement call data for 1inch SDK integration
     * This generates the calldata needed to call receiveTokens from a 1inch order
     * 
     * @param token Token being settled
     * @param maker Maker of the order
     * @param amount Amount being settled  
     * @param orderHash Hash of the 1inch order
     * @param marketAddr Market for position creation
     * @param postInteractionData Position parameters
     * @return calldata Encoded function call
     */
    function createSettlementCalldata(
        address token,
        address maker,
        uint256 amount,
        bytes32 orderHash,
        address marketAddr,
        bytes calldata postInteractionData
    ) external pure returns (bytes memory) {
        return abi.encodeWithSelector(
            this.receiveTokens.selector,
            token,
            maker,
            amount,
            orderHash,
            marketAddr,
            postInteractionData
        );
    }
}
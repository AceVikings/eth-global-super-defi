// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FuturesVault
 * @dev Keeps collateral for both makers and takers. Exposes lock/unlock/credit APIs.
 * Only Market and Settlement contracts should be allowed to move funds; we manage roles
 * by owner-settable addresses (market, settlement, pre/post adapters).
 */
contract FuturesVault is Ownable, ReentrancyGuard {
    IERC20 public immutable collateral;

    // Role addresses - set by owner
    address public market;
    address public settlement;
    address public preInteractionAdapter;
    address public postInteractionAdapter;

    // User balances
    mapping(address => uint256) public balance;    // unlocked collateral (user deposit)
    mapping(address => uint256) public locked;     // locked margin per user

    // Events
    event Deposit(address indexed who, uint256 amount);
    event Withdraw(address indexed who, uint256 amount);
    event Lock(address indexed who, uint256 amount);
    event Unlock(address indexed who, uint256 amount);
    event Credit(address indexed who, uint256 amount); // used to forward maker funds
    event RoleUpdated(string indexed role, address indexed newAddress);

    // Custom errors
    error OnlyMarket();
    error OnlySettlement();
    error OnlyPreInteractionAdapter();
    error OnlyPostInteractionAdapter();
    error InsufficientBalance();
    error InsufficientLocked();
    error ZeroAmount();
    error ZeroAddress();

    constructor(IERC20 _collateral) Ownable(msg.sender) {
        if (address(_collateral) == address(0)) revert ZeroAddress();
        collateral = _collateral;
    }

    // ===== ROLE SETTERS =====
    
    function setMarket(address _market) external onlyOwner {
        if (_market == address(0)) revert ZeroAddress();
        market = _market;
        emit RoleUpdated("market", _market);
    }

    function setSettlement(address _settlement) external onlyOwner {
        if (_settlement == address(0)) revert ZeroAddress();
        settlement = _settlement;
        emit RoleUpdated("settlement", _settlement);
    }

    function setPreInteractionAdapter(address _adapter) external onlyOwner {
        if (_adapter == address(0)) revert ZeroAddress();
        preInteractionAdapter = _adapter;
        emit RoleUpdated("preInteractionAdapter", _adapter);
    }

    function setPostInteractionAdapter(address _adapter) external onlyOwner {
        if (_adapter == address(0)) revert ZeroAddress();
        postInteractionAdapter = _adapter;
        emit RoleUpdated("postInteractionAdapter", _adapter);
    }

    // ===== USER DEPOSITS & WITHDRAWS (UNLOCKED BALANCE) =====
    
    /**
     * @dev Deposit collateral tokens into vault
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        
        collateral.transferFrom(msg.sender, address(this), amount);
        balance[msg.sender] += amount;
        
        emit Deposit(msg.sender, amount);
    }

    /**
     * @dev Withdraw unlocked collateral tokens
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (amount > balance[msg.sender]) revert InsufficientBalance();
        
        // Note: In production, add check that withdrawal won't break their positions
        // Market contract should verify this before allowing withdrawal
        balance[msg.sender] -= amount;
        collateral.transfer(msg.sender, amount);
        
        emit Withdraw(msg.sender, amount);
    }

    // ===== CALLED BY PRE-INTERACTION ADAPTER =====
    
    /**
     * @dev Lock collateral from user's balance (called by preInteraction adapter)
     * @param who User address
     * @param amount Amount to lock
     */
    function lockFromPreInteraction(address who, uint256 amount) external {
        if (msg.sender != preInteractionAdapter) revert OnlyPreInteractionAdapter();
        if (amount == 0) revert ZeroAmount();
        if (balance[who] < amount) revert InsufficientBalance();
        
        balance[who] -= amount;
        locked[who] += amount;
        
        emit Lock(who, amount);
    }

    // ===== CALLED BY SETTLEMENT =====
    
    /**
     * @dev Credit maker with collateral (called by settlement after receiving funds from 1inch)
     * @param who Maker address
     * @param amount Amount to credit as locked margin
     */
    function creditMaker(address who, uint256 amount) external {
        if (msg.sender != settlement) revert OnlySettlement();
        if (amount == 0) revert ZeroAmount();
        
        locked[who] += amount;
        
        emit Credit(who, amount);
    }

    /**
     * @dev Transfer tokens directly to recipient (used by settlement for forwarding)
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function forceTransferFromSettlement(address to, uint256 amount) external {
        if (msg.sender != settlement) revert OnlySettlement();
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        collateral.transfer(to, amount);
    }

    // ===== CALLED BY MARKET =====
    
    /**
     * @dev Unlock margin and return to user's balance (called by market)
     * @param who User address
     * @param amount Amount to unlock
     */
    function unlockAndReturn(address who, uint256 amount) external {
        if (msg.sender != market) revert OnlyMarket();
        if (amount == 0) revert ZeroAmount();
        if (locked[who] < amount) revert InsufficientLocked();
        
        locked[who] -= amount;
        balance[who] += amount;
        
        emit Unlock(who, amount);
    }

    /**
     * @dev Transfer locked funds to another user (for PnL settlement)
     * @param from User losing funds
     * @param to User receiving funds
     * @param amount Amount to transfer
     */
    function transferLocked(address from, address to, uint256 amount) external {
        if (msg.sender != market) revert OnlyMarket();
        if (amount == 0) revert ZeroAmount();
        if (locked[from] < amount) revert InsufficientLocked();
        
        locked[from] -= amount;
        locked[to] += amount;
        
        emit Lock(to, amount);
        emit Unlock(from, amount);
    }

    // ===== VIEW FUNCTIONS =====
    
    /**
     * @dev Get locked balance for user
     * @param who User address
     * @return Locked amount
     */
    function lockedOf(address who) external view returns (uint256) {
        return locked[who];
    }

    /**
     * @dev Get unlocked balance for user
     * @param who User address
     * @return Unlocked balance
     */
    function balanceOf(address who) external view returns (uint256) {
        return balance[who];
    }

    /**
     * @dev Get total balance (locked + unlocked) for user
     * @param who User address
     * @return Total balance
     */
    function totalBalanceOf(address who) external view returns (uint256) {
        return balance[who] + locked[who];
    }

    /**
     * @dev Check if both users have sufficient unlocked balance
     * @param maker Maker address
     * @param taker Taker address
     * @param makerMargin Required maker margin
     * @param takerMargin Required taker margin
     * @return Whether both have sufficient balance
     */
    function checkBothHaveUnlocked(
        address maker,
        address taker,
        uint256 makerMargin,
        uint256 takerMargin
    ) external view returns (bool) {
        return balance[maker] >= makerMargin && balance[taker] >= takerMargin;
    }

    // ===== EMERGENCY FUNCTIONS =====
    
    /**
     * @dev Emergency withdrawal by owner (for recovery purposes only)
     * @param token Token to recover
     * @param to Recipient address
     * @param amount Amount to recover
     */
    function emergencyWithdraw(
        IERC20 token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        token.transfer(to, amount);
    }
}
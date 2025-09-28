// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./FuturesVault.sol";
import "./MockOracle.sol";

/**
 * @title FuturesMarket
 * @dev Manages bilateral futures positions with PnL calculation and liquidation logic
 * Only the PostInteractionAdapter should call openBilateralPosition
 */
contract FuturesMarket is Ownable, ReentrancyGuard {
    FuturesVault public immutable vault;
    address public immutable oracle; // must provide getPrice() -> uint256 (1e18)
    uint256 public nextPositionId;

    uint16 public maintenancePercent; // e.g., 50 => 50% of initial margin
    uint256 public liquidationPenaltyPercent = 500; // 5% penalty for liquidators (in basis points)
    
    struct Position {
        address maker;          // Order maker
        address taker;          // Order taker
        int256 size;           // signed base size (positive => maker long, negative => maker short)
        uint256 notional;      // Position notional value in collateral units
        uint256 entryPrice;    // Entry price scaled to 1e18
        uint256 makerMargin;   // Maker's locked margin in vault
        uint256 takerMargin;   // Taker's locked margin in vault
        uint256 openTimestamp; // When position was opened
        bool isActive;         // Whether position is still active
    }

    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public ownerPositions;

    // Events
    event PositionOpened(
        uint256 indexed positionId,
        address indexed maker,
        address indexed taker,
        int256 size,
        uint256 notional,
        uint256 entryPrice
    );
    event PositionClosed(uint256 indexed positionId, address indexed closer);
    event PositionLiquidated(
        uint256 indexed positionId,
        address indexed liquidator,
        uint256 penalty
    );
    event MaintenancePercentUpdated(uint16 oldPercent, uint16 newPercent);

    // Custom errors
    error OnlyPostInteractionAdapter();
    error SameParties();
    error PositionNotFound();
    error PositionNotActive();
    error NotPositionParty();
    error NotLiquidatable();
    error InvalidMaintenancePercent();
    error OracleCallFailed();

    constructor(
        FuturesVault _vault,
        address _oracle,
        uint16 _maintenancePercent
    ) Ownable(msg.sender) {
        vault = _vault;
        oracle = _oracle;
        if (_maintenancePercent == 0 || _maintenancePercent > 10000) revert InvalidMaintenancePercent();
        maintenancePercent = _maintenancePercent;
        nextPositionId = 1;
    }

    // ===== ADMIN FUNCTIONS =====

    /**
     * @dev Update maintenance margin percentage (only owner)
     * @param _newPercent New maintenance percentage (in basis points)
     */
    function setMaintenancePercent(uint16 _newPercent) external onlyOwner {
        if (_newPercent == 0 || _newPercent > 10000) revert InvalidMaintenancePercent();
        uint16 oldPercent = maintenancePercent;
        maintenancePercent = _newPercent;
        emit MaintenancePercentUpdated(oldPercent, _newPercent);
    }

    /**
     * @dev Update liquidation penalty percentage (only owner)
     * @param _newPercent New penalty percentage (in basis points)
     */
    function setLiquidationPenaltyPercent(uint256 _newPercent) external onlyOwner {
        require(_newPercent <= 1000, "Penalty too high"); // Max 10%
        liquidationPenaltyPercent = _newPercent;
    }

    // ===== POSITION MANAGEMENT =====

    /**
     * @dev Open bilateral position (called by PostInteractionAdapter)
     * @param maker Order maker address
     * @param taker Order taker address
     * @param signedSize Position size (signed: positive = maker long, negative = maker short)
     * @param notional Position notional value
     * @param makerMargin Maker's margin amount
     * @param takerMargin Taker's margin amount
     * @return positionId The ID of the created position
     */
    function openBilateralPosition(
        address maker,
        address taker,
        int256 signedSize,
        uint256 notional,
        uint256 makerMargin,
        uint256 takerMargin
    ) external nonReentrant returns (uint256) {
        // Access control: only owner or PostInteractionAdapter should call this
        // In deployment, set owner to PostInteractionAdapter or use dedicated role
        if (msg.sender != owner()) revert OnlyPostInteractionAdapter();
        
        if (maker == taker) revert SameParties();
        require(signedSize != 0, "Zero size");
        require(notional > 0, "Zero notional");
        require(makerMargin > 0 && takerMargin > 0, "Zero margin");

        uint256 positionId = nextPositionId++;
        uint256 currentPrice = _getPrice();

        positions[positionId] = Position({
            maker: maker,
            taker: taker,
            size: signedSize,
            notional: notional,
            entryPrice: currentPrice,
            makerMargin: makerMargin,
            takerMargin: takerMargin,
            openTimestamp: block.timestamp,
            isActive: true
        });

        ownerPositions[maker].push(positionId);
        ownerPositions[taker].push(positionId);

        emit PositionOpened(positionId, maker, taker, signedSize, notional, currentPrice);
        return positionId;
    }

    /**
     * @dev Close a position (either party can call)
     * @param positionId Position ID to close
     */
    function closePosition(uint256 positionId) external nonReentrant {
        Position storage pos = positions[positionId];
        if (!pos.isActive) revert PositionNotFound();
        if (msg.sender != pos.maker && msg.sender != pos.taker) revert NotPositionParty();
        
        _settlePosition(positionId);
        
        emit PositionClosed(positionId, msg.sender);
    }

    /**
     * @dev Liquidate an undercollateralized position
     * @param positionId Position ID to liquidate
     */
    function liquidate(uint256 positionId) external nonReentrant {
        Position storage pos = positions[positionId];
        if (!pos.isActive) revert PositionNotFound();
        
        uint256 currentPrice = _getPrice();
        
        // Calculate PnL for maker
        int256 pnlMaker = _calculatePnL(pos, currentPrice);
        
        // Calculate equity for maker = makerMargin + pnlMaker
        int256 makerEquity = int256(pos.makerMargin) + pnlMaker;
        uint256 maintenanceMargin = (pos.notional * maintenancePercent) / 10000;

        if (makerEquity >= int256(maintenanceMargin)) revert NotLiquidatable();

        // Calculate liquidation penalty
        uint256 penalty = (pos.makerMargin * liquidationPenaltyPercent) / 10000;
        
        // Pay penalty to liquidator from vault
        vault.forceTransferFromSettlement(msg.sender, penalty);
        
        // Settle remaining position
        _settlePosition(positionId);
        
        emit PositionLiquidated(positionId, msg.sender, penalty);
    }

    // ===== INTERNAL FUNCTIONS =====

    /**
     * @dev Get current price from oracle
     * @return Current price scaled by 1e18
     */
    function _getPrice() internal view returns (uint256) {
        try MockOracle(oracle).getPrice() returns (uint256 price) {
            return price;
        } catch {
            revert OracleCallFailed();
        }
    }

    /**
     * @dev Calculate PnL for maker
     * @param pos Position data
     * @param currentPrice Current market price
     * @return PnL for maker (can be negative)
     */
    function _calculatePnL(Position memory pos, uint256 currentPrice) internal pure returns (int256) {
        // PnL for maker = size * (currentPrice - entryPrice) / 1e18
        int256 priceDelta = int256(currentPrice) - int256(pos.entryPrice);
        return (pos.size * priceDelta) / int256(1e18);
    }

    /**
     * @dev Settle position by calculating and distributing PnL
     * @param positionId Position ID to settle
     */
    function _settlePosition(uint256 positionId) internal {
        Position storage pos = positions[positionId];
        uint256 currentPrice = _getPrice();
        
        // Calculate PnL for maker
        int256 pnlMaker = _calculatePnL(pos, currentPrice);
        
        // Settle PnL between parties
        if (pnlMaker > 0) {
            // Maker profit: transfer from taker's locked margin to maker
            uint256 profit = uint256(pnlMaker);
            uint256 transferAmount = profit > pos.takerMargin ? pos.takerMargin : profit;
            
            // Transfer locked funds from taker to maker
            vault.transferLocked(pos.taker, pos.maker, transferAmount);
            
            // Return remaining margins to unlocked balance
            vault.unlockAndReturn(pos.maker, pos.makerMargin + transferAmount);
            if (pos.takerMargin > transferAmount) {
                vault.unlockAndReturn(pos.taker, pos.takerMargin - transferAmount);
            }
        } else if (pnlMaker < 0) {
            // Maker loss: transfer from maker's locked margin to taker
            uint256 loss = uint256(-pnlMaker);
            uint256 transferAmount = loss > pos.makerMargin ? pos.makerMargin : loss;
            
            // Transfer locked funds from maker to taker
            vault.transferLocked(pos.maker, pos.taker, transferAmount);
            
            // Return remaining margins to unlocked balance
            vault.unlockAndReturn(pos.taker, pos.takerMargin + transferAmount);
            if (pos.makerMargin > transferAmount) {
                vault.unlockAndReturn(pos.maker, pos.makerMargin - transferAmount);
            }
        } else {
            // No PnL change: return margins to both parties
            vault.unlockAndReturn(pos.maker, pos.makerMargin);
            vault.unlockAndReturn(pos.taker, pos.takerMargin);
        }
        
        // Mark position as inactive
        pos.isActive = false;
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @dev Get position details with current PnL
     * @param positionId Position ID
     * @return pos Position data
     * @return currentPnL Current unrealized PnL for maker
     * @return currentPrice Current market price
     */
    function getPositionDetails(uint256 positionId)
        external
        view
        returns (
            Position memory pos,
            int256 currentPnL,
            uint256 currentPrice
        )
    {
        pos = positions[positionId];
        if (!pos.isActive) revert PositionNotFound();
        
        currentPrice = _getPrice();
        currentPnL = _calculatePnL(pos, currentPrice);
    }

    /**
     * @dev Get all position IDs for a user
     * @param user User address
     * @return Array of position IDs
     */
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return ownerPositions[user];
    }

    /**
     * @dev Check if position is liquidatable
     * @param positionId Position ID to check
     * @return Whether position can be liquidated
     */
    function isLiquidatable(uint256 positionId) external view returns (bool) {
        Position memory pos = positions[positionId];
        if (!pos.isActive) return false;
        
        uint256 currentPrice = _getPrice();
        int256 pnlMaker = _calculatePnL(pos, currentPrice);
        int256 makerEquity = int256(pos.makerMargin) + pnlMaker;
        uint256 maintenanceMargin = (pos.notional * maintenancePercent) / 10000;
        
        return makerEquity < int256(maintenanceMargin);
    }

    /**
     * @dev Get current market price
     * @return Current price from oracle
     */
    function getCurrentPrice() external view returns (uint256) {
        return _getPrice();
    }
}
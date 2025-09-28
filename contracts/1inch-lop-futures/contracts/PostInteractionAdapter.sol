// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./FuturesVault.sol";
import "./FuturesMarket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PostInteractionAdapter
 * @dev PostInteraction adapter: called after settlement has deposited maker funds to the vault.
 * Expected `data` abi-encoding:
 * abi.encode(address maker, address taker, int256 signedSize, uint16 leverage, uint256 makerMargin, uint256 takerMargin, uint256 notional)
 * 
 * The adapter will call market.openBilateralPosition(...).
 */
contract PostInteractionAdapter is Ownable, ReentrancyGuard {
    FuturesVault public vault;
    FuturesMarket public market;

    // Events
    event PostInteractionCalled(
        address indexed maker,
        address indexed taker,
        uint256 indexed positionId,
        int256 size,
        uint256 notional
    );
    event VaultUpdated(address indexed oldVault, address indexed newVault);
    event MarketUpdated(address indexed oldMarket, address indexed newMarket);

    // Custom errors
    error ZeroAddress();
    error InvalidCalldata();
    error InsufficientMakerMargin();
    error InsufficientTakerMargin();
    error OnlySettlement();

    constructor(FuturesVault _vault, FuturesMarket _market) Ownable(msg.sender) {
        if (address(_vault) == address(0)) revert ZeroAddress();
        if (address(_market) == address(0)) revert ZeroAddress();
        vault = _vault;
        market = _market;
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
     * @dev Update market reference
     * @param _market New market address
     */
    function setMarket(FuturesMarket _market) external onlyOwner {
        if (address(_market) == address(0)) revert ZeroAddress();
        address oldMarket = address(market);
        market = _market;
        emit MarketUpdated(oldMarket, address(_market));
    }

    // ===== POST-INTERACTION LOGIC =====

    /**
     * @dev Called by FuturesSettlement after maker funds are credited into vault
     * @param marketAddr Market address (for validation)
     * @param data Encoded position parameters
     * @return positionId The created position ID
     */
    function onPostInteraction(
        address marketAddr,
        bytes calldata data
    ) external nonReentrant returns (uint256 positionId) {
        // Verify the market address matches
        require(marketAddr == address(market), "Market mismatch");
        
        // Decode the position parameters
        (
            address maker,
            address taker,
            int256 signedSize,
            ,  // leverage (unused in this function)
            uint256 makerMargin,
            uint256 takerMargin,
            uint256 notional
        ) = _decodePostInteractionData(data);

        // Validate that both parties have sufficient locked margins
        if (vault.lockedOf(maker) < makerMargin) revert InsufficientMakerMargin();
        if (vault.lockedOf(taker) < takerMargin) revert InsufficientTakerMargin();

        // Call the market to open the bilateral position
        positionId = market.openBilateralPosition(
            maker,
            taker,
            signedSize,
            notional,
            makerMargin,
            takerMargin
        );

        emit PostInteractionCalled(maker, taker, positionId, signedSize, notional);
        return positionId;
    }

    /**
     * @dev Internal function to decode post interaction data
     * @param data Encoded data
     * @return maker Maker address
     * @return taker Taker address
     * @return signedSize Position size (signed)
     * @return leverage Leverage multiplier
     * @return makerMargin Maker margin amount
     * @return takerMargin Taker margin amount
     * @return notional Position notional value
     */
    function _decodePostInteractionData(bytes calldata data)
        private
        view
        returns (
            address maker,
            address taker,
            int256 signedSize,
            uint16 leverage,
            uint256 makerMargin,
            uint256 takerMargin,
            uint256 notional
        )
    {
        try this.decodePostInteractionData(data) returns (
            address _maker,
            address _taker,
            int256 _signedSize,
            uint16 _leverage,
            uint256 _makerMargin,
            uint256 _takerMargin,
            uint256 _notional
        ) {
            return (_maker, _taker, _signedSize, _leverage, _makerMargin, _takerMargin, _notional);
        } catch {
            revert InvalidCalldata();
        }
    }

    /**
     * @dev External function to decode post interaction data (for validation)
     * @param data Encoded data
     * @return maker Maker address
     * @return taker Taker address
     * @return signedSize Position size (signed)
     * @return leverage Leverage multiplier
     * @return makerMargin Maker margin amount
     * @return takerMargin Taker margin amount
     * @return notional Position notional value
     */
    function decodePostInteractionData(bytes calldata data)
        external
        pure
        returns (
            address maker,
            address taker,
            int256 signedSize,
            uint16 leverage,
            uint256 makerMargin,
            uint256 takerMargin,
            uint256 notional
        )
    {
        return abi.decode(data, (address, address, int256, uint16, uint256, uint256, uint256));
    }

    /**
     * @dev Helper function to encode post interaction data
     * @param maker Maker address
     * @param taker Taker address
     * @param signedSize Position size (signed)
     * @param leverage Leverage multiplier
     * @param makerMargin Maker margin amount
     * @param takerMargin Taker margin amount
     * @param notional Position notional value
     * @return Encoded bytes
     */
    function encodePostInteractionData(
        address maker,
        address taker,
        int256 signedSize,
        uint16 leverage,
        uint256 makerMargin,
        uint256 takerMargin,
        uint256 notional
    ) external pure returns (bytes memory) {
        return abi.encode(maker, taker, signedSize, leverage, makerMargin, takerMargin, notional);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @dev Validate post interaction data format
     * @param data Data to validate
     * @return isValid Whether data is valid
     */
    function validatePostInteractionData(bytes calldata data) external view returns (bool isValid) {
        if (data.length == 0) return false;
        
        try this.decodePostInteractionData(data) returns (
            address maker,
            address taker,
            int256 signedSize,
            uint16 leverage,
            uint256 makerMargin,
            uint256 takerMargin,
            uint256 notional
        ) {
            return maker != address(0) &&
                   taker != address(0) &&
                   maker != taker &&
                   signedSize != 0 &&
                   leverage > 0 &&
                   makerMargin > 0 &&
                   takerMargin > 0 &&
                   notional > 0;
        } catch {
            return false;
        }
    }

    /**
     * @dev Check if both parties have sufficient locked margins
     * @param maker Maker address
     * @param taker Taker address
     * @param makerMargin Required maker margin
     * @param takerMargin Required taker margin
     * @return Whether both have sufficient locked margins
     */
    function checkSufficientMargins(
        address maker,
        address taker,
        uint256 makerMargin,
        uint256 takerMargin
    ) external view returns (bool) {
        return vault.lockedOf(maker) >= makerMargin &&
               vault.lockedOf(taker) >= takerMargin;
    }
}
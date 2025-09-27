// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CitreaLayeredOptionsTrading
 * @dev Advanced options trading with layered tokenization
 */
contract CitreaLayeredOptionsTrading is ERC1155, Ownable, ReentrancyGuard {
    
    enum OptionType { CALL, PUT }
    
    // Simplified structs to avoid stack depth issues
    struct LayeredOption {
        address baseAsset;
        uint256 strikePrice;
        uint256 expiry;
        uint256 premium;
        uint256 parentTokenId;
        OptionType optionType;
        address premiumToken; // Stablecoin for premium payments
        bool isExercised;
    }

    // Core state variables
    mapping(uint256 => LayeredOption) public options;
    mapping(address => bool) public supportedAssets;
    uint256 private nextTokenId = 1;
    
    // Events
    event LayeredOptionCreated(uint256 indexed tokenId, address indexed baseAsset, uint256 strikePrice);
    
    constructor(address initialOwner) 
        ERC1155("https://metadata.citreaoptions.com/{id}")
        Ownable(initialOwner)
        ReentrancyGuard()
    {}
    
    /**
     * @dev Create a layered option token
     */
    function createLayeredOption(
        address baseAsset,
        uint256 strikePrice,
        uint256 expiry,
        uint256 premium,
        uint256 parentTokenId,
        OptionType optionType,
        address premiumToken
    ) external payable nonReentrant returns (uint256) {
        require(supportedAssets[baseAsset], "Asset not supported");
        require(expiry > block.timestamp, "Invalid expiry");
        
        // Handle premium payment
        if (premium > 0) {
            if (premiumToken == address(0)) {
                // ETH payment
                require(msg.value >= premium, "Insufficient ETH premium");
            } else {
                // ERC20 token payment
                require(IERC20(premiumToken).transferFrom(msg.sender, address(this), premium), "Premium payment failed");
            }
        }
        
        uint256 tokenId = nextTokenId++;
        
        options[tokenId] = LayeredOption({
            baseAsset: baseAsset,
            strikePrice: strikePrice,
            expiry: expiry,
            premium: premium,
            parentTokenId: parentTokenId,
            optionType: optionType,
            premiumToken: premiumToken,
            isExercised: false
        });
        
        _mint(msg.sender, tokenId, 1, "");
        
        emit LayeredOptionCreated(tokenId, baseAsset, strikePrice);
        return tokenId;
    }
    
    /**
     * @dev Exercise a layered option
     */
    function exerciseOption(uint256 tokenId) external nonReentrant {
        require(balanceOf(msg.sender, tokenId) > 0, "Not option holder");
        LayeredOption storage option = options[tokenId];
        require(block.timestamp <= option.expiry, "Option expired");
        require(!option.isExercised, "Option already exercised");
        
        // Mark as exercised
        option.isExercised = true;
        
        // Simple exercise logic - can be expanded
        _burn(msg.sender, tokenId, 1);
    }
    
    /**
     * @dev Create child option from parent
     */
    function createChildOption(
        uint256 parentTokenId,
        uint256 newStrikePrice,
        uint256 newExpiry,
        OptionType optionType
    ) external payable nonReentrant returns (uint256) {
        require(balanceOf(msg.sender, parentTokenId) > 0, "Not parent holder");
        LayeredOption memory parent = options[parentTokenId];
        require(block.timestamp <= parent.expiry, "Parent expired");
        
        uint256 childPremium = parent.premium / 2; // Simple premium calculation
        
        // Handle premium payment for child option
        if (childPremium > 0) {
            if (parent.premiumToken == address(0)) {
                // ETH payment
                require(msg.value >= childPremium, "Insufficient ETH premium");
            } else {
                // ERC20 token payment
                require(IERC20(parent.premiumToken).transferFrom(msg.sender, address(this), childPremium), "Premium payment failed");
            }
        }
        
        uint256 childTokenId = nextTokenId++;
        
        options[childTokenId] = LayeredOption({
            baseAsset: parent.baseAsset,
            strikePrice: newStrikePrice,
            expiry: newExpiry,
            premium: childPremium,
            parentTokenId: parentTokenId,
            optionType: optionType,
            premiumToken: parent.premiumToken,
            isExercised: false
        });
        
        _mint(msg.sender, childTokenId, 1, "");
        
        emit LayeredOptionCreated(childTokenId, parent.baseAsset, newStrikePrice);
        return childTokenId;
    }
    
    /**
     * @dev Add supported asset
     */
    function addSupportedAsset(address asset) external onlyOwner {
        supportedAssets[asset] = true;
    }
    
    /**
     * @dev Get option details
     */
    function getOption(uint256 tokenId) external view returns (LayeredOption memory) {
        return options[tokenId];
    }
    /**
     * @dev Check if option is expired
     */
    function isOptionExpired(uint256 tokenId) external view returns (bool) {
        return block.timestamp > options[tokenId].expiry;
    }
    
    /**
     * @dev Get option children (simplified - returns next token ID for demo)
     */
    function getOptionChildren(uint256 parentTokenId) external pure returns (uint256[] memory) {
        // Simplified implementation - in production, would maintain child mappings
        uint256[] memory children = new uint256[](1);
        children[0] = parentTokenId + 1; // Demo implementation
        return children;
    }
    
    /**
     * @dev Override required by ERC1155
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override {
        super._update(from, to, ids, values);
    }
}
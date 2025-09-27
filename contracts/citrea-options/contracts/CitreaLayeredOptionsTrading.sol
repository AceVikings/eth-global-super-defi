// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CitreaLayeredOptionsTrading
 * @dev Advanced options trading with layered tokenization
 */
contract CitreaLayeredOptionsTrading is ERC1155, Ownable, ReentrancyGuard {
    
    // Simplified structs to avoid stack depth issues
    struct LayeredOption {
        address baseAsset;
        uint256 strikePrice;
        uint256 expiry;
        uint256 premium;
        uint256 parentTokenId;
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
        uint256 parentTokenId
    ) external onlyOwner nonReentrant returns (uint256) {
        require(supportedAssets[baseAsset], "Asset not supported");
        require(expiry > block.timestamp, "Invalid expiry");
        
        uint256 tokenId = nextTokenId++;
        
        options[tokenId] = LayeredOption({
            baseAsset: baseAsset,
            strikePrice: strikePrice,
            expiry: expiry,
            premium: premium,
            parentTokenId: parentTokenId
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
        LayeredOption memory option = options[tokenId];
        require(block.timestamp <= option.expiry, "Option expired");
        
        // Simple exercise logic - can be expanded
        _burn(msg.sender, tokenId, 1);
    }
    
    /**
     * @dev Create child option from parent
     */
    function createChildOption(
        uint256 parentTokenId,
        uint256 newStrikePrice,
        uint256 newExpiry
    ) external nonReentrant returns (uint256) {
        require(balanceOf(msg.sender, parentTokenId) > 0, "Not parent holder");
        LayeredOption memory parent = options[parentTokenId];
        require(block.timestamp <= parent.expiry, "Parent expired");
        
        uint256 childTokenId = nextTokenId++;
        
        options[childTokenId] = LayeredOption({
            baseAsset: parent.baseAsset,
            strikePrice: newStrikePrice,
            expiry: newExpiry,
            premium: parent.premium / 2, // Simple premium calculation
            parentTokenId: parentTokenId
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
     * @dev Batch create layered options
     */
    function batchCreateOptions(
        address[] calldata baseAssets,
        uint256[] calldata strikePrices,
        uint256[] calldata expiries,
        uint256[] calldata premiums
    ) external onlyOwner nonReentrant returns (uint256[] memory) {
        require(baseAssets.length == strikePrices.length, "Array length mismatch");
        require(baseAssets.length == expiries.length, "Array length mismatch");
        require(baseAssets.length == premiums.length, "Array length mismatch");
        
        uint256[] memory tokenIds = new uint256[](baseAssets.length);
        
        for (uint256 i = 0; i < baseAssets.length; i++) {
            require(supportedAssets[baseAssets[i]], "Asset not supported");
            require(expiries[i] > block.timestamp, "Invalid expiry");
            
            uint256 tokenId = nextTokenId++;
            
            options[tokenId] = LayeredOption({
                baseAsset: baseAssets[i],
                strikePrice: strikePrices[i],
                expiry: expiries[i],
                premium: premiums[i],
                parentTokenId: 0 // Root option
            });
            
            tokenIds[i] = tokenId;
            _mint(msg.sender, tokenId, 1, "");
            
            emit LayeredOptionCreated(tokenId, baseAssets[i], strikePrices[i]);
        }
        
        return tokenIds;
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
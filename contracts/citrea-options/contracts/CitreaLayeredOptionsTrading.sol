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
    address public stablecoin; // Stablecoin address for child option premiums
    uint256 private nextTokenId = 1;
    
    // Premium calculation constants
    uint256 public constant BASE_PREMIUM_RATE = 100; // 0.01% = 100 basis points per 1000
    uint256 public constant BASIS_POINTS = 10000;
    
    // Events
    event LayeredOptionCreated(
        uint256 indexed tokenId, 
        address indexed creator,
        address indexed baseAsset, 
        uint256 strikePrice,
        uint256 expiry,
        uint256 premium,
        uint256 parentTokenId,
        OptionType optionType,
        address premiumToken
    );
    
    event ChildOptionCreated(
        uint256 indexed tokenId,
        uint256 indexed parentTokenId,
        address indexed creator,
        uint256 strikePrice,
        uint256 expiry,
        OptionType optionType
    );
    
    event OptionExercised(
        uint256 indexed tokenId,
        address indexed exerciser,
        uint256 payout,
        bool isExercised
    );
    
    constructor(address initialOwner, address _stablecoin) 
        ERC1155("https://metadata.citreaoptions.com/{id}")
        Ownable(initialOwner)
        ReentrancyGuard()
    {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        stablecoin = _stablecoin;
    }
    
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
        
        emit LayeredOptionCreated(
            tokenId,
            msg.sender,
            baseAsset,
            strikePrice,
            expiry,
            premium,
            parentTokenId,
            optionType,
            premiumToken
        );
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
        
        emit OptionExercised(tokenId, msg.sender, 0, true); // payout=0 for now
    }
    
    /**
     * @dev Create child option from parent with automatic validation and premium calculation
     * Child of CALL can only be CALL at higher strike, child of PUT can only be PUT at lower strike
     * Premium is always paid in stablecoin
     */
    function createChildOption(
        uint256 parentTokenId,
        uint256 newStrikePrice,
        uint256 newExpiry  // 0 means use parent expiry
    ) external nonReentrant returns (uint256) {
        require(balanceOf(msg.sender, parentTokenId) > 0, "Not parent holder");
        LayeredOption memory parent = options[parentTokenId];
        require(block.timestamp <= parent.expiry, "Parent expired");
        require(!parent.isExercised, "Parent exercised");
        
        // Validate strike price based on option type
        if (parent.optionType == OptionType.CALL) {
            require(newStrikePrice > parent.strikePrice, "Child CALL strike must be higher than parent");
        } else {
            require(newStrikePrice < parent.strikePrice, "Child PUT strike must be lower than parent");
        }
        
        // Handle expiry - default to parent expiry if 0
        uint256 childExpiry = newExpiry == 0 ? parent.expiry : newExpiry;
        require(childExpiry <= parent.expiry, "Child expiry cannot exceed parent");
        require(childExpiry > block.timestamp, "Child expiry must be in future");
        
        // Calculate premium based on strike differential and time remaining
        uint256 childPremium = _calculateChildPremium(
            parent.strikePrice,
            newStrikePrice,
            parent.expiry,
            childExpiry,
            parent.optionType
        );
        
        // Premium is always paid in stablecoin for child options
        require(IERC20(stablecoin).transferFrom(msg.sender, address(this), childPremium), "Stablecoin premium payment failed");
        
        uint256 childTokenId = nextTokenId++;
        
        options[childTokenId] = LayeredOption({
            baseAsset: parent.baseAsset,
            strikePrice: newStrikePrice,
            expiry: childExpiry,
            premium: childPremium,
            parentTokenId: parentTokenId,
            optionType: parent.optionType, // Same type as parent
            premiumToken: stablecoin, // Always stablecoin for children
            isExercised: false
        });
        
        _mint(msg.sender, childTokenId, 1, "");
        
        emit ChildOptionCreated(
            childTokenId,
            parentTokenId,
            msg.sender,
            newStrikePrice,
            childExpiry,
            parent.optionType
        );
        return childTokenId;
    }
    
    /**
     * @dev Calculate child option premium based on strike differential and time
     */
    function _calculateChildPremium(
        uint256 parentStrike,
        uint256 childStrike,
        uint256 parentExpiry,
        uint256 childExpiry,
        OptionType optionType
    ) internal view returns (uint256) {
        uint256 strikeDiff;
        
        if (optionType == OptionType.CALL) {
            strikeDiff = childStrike - parentStrike;
        } else {
            strikeDiff = parentStrike - childStrike;
        }
        
        // Time ratio: how much of the parent's time the child uses
        uint256 timeRatio = (childExpiry - block.timestamp) * BASIS_POINTS / (parentExpiry - block.timestamp);
        
        // Premium = strike differential * time ratio * base rate
        // This gives a premium proportional to risk and time
        uint256 premium = (strikeDiff * timeRatio * BASE_PREMIUM_RATE) / (BASIS_POINTS * BASIS_POINTS);
        
        // Minimum premium of 0.001 USDC (1000 wei for 6 decimals)
        // For USDC with 6 decimals: 0.001 = 1000 wei
        uint256 minPremium = 1000; // 0.001 USDC in 6 decimal wei
        return premium < minPremium ? minPremium : premium;
    }
    
    /**
     * @dev Preview child option premium without creating the option
     */
    function calculateChildPremium(
        uint256 parentTokenId,
        uint256 newStrikePrice,
        uint256 newExpiry
    ) external view returns (uint256) {
        require(options[parentTokenId].baseAsset != address(0), "Parent option does not exist");
        LayeredOption memory parent = options[parentTokenId];
        require(!parent.isExercised, "Parent exercised");
        require(block.timestamp <= parent.expiry, "Parent expired");
        
        // Validate strike price
        if (parent.optionType == OptionType.CALL) {
            require(newStrikePrice > parent.strikePrice, "Child CALL strike must be higher than parent");
        } else {
            require(newStrikePrice < parent.strikePrice, "Child PUT strike must be lower than parent");
        }
        
        uint256 childExpiry = newExpiry == 0 ? parent.expiry : newExpiry;
        require(childExpiry <= parent.expiry, "Child expiry cannot exceed parent");
        require(childExpiry > block.timestamp, "Child expiry must be in future");
        
        return _calculateChildPremium(
            parent.strikePrice,
            newStrikePrice,
            parent.expiry,
            childExpiry,
            parent.optionType
        );
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
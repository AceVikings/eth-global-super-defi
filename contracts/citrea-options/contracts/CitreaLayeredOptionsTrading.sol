// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./MockPriceFeed.sol";
import "./TimeOracle.sol";

/**
 * @title CitreaLayeredOptionsTrading
 * @dev Advanced options trading contract with layered collateralization support
 * Features: Option tokens as collateral, chained derivatives, cascade settlement
 */
contract CitreaLayeredOptionsTrading is ERC1155, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    enum OptionType { CALL, PUT }
    enum OptionStatus { ACTIVE, EXERCISED, EXPIRED }

    struct OptionToken {
        uint256 tokenId;              // Unique ERC1155 token ID
        uint256 parentTokenId;        // Parent option token ID (0 if root)
        address underlyingAsset;      // BTC, ETH, etc.
        uint256 strikePrice;          // Exercise price (8 decimals)
        uint256 expiryTimestamp;      // Expiration time
        OptionType optionType;        // CALL or PUT
        uint256 contractSize;         // Size of contract (e.g., 1 BTC = 1e8)
        address originalWriter;       // Who wrote the original option
        address collateralToken;      // Token used for collateral/premium
        uint256 premium;              // Premium paid/received
        uint256 collateralAmount;     // Collateral locked (for root options)
        OptionStatus status;          // Current status
        bool isUsedAsCollateral;      // Whether used to collateralize another option
        uint256 childTokenId;         // Child option token ID (0 if none)
        uint256 createdAt;            // Timestamp when created
    }

    struct CollateralChain {
        uint256[] tokenIds;           // Chain of token IDs from root to leaf
        uint256 totalCollateral;     // Total locked collateral at root
        uint256 activeCollateral;    // Remaining active collateral
        bool isActive;               // Whether chain is still active
        uint256 lastExerciseLevel;   // Last level that was exercised
    }

    struct MarketParams {
        uint256 volatility;          // Implied volatility (basis points)
        uint256 riskFreeRate;        // Risk-free rate (basis points)
        uint256 minTimeToExpiry;     // Minimum time to expiry (seconds)
        uint256 maxTimeToExpiry;     // Maximum time to expiry (seconds)
        bool isPaused;
    }

    // Constants
    uint256 private constant PRICE_DECIMALS = 8;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_YEAR = 365 * 24 * 3600;

    // State variables
    uint256 public nextTokenId = 1;
    mapping(uint256 => OptionToken) public optionTokens;
    mapping(uint256 => CollateralChain) public collateralChains;
    mapping(address => uint256[]) public userTokens;
    mapping(address => bool) public supportedAssets;
    mapping(address => bool) public supportedCollaterals;
    mapping(address => MockPriceFeed) public priceFeeds;
    mapping(address => MarketParams) public marketParams;
    mapping(address => uint256) public totalCollateralLocked;
    
    TimeOracle public timeOracle;

    // Events
    event OptionTokenCreated(
        uint256 indexed tokenId,
        address indexed writer,
        uint256 parentTokenId,
        OptionType optionType,
        uint256 strikePrice,
        uint256 expiryTimestamp,
        uint256 premium,
        uint256 collateral
    );
    
    event OptionTokenPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 premium
    );
    
    event OptionChainExercised(
        uint256 indexed tokenId,
        address indexed exerciser,
        uint256[] chainTokenIds,
        uint256 totalPayout
    );
    
    event CollateralChainCreated(
        uint256 indexed parentTokenId,
        uint256 indexed childTokenId,
        uint256 chainLength
    );

    constructor(
        address _owner,
        address _timeOracle,
        string memory _uri
    ) ERC1155(_uri) Ownable(_owner) {
        timeOracle = TimeOracle(_timeOracle);
    }

    // Modifiers
    modifier onlyValidAsset(address asset) {
        require(supportedAssets[asset], "Asset not supported");
        _;
    }

    modifier onlyValidCollateral(address collateral) {
        require(supportedCollaterals[collateral], "Collateral not supported");
        _;
    }

    modifier tokenExists(uint256 tokenId) {
        require(optionTokens[tokenId].tokenId != 0, "Token does not exist");
        _;
    }

    modifier onlyTokenHolder(uint256 tokenId) {
        require(balanceOf(msg.sender, tokenId) > 0, "Not token holder");
        _;
    }

    // Owner functions
    function addSupportedAsset(
        address asset,
        address priceFeed,
        uint256 volatility,
        uint256 riskFreeRate
    ) external onlyOwner {
        supportedAssets[asset] = true;
        priceFeeds[asset] = MockPriceFeed(priceFeed);
        marketParams[asset] = MarketParams({
            volatility: volatility,
            riskFreeRate: riskFreeRate,
            minTimeToExpiry: 1 hours,
            maxTimeToExpiry: 365 days,
            isPaused: false
        });
    }

    function addSupportedCollateral(address collateral) external onlyOwner {
        supportedCollaterals[collateral] = true;
    }

    // Core option creation function
    function createOption(
        OptionType optionType,
        uint256 strikePrice,
        uint256 expiryTimestamp,
        address underlyingAsset,
        address collateralToken,
        uint256 contractSize
    ) external
        nonReentrant
        onlyValidAsset(underlyingAsset)
        onlyValidCollateral(collateralToken)
        returns (uint256)
    {
        _validateOptionParams(optionType, strikePrice, expiryTimestamp, underlyingAsset, contractSize);
        
        // Calculate required amounts
        CreateOptionParams memory params = CreateOptionParams({
            optionType: optionType,
            strikePrice: strikePrice,
            expiryTimestamp: expiryTimestamp,
            underlyingAsset: underlyingAsset,
            collateralToken: collateralToken,
            contractSize: contractSize
        });
        
        (uint256 collateralRequired, uint256 premium) = _calculateOptionCosts(params);
        
        // Create and setup option token
        return _createAndMintOption(params, collateralRequired, premium, 0);
    }
    
    struct CreateOptionParams {
        OptionType optionType;
        uint256 strikePrice;
        uint256 expiryTimestamp;
        address underlyingAsset;
        address collateralToken;
        uint256 contractSize;
    }
    
    function _validateOptionParams(
        OptionType optionType,
        uint256 strikePrice,
        uint256 expiryTimestamp,
        address underlyingAsset,
        uint256 contractSize
    ) internal view {
        require(!marketParams[underlyingAsset].isPaused, "Market is paused");
        require(expiryTimestamp > timeOracle.getCurrentTime(), "Expiry in the past");
        require(strikePrice > 0, "Invalid strike price");
        require(contractSize > 0, "Invalid contract size");

        uint256 timeToExpiry = expiryTimestamp - timeOracle.getCurrentTime();
        require(
            timeToExpiry >= marketParams[underlyingAsset].minTimeToExpiry &&
            timeToExpiry <= marketParams[underlyingAsset].maxTimeToExpiry,
            "Invalid expiry time"
        );
    }
    
    function _calculateOptionCosts(CreateOptionParams memory params) 
        internal 
        view 
        returns (uint256 collateralRequired, uint256 premium) 
    {
        collateralRequired = calculateCollateralRequired(
            params.optionType,
            params.strikePrice,
            params.underlyingAsset,
            params.contractSize
        );

        premium = calculatePremium(
            params.optionType,
            params.strikePrice,
            params.expiryTimestamp,
            params.underlyingAsset,
            params.contractSize
        );
    }
    
    function _createAndMintOption(
        CreateOptionParams memory params,
        uint256 collateralRequired,
        uint256 premium,
        uint256 parentTokenId
    ) internal returns (uint256) {
        // Lock collateral if needed
        if (collateralRequired > 0) {
            IERC20(params.collateralToken).safeTransferFrom(
                msg.sender,
                address(this),
                collateralRequired
            );
        }

        // Create option token
        uint256 tokenId = nextTokenId++;
        optionTokens[tokenId] = OptionToken({
            tokenId: tokenId,
            parentTokenId: parentTokenId,
            underlyingAsset: params.underlyingAsset,
            strikePrice: params.strikePrice,
            expiryTimestamp: params.expiryTimestamp,
            optionType: params.optionType,
            contractSize: params.contractSize,
            originalWriter: msg.sender,
            collateralToken: params.collateralToken,
            premium: premium,
            collateralAmount: collateralRequired,
            status: OptionStatus.ACTIVE,
            isUsedAsCollateral: false,
            childTokenId: 0,
            createdAt: block.timestamp
        });

        // Mint option token to writer
        _mint(msg.sender, tokenId, 1, "");
        
        // Track user tokens
        userTokens[msg.sender].push(tokenId);
        
        if (collateralRequired > 0) {
            totalCollateralLocked[params.collateralToken] += collateralRequired;
            
            // Initialize collateral chain for root option
            collateralChains[tokenId] = CollateralChain({
                tokenIds: new uint256[](1),
                totalCollateral: collateralRequired,
                activeCollateral: collateralRequired,
                isActive: true,
                lastExerciseLevel: 0
            });
            collateralChains[tokenId].tokenIds[0] = tokenId;
        }

        emit OptionTokenCreated(
            tokenId,
            msg.sender,
            parentTokenId,
            params.optionType,
            params.strikePrice,
            params.expiryTimestamp,
            premium,
            collateralRequired
        );

        return tokenId;
    }

    // Create option using another option token as collateral
    function createOptionWithTokenCollateral(
        uint256 collateralTokenId,
        OptionType optionType,
        uint256 strikePrice,
        uint256 expiryTimestamp
    ) external
        nonReentrant
        tokenExists(collateralTokenId)
        onlyTokenHolder(collateralTokenId)
        returns (uint256)
    {
        OptionToken storage parentOption = optionTokens[collateralTokenId];
        
        _validateChildOption(parentOption, optionType, strikePrice, expiryTimestamp);
        
        // Create child option using parent as collateral
        CreateOptionParams memory params = CreateOptionParams({
            optionType: optionType,
            strikePrice: strikePrice,
            expiryTimestamp: expiryTimestamp,
            underlyingAsset: parentOption.underlyingAsset,
            collateralToken: parentOption.collateralToken,
            contractSize: parentOption.contractSize
        });
        
        uint256 premium = calculatePremium(
            optionType,
            strikePrice,
            expiryTimestamp,
            parentOption.underlyingAsset,
            parentOption.contractSize
        );
        
        uint256 childTokenId = _createAndMintOption(params, 0, premium, collateralTokenId);
        
        // Update parent-child relationship
        parentOption.isUsedAsCollateral = true;
        parentOption.childTokenId = childTokenId;
        
        // Update collateral chain
        _updateCollateralChain(collateralTokenId, childTokenId);

        emit CollateralChainCreated(
            collateralTokenId,
            childTokenId,
            collateralChains[_getRootTokenId(collateralTokenId)].tokenIds.length
        );

        return childTokenId;
    }
    
    function _validateChildOption(
        OptionToken storage parentOption,
        OptionType childOptionType,
        uint256 childStrikePrice,
        uint256 childExpiryTimestamp
    ) internal view {
        require(parentOption.status == OptionStatus.ACTIVE, "Parent option not active");
        require(!parentOption.isUsedAsCollateral, "Token already used as collateral");
        require(parentOption.expiryTimestamp == childExpiryTimestamp, "Expiry must match parent");
        
        // Validate strike price constraints
        require(
            _validateStrikePriceChain(parentOption.optionType, parentOption.strikePrice, childOptionType, childStrikePrice),
            "Invalid strike price for chain"
        );
    }

    // Purchase option token
    function purchaseOptionToken(uint256 tokenId)
        external
        nonReentrant
        tokenExists(tokenId)
    {
        OptionToken storage option = optionTokens[tokenId];
        require(option.status == OptionStatus.ACTIVE, "Option not active");
        require(balanceOf(msg.sender, tokenId) == 0, "Already owns token");
        require(balanceOf(option.originalWriter, tokenId) > 0, "Token not available");
        require(msg.sender != option.originalWriter, "Cannot buy own option");

        // Transfer premium to writer
        IERC20(option.collateralToken).safeTransferFrom(
            msg.sender,
            option.originalWriter,
            option.premium
        );

        // Transfer option token to buyer
        _safeTransferFrom(option.originalWriter, msg.sender, tokenId, 1, "");

        emit OptionTokenPurchased(tokenId, msg.sender, option.premium);
    }

    // Exercise option token (triggers chain settlement)
    function exerciseOptionToken(uint256 tokenId)
        external
        nonReentrant
        tokenExists(tokenId)
        onlyTokenHolder(tokenId)
    {
        OptionToken storage option = optionTokens[tokenId];
        require(option.status == OptionStatus.ACTIVE, "Option not active");
        require(option.expiryTimestamp > timeOracle.getCurrentTime(), "Option expired");

        uint256 currentPrice = getCurrentPrice(option.underlyingAsset);
        require(
            _isInTheMoney(option.optionType, option.strikePrice, currentPrice),
            "Option is out of the money"
        );

        // Get the full collateral chain
        uint256 rootTokenId = _getRootTokenId(tokenId);
        uint256[] memory chainTokenIds = collateralChains[rootTokenId].tokenIds;
        
        // Calculate payouts for the chain
        uint256[] memory payouts = _calculateChainPayouts(chainTokenIds, currentPrice);
        uint256 totalPayout = 0;

        // Execute chain settlement
        for (uint256 i = 0; i < chainTokenIds.length; i++) {
            uint256 chainTokenId = chainTokenIds[i];
            OptionToken storage chainOption = optionTokens[chainTokenId];
            
            if (payouts[i] > 0) {
                address holder = _getTokenHolder(chainTokenId);
                if (holder != address(0)) {
                    IERC20(chainOption.collateralToken).safeTransfer(holder, payouts[i]);
                    totalPayout += payouts[i];
                }
            }
            
            // Mark option as exercised
            chainOption.status = OptionStatus.EXERCISED;
        }

        // Update collateral chain
        CollateralChain storage chain = collateralChains[rootTokenId];
        chain.isActive = false;
        chain.activeCollateral = chain.totalCollateral - totalPayout;
        
        // Return remaining collateral to original writer
        if (chain.activeCollateral > 0) {
            OptionToken storage rootOption = optionTokens[rootTokenId];
            IERC20(rootOption.collateralToken).safeTransfer(
                rootOption.originalWriter, 
                chain.activeCollateral
            );
        }

        emit OptionChainExercised(tokenId, msg.sender, chainTokenIds, totalPayout);
    }

    // View functions
    function getOptionToken(uint256 tokenId) 
        external 
        view 
        tokenExists(tokenId) 
        returns (OptionToken memory) 
    {
        return optionTokens[tokenId];
    }

    function getCollateralChain(uint256 tokenId) 
        external 
        view 
        tokenExists(tokenId) 
        returns (CollateralChain memory) 
    {
        uint256 rootTokenId = _getRootTokenId(tokenId);
        return collateralChains[rootTokenId];
    }

    function getUserTokens(address user) external view returns (uint256[] memory) {
        return userTokens[user];
    }

    // Internal helper functions
    function _validateStrikePriceChain(
        OptionType parentType,
        uint256 parentStrike,
        OptionType childType,
        uint256 childStrike
    ) internal pure returns (bool) {
        require(parentType == childType, "Option types must match");
        
        if (parentType == OptionType.CALL) {
            return childStrike >= parentStrike;
        } else {
            return childStrike <= parentStrike;
        }
    }

    function _updateCollateralChain(uint256 parentTokenId, uint256 childTokenId) internal {
        uint256 rootTokenId = _getRootTokenId(parentTokenId);
        CollateralChain storage chain = collateralChains[rootTokenId];
        
        // Add child token to chain
        uint256[] memory newTokenIds = new uint256[](chain.tokenIds.length + 1);
        for (uint256 i = 0; i < chain.tokenIds.length; i++) {
            newTokenIds[i] = chain.tokenIds[i];
        }
        newTokenIds[chain.tokenIds.length] = childTokenId;
        chain.tokenIds = newTokenIds;
    }

    function _getRootTokenId(uint256 tokenId) internal view returns (uint256) {
        OptionToken storage option = optionTokens[tokenId];
        if (option.parentTokenId == 0) {
            return tokenId;
        }
        return _getRootTokenId(option.parentTokenId);
    }

    function _getTokenHolder(uint256 tokenId) internal view returns (address) {
        // Find current holder by checking balances
        OptionToken storage option = optionTokens[tokenId];
        if (balanceOf(option.originalWriter, tokenId) > 0) {
            return option.originalWriter;
        }
        
        // Would need to track transfers more efficiently in production
        // For now, return zero address if not with original writer
        return address(0);
    }

    function _calculateChainPayouts(
        uint256[] memory chainTokenIds,
        uint256 currentPrice
    ) internal view returns (uint256[] memory) {
        uint256[] memory payouts = new uint256[](chainTokenIds.length);
        
        for (uint256 i = 0; i < chainTokenIds.length; i++) {
            OptionToken storage option = optionTokens[chainTokenIds[i]];
            
            if (_isInTheMoney(option.optionType, option.strikePrice, currentPrice)) {
                if (option.optionType == OptionType.CALL) {
                    payouts[i] = ((currentPrice - option.strikePrice) * option.contractSize) / (10 ** PRICE_DECIMALS);
                } else {
                    payouts[i] = ((option.strikePrice - currentPrice) * option.contractSize) / (10 ** PRICE_DECIMALS);
                }
            }
        }
        
        return payouts;
    }

    function _isInTheMoney(
        OptionType optionType,
        uint256 strikePrice,
        uint256 currentPrice
    ) internal pure returns (bool) {
        if (optionType == OptionType.CALL) {
            return currentPrice > strikePrice;
        } else {
            return currentPrice < strikePrice;
        }
    }

    // Existing functions from original contract (simplified)
    function calculateCollateralRequired(
        OptionType optionType,
        uint256 strikePrice,
        address underlyingAsset,
        uint256 contractSize
    ) public view returns (uint256) {
        uint256 currentPrice = getCurrentPrice(underlyingAsset);
        
        if (optionType == OptionType.CALL) {
            return (contractSize * currentPrice) / (10 ** PRICE_DECIMALS);
        } else {
            return (contractSize * strikePrice) / (10 ** PRICE_DECIMALS);
        }
    }

    function calculatePremium(
        OptionType optionType,
        uint256 strikePrice,
        uint256 expiryTimestamp,
        address underlyingAsset,
        uint256 contractSize
    ) public view returns (uint256) {
        uint256 currentPrice = getCurrentPrice(underlyingAsset);
        uint256 timeToExpiry = expiryTimestamp > timeOracle.getCurrentTime() 
            ? expiryTimestamp - timeOracle.getCurrentTime() 
            : 0;
        
        MarketParams memory params = marketParams[underlyingAsset];
        
        // Simplified Black-Scholes calculation
        uint256 intrinsicValue = 0;
        if (optionType == OptionType.CALL && currentPrice > strikePrice) {
            intrinsicValue = currentPrice - strikePrice;
        } else if (optionType == OptionType.PUT && strikePrice > currentPrice) {
            intrinsicValue = strikePrice - currentPrice;
        }
        
        uint256 timeValue = (params.volatility * timeToExpiry * currentPrice) 
            / (BASIS_POINTS * SECONDS_PER_YEAR);
        
        return ((intrinsicValue + timeValue) * contractSize) / (10 ** PRICE_DECIMALS);
    }

    function getCurrentPrice(address asset) public view returns (uint256) {
        MockPriceFeed priceFeed = priceFeeds[asset];
        require(address(priceFeed) != address(0), "Price feed not set");
        
        (, int256 price, , ,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        
        return uint256(price);
    }

    function updateMarketParams(
        address asset,
        uint256 volatility,
        uint256 riskFreeRate,
        bool isPaused
    ) external onlyOwner {
        MarketParams storage params = marketParams[asset];
        params.volatility = volatility;
        params.riskFreeRate = riskFreeRate;
        params.isPaused = isPaused;
    }

    // ERC1155 metadata
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(optionTokens[tokenId].tokenId != 0, "Token does not exist");
        return string(abi.encodePacked(super.uri(tokenId), tokenId.toString()));
    }
}
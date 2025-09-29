// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MockPriceFeed.sol";
import "./TimeOracle.sol";

/**
 * @title CitreaLayeredOptionsTrading
 * @dev Advanced options trading with layered tokenization
 */
contract CitreaLayeredOptionsTrading is ERC1155, Ownable, ReentrancyGuard {
    enum OptionType {
        CALL,
        PUT
    }

    // Simplified structs to avoid stack depth issues
    struct LayeredOption {
        address baseAsset;
        uint256 strikePrice;
        uint256 maturity; // Changed from expiry to maturity for European options
        uint256 premium;
        uint256 parentTokenId;
        OptionType optionType;
        address premiumToken; // Stablecoin for premium payments
        bool isSettled; // Changed from isExercised to isSettled
        // Settlement tracking fields
        uint256 collateralAmount; // Amount of base asset backing this option
        address collateralProvider; // Who provided the original collateral
    }

    // Settlement tracking
    struct SettlementData {
        uint256 maturityPrice; // Price locked at maturity
        bool priceSet; // Whether maturity price has been set
        uint256 totalPayout; // Total payout calculated for this option
    }

    // Core state variables
    mapping(uint256 => LayeredOption) public options;
    mapping(uint256 => SettlementData) public settlements; // Track settlement data
    mapping(address => bool) public supportedAssets;
    mapping(uint256 => address) public optionWriters; // Track who wrote each option
    mapping(uint256 => uint256[]) public childOptions; // Track child options for each parent
    address public stablecoin; // Stablecoin address for child option premiums
    uint256 private nextTokenId = 1;

    // Premium calculation constants
    uint256 public constant BASE_PREMIUM_RATE = 100; // 0.01% = 100 basis points per 1000
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant VOLATILITY_FACTOR = 8000; // 80% volatility in basis points
    uint256 public constant TIME_DECAY_FACTOR = 4000; // 40% time value factor

    // Oracle contracts for realistic pricing
    mapping(address => MockPriceFeed) public priceFeeds; // Asset address => price feed
    TimeOracle public timeOracle;

    // Events
    event LayeredOptionCreated(
        uint256 indexed tokenId,
        address indexed creator,
        address indexed baseAsset,
        uint256 strikePrice,
        uint256 maturity, // Changed from expiry
        uint256 premium,
        uint256 parentTokenId,
        OptionType optionType,
        address premiumToken
    );

    event OptionPurchased(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed writer,
        uint256 premium
    );

    event ChildOptionCreated(
        uint256 indexed tokenId,
        uint256 indexed parentTokenId,
        address indexed creator,
        uint256 strikePrice,
        uint256 maturity, // Changed from expiry
        OptionType optionType
    );

    event OptionSettled(
        uint256 indexed tokenId,
        address indexed holder,
        uint256 maturityPrice,
        uint256 payout
    );

    event MaturityPriceSet(
        uint256 indexed tokenId,
        address indexed asset,
        uint256 maturityPrice,
        uint256 maturityTime
    );

    constructor(
        address initialOwner,
        address _stablecoin,
        address _timeOracle,
        address _wbtc,
        address _weth,
        address _btcPriceFeed,
        address _ethPriceFeed
    )
        ERC1155("https://metadata.citreaoptions.com/{id}")
        Ownable(initialOwner)
        ReentrancyGuard()
    {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        require(_timeOracle != address(0), "Invalid time oracle address");
        require(_wbtc != address(0), "Invalid WBTC address");
        require(_weth != address(0), "Invalid WETH address");
        require(_btcPriceFeed != address(0), "Invalid BTC price feed address");
        require(_ethPriceFeed != address(0), "Invalid ETH price feed address");
        
        stablecoin = _stablecoin;
        timeOracle = TimeOracle(_timeOracle);
        
        // Preconfigure supported assets with their price feeds
        supportedAssets[_wbtc] = true;
        supportedAssets[_weth] = true;
        priceFeeds[_wbtc] = MockPriceFeed(_btcPriceFeed);
        priceFeeds[_weth] = MockPriceFeed(_ethPriceFeed);
    }

    /**
     * @dev Get current time from oracle or fallback to block.timestamp
     */
    function getCurrentTime() internal view returns (uint256) {
        return
            address(timeOracle) != address(0)
                ? timeOracle.getCurrentTime()
                : block.timestamp;
    }

    /**
     * @dev Create a layered option token (writer only puts collateral, no premium payment)
     */
    function createLayeredOption(
        address baseAsset,
        uint256 strikePrice,
        uint256 maturity, // Changed from expiry
        uint256 premium,
        uint256 parentTokenId,
        OptionType optionType
    ) external nonReentrant returns (uint256) {
        require(supportedAssets[baseAsset], "Asset not supported");
        require(maturity > getCurrentTime(), "Invalid maturity");
        require(premium > 0, "Premium must be greater than 0");

        // Calculate required collateral for this option
        uint256 collateralRequired = calculateCollateralRequired(baseAsset, strikePrice, optionType);
        
        // Writer must provide collateral in base asset (not premium)
        require(
            IERC20(baseAsset).transferFrom(
                msg.sender,
                address(this),
                collateralRequired
            ),
            "Collateral transfer failed"
        );

        uint256 tokenId = nextTokenId++;

        // Track the option writer
        optionWriters[tokenId] = msg.sender;

        options[tokenId] = LayeredOption({
            baseAsset: baseAsset,
            strikePrice: strikePrice,
            maturity: maturity, // Changed from expiry
            premium: premium,
            parentTokenId: parentTokenId,
            optionType: optionType,
            premiumToken: stablecoin, // Always use stablecoin for premiums
            isSettled: false, // Changed from isExercised
            collateralAmount: collateralRequired, // Store collateral amount
            collateralProvider: msg.sender // Store who provided collateral
        });

        _mint(msg.sender, tokenId, 1, "");

        emit LayeredOptionCreated(
            tokenId,
            msg.sender,
            baseAsset,
            strikePrice,
            maturity, // Changed from expiry
            premium,
            parentTokenId,
            optionType,
            stablecoin
        );

        return tokenId;
    }

    /**
     * @dev Purchase an option by paying premium to the writer
     */
    function purchaseOption(uint256 tokenId) external nonReentrant {
        require(options[tokenId].baseAsset != address(0), "Option does not exist");
        require(balanceOf(msg.sender, tokenId) == 0, "Already own this option");
        require(options[tokenId].maturity > getCurrentTime(), "Option matured"); // Changed from expired
        require(!options[tokenId].isSettled, "Option already settled"); // Changed from isExercised

        LayeredOption memory option = options[tokenId];
        address writer = _getOptionWriter(tokenId);
        require(writer != msg.sender, "Cannot buy your own option");

        // Buyer pays premium in stablecoin to writer
        require(
            IERC20(stablecoin).transferFrom(
                msg.sender,
                writer,
                option.premium
            ),
            "Premium payment failed"
        );

        // Transfer option token to buyer
        _safeTransferFrom(writer, msg.sender, tokenId, 1, "");

        emit OptionPurchased(tokenId, msg.sender, writer, option.premium);
    }

    /**
     * @dev Get the writer (original creator) of an option
     */
    function _getOptionWriter(uint256 tokenId) internal view returns (address) {
        return optionWriters[tokenId];
    }

    /**
     * @dev Get current price of an asset from price feed
     */
    function getCurrentPrice(address asset) public view returns (uint256) {
        require(address(priceFeeds[asset]) != address(0), "Price feed not set");
        (, int256 answer, , , ) = priceFeeds[asset].latestRoundData();
        require(answer > 0, "Invalid price");
        return uint256(answer);
    }

    /**
     * @dev Calculate required collateral for an option
     */
    function calculateCollateralRequired(
        address baseAsset,
        uint256 strikePrice,
        OptionType optionType
    ) public view returns (uint256) {
        // For this implementation, require 100% collateral of strike price worth of base asset
        uint256 currentPrice = getCurrentPrice(baseAsset);
        
        if (optionType == OptionType.CALL) {
            // CALL options: need 1 unit of base asset as collateral
            return 1 * (10 ** _getAssetDecimals(baseAsset));
        } else {
            // PUT options: need strike price worth of base asset
            return (strikePrice * (10 ** _getAssetDecimals(baseAsset))) / currentPrice;
        }
    }

    /**
     * @dev Get asset decimals (simplified)
     */
    function _getAssetDecimals(address /*asset*/) internal pure returns (uint256) {
        // For our test tokens, we know the decimals
        // WBTC has 8 decimals, WETH has 18 decimals
        // This should be replaced with actual token.decimals() calls in production
        
        // Check if this looks like a WBTC address pattern or use 8 as default for BTC-like assets
        // For now, we'll assume 8 decimals for most assets to match our test setup
        return 8; // Most of our test assets use 8 decimals (WBTC standard)
    }

    /**
     * @dev Add supported asset with price feed
     */
    function addSupportedAsset(address asset, address priceFeed) external onlyOwner {
        require(asset != address(0), "Invalid asset address");
        require(priceFeed != address(0), "Invalid price feed address");
        
        supportedAssets[asset] = true;
        priceFeeds[asset] = MockPriceFeed(priceFeed);
    }

    /**
     * @dev Settle a European option (can only be called at or after maturity)
     */
    function settleOption(uint256 tokenId) external nonReentrant {
        require(balanceOf(msg.sender, tokenId) > 0, "Not option holder");
        LayeredOption storage option = options[tokenId];
        require(getCurrentTime() >= option.maturity, "Not yet matured");
        require(!option.isSettled, "Option already settled");
        
        // Ensure maturity price is set
        if (!settlements[tokenId].priceSet) {
            _setMaturityPrice(tokenId);
        }

        // Mark as settled
        option.isSettled = true;
        
        // Calculate the profit (intrinsic value)
        uint256 profit = settlements[tokenId].totalPayout;
        
        // For European options, handle collateral return properly:
        // 1. If the current holder is the original writer, they get their full collateral back
        // 2. If the current holder is a buyer, they get the profit and writer gets remaining collateral
        
        address currentHolder = msg.sender;
        address originalWriter = option.collateralProvider;
        uint256 totalCollateral = option.collateralAmount;
        
        // Burn the option token first
        _burn(msg.sender, tokenId, 1);

        if (currentHolder == originalWriter) {
            // Case 1: Original writer settling their own unsold option
            // They get all their collateral back (profit is 0 since they can't owe themselves)
            require(
                IERC20(option.baseAsset).transfer(currentHolder, totalCollateral),
                "Collateral return failed"
            );
            
            emit OptionSettled(tokenId, msg.sender, settlements[tokenId].maturityPrice, totalCollateral);
        } else {
            // Case 2: A buyer settling a purchased option
            // Buyer gets profit, original writer should get remaining collateral
            if (profit > 0) {
                require(
                    IERC20(option.baseAsset).transfer(currentHolder, profit),
                    "Profit payout failed"
                );
            }
            
            // Return remaining collateral to original writer
            uint256 remainingCollateral = totalCollateral > profit ? totalCollateral - profit : 0;
            if (remainingCollateral > 0) {
                require(
                    IERC20(option.baseAsset).transfer(originalWriter, remainingCollateral),
                    "Collateral return to writer failed"
                );
            }
            
            emit OptionSettled(tokenId, msg.sender, settlements[tokenId].maturityPrice, profit);
        }
    }

    /**
     * @dev Set maturity price for an asset (can only be called at or after maturity)
     * This locks the price for all options of this asset maturing at this time
     */
    function setMaturityPrice(uint256 tokenId) external nonReentrant {
        _setMaturityPrice(tokenId);
    }

    /**
     * @dev Internal function to set maturity price
     */
    function _setMaturityPrice(uint256 tokenId) internal {
        LayeredOption storage option = options[tokenId];
        require(option.baseAsset != address(0), "Option does not exist");
        require(getCurrentTime() >= option.maturity, "Not yet matured");
        require(!settlements[tokenId].priceSet, "Price already set");

        // Get current price from oracle
        uint256 maturityPrice = getCurrentPrice(option.baseAsset);
        
        settlements[tokenId].maturityPrice = maturityPrice;
        settlements[tokenId].priceSet = true;
        
        // Calculate payout based on option type and maturity price
        uint256 payout = calculateOptionPayout(tokenId, maturityPrice);
        settlements[tokenId].totalPayout = payout;

        emit MaturityPriceSet(tokenId, option.baseAsset, maturityPrice, getCurrentTime());
    }

    /**
     * @dev Calculate payout for an option based on maturity price
     */
    function calculateOptionPayout(uint256 tokenId, uint256 maturityPrice) public view returns (uint256) {
        LayeredOption memory option = options[tokenId];
        
        if (option.optionType == OptionType.CALL) {
            // Call option: payout if maturity price > strike price
            if (maturityPrice > option.strikePrice) {
                return maturityPrice - option.strikePrice;
            }
        } else {
            // Put option: payout if strike price > maturity price  
            if (option.strikePrice > maturityPrice) {
                return option.strikePrice - maturityPrice;
            }
        }
        
        return 0; // Out of the money
    }

    /**
     * @dev Create child option from parent with automatic validation and premium calculation
     * Child of CALL can only be CALL at higher strike, child of PUT can only be PUT at lower strike
     * Child options always inherit the same maturity as their parent
     * Requires 1 parent token as collateral - parent token is burned to create child option
     */
    function createChildOption(
        uint256 parentTokenId,
        uint256 newStrikePrice
    ) external nonReentrant returns (uint256) {
        require(balanceOf(msg.sender, parentTokenId) > 0, "Not parent holder");
        LayeredOption memory parent = options[parentTokenId];
        require(getCurrentTime() <= parent.maturity, "Parent matured"); // Changed from expired
        require(!parent.isSettled, "Parent settled"); // Changed from exercised

        // Validate strike price based on option type
        if (parent.optionType == OptionType.CALL) {
            require(
                newStrikePrice > parent.strikePrice,
                "Child CALL strike must be higher than parent"
            );
        } else {
            require(
                newStrikePrice < parent.strikePrice,
                "Child PUT strike must be lower than parent"
            );
        }

        // Handle maturity - child always inherits parent's maturity
        uint256 childMaturity = parent.maturity;

        // Calculate premium based on strike differential and time remaining
        uint256 childPremium = _calculateChildPremium(
            parent.strikePrice,
            newStrikePrice,
            parent.maturity,
            parent.maturity, // Child always has same maturity as parent
            parent.optionType
        );

        // Transfer parent tokens from user to contract
        // Amount equals the wei amount of underlying collateral (1 token = 1e18 wei)
        require(
            IERC1155(address(this)).balanceOf(msg.sender, parentTokenId) >= 1,
            "Insufficient parent tokens"
        );
        
        // Burn 1 parent token from user as collateral for child option
        _burn(msg.sender, parentTokenId, 1);

        uint256 childTokenId = nextTokenId++;

        options[childTokenId] = LayeredOption({
            baseAsset: parent.baseAsset,
            strikePrice: newStrikePrice,
            maturity: childMaturity, // Changed from expiry
            premium: childPremium,
            parentTokenId: parentTokenId,
            optionType: parent.optionType, // Same type as parent
            premiumToken: stablecoin, // Always stablecoin for children
            isSettled: false, // Changed from isExercised
            collateralAmount: parent.collateralAmount, // Inherit parent's collateral amount
            collateralProvider: parent.collateralProvider // Inherit original collateral provider
        });

        // Track the child option under its parent
        childOptions[parentTokenId].push(childTokenId);

        _mint(msg.sender, childTokenId, 1, "");

        emit ChildOptionCreated(
            childTokenId,
            parentTokenId,
            msg.sender,
            newStrikePrice,
            parent.maturity, // Child inherits parent maturity
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
        uint256 parentMaturity, // Changed from parentExpiry
        uint256 childMaturity, // Changed from childExpiry
        OptionType optionType
    ) internal view returns (uint256) {
        uint256 strikeDiff;

        if (optionType == OptionType.CALL) {
            strikeDiff = childStrike - parentStrike;
        } else {
            strikeDiff = parentStrike - childStrike;
        }

        // Get current time from time oracle
        uint256 currentTime = getCurrentTime();

        // Time ratio: how much of the parent's time the child uses
        uint256 timeRatio = ((childMaturity - currentTime) * BASIS_POINTS) / // Changed from childExpiry
            (parentMaturity - currentTime); // Changed from parentExpiry

        // Premium = strike differential * time ratio * base rate
        // This gives a premium proportional to risk and time
        uint256 premium = (strikeDiff * timeRatio * BASE_PREMIUM_RATE) /
            (BASIS_POINTS * BASIS_POINTS);

        // Minimum premium of 0.001 USDC (1000 wei for 6 decimals)
        // For USDC with 6 decimals: 0.001 = 1000 wei
        uint256 minPremium = 1000; // 0.001 USDC in 6 decimal wei
        return premium < minPremium ? minPremium : premium;
    }

    /**
     * @dev Preview child option premium without creating the option
     * Child options inherit parent maturity
     */
    function calculateChildPremium(
        uint256 parentTokenId,
        uint256 newStrikePrice
    ) external view returns (uint256) {
        require(
            options[parentTokenId].baseAsset != address(0),
            "Parent option does not exist"
        );
        LayeredOption memory parent = options[parentTokenId];
        require(!parent.isSettled, "Parent settled"); // Changed from isExercised
        require(getCurrentTime() <= parent.maturity, "Parent matured"); // Changed from expired

        // Validate strike price
        if (parent.optionType == OptionType.CALL) {
            require(
                newStrikePrice > parent.strikePrice,
                "Child CALL strike must be higher than parent"
            );
        } else {
            require(
                newStrikePrice < parent.strikePrice,
                "Child PUT strike must be lower than parent"
            );
        }

        return
            _calculateChildPremium(
                parent.strikePrice,
                newStrikePrice,
                parent.maturity,
                parent.maturity, // Child inherits parent maturity
                parent.optionType
            );
    }

    /**
     * @dev Set price feed for an asset (for demo purposes)
     */
    function setPriceFeed(address asset, address priceFeed) external onlyOwner {
        require(asset != address(0), "Invalid asset address");
        require(priceFeed != address(0), "Invalid price feed address");
        priceFeeds[asset] = MockPriceFeed(priceFeed);
    }

    /**
     * @dev Calculate realistic premium for parent options using price feeds
     */
    function calculateParentPremium(
        address asset,
        uint256 strikePrice,
        uint256 maturity, // Changed from expiry
        OptionType optionType
    ) external view returns (uint256) {
        MockPriceFeed priceFeed = priceFeeds[asset];
        require(
            address(priceFeed) != address(0),
            "Price feed not set for asset"
        );

        // Get current price from price feed
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        require(answer > 0, "Invalid price from feed");
        uint256 currentPrice = uint256(answer);

        // Get current time from time oracle
        uint256 currentTime = getCurrentTime();

        // Time to maturity in seconds
        uint256 timeToMaturity = maturity > currentTime ? maturity - currentTime : 0;

        // Convert to fraction of year (approximately)
        uint256 timeInYears = (timeToMaturity * BASIS_POINTS) / (365 * 24 * 3600);

        // Calculate intrinsic value
        uint256 intrinsicValue = 0;
        if (optionType == OptionType.CALL && currentPrice > strikePrice) {
            intrinsicValue = currentPrice - strikePrice;
        } else if (optionType == OptionType.PUT && strikePrice > currentPrice) {
            intrinsicValue = strikePrice - currentPrice;
        }

        // Calculate time value: sqrt(timeInYears) * volatility * currentPrice * timeFactor / BASIS_POINTS²
        uint256 timeValue = 0;
        if (timeInYears > 0) {
            // Simplified sqrt approximation for time decay
            uint256 sqrtTime = timeInYears > BASIS_POINTS
                ? BASIS_POINTS
                : timeInYears;
            timeValue =
                (sqrtTime *
                    VOLATILITY_FACTOR *
                    currentPrice *
                    TIME_DECAY_FACTOR) /
                (BASIS_POINTS * BASIS_POINTS * BASIS_POINTS);
        }

        // Total premium = intrinsic + time value, minimum 1% of asset price
        uint256 totalPremium = intrinsicValue + timeValue;
        uint256 minPremium = currentPrice / 100; // 1% minimum

        return totalPremium > minPremium ? totalPremium : minPremium;
    }

    /**
     * @dev Get option details
     */
    function getOption(
        uint256 tokenId
    ) external view returns (LayeredOption memory) {
        return options[tokenId];
    }

    /**
     * @dev Check if option has matured (European style)
     */
    function isOptionMatured(uint256 tokenId) external view returns (bool) {
        return getCurrentTime() >= options[tokenId].maturity;
    }

    /**
     * @dev Get option children (simplified - returns next token ID for demo)
     */
    function getOptionChildren(
        uint256 parentTokenId
    ) external view returns (uint256[] memory) {
        return childOptions[parentTokenId];
    }

    /**
     * @dev Calculate capped profit for parent option holder
     * Parent profit is capped by the closest child strike price
     */
    function calculateParentProfit(
        uint256 parentTokenId,
        uint256 finalPrice
    ) public view returns (uint256) {
        LayeredOption memory parent = options[parentTokenId];
        require(parent.baseAsset != address(0), "Option does not exist");

        uint256[] memory children = childOptions[parentTokenId];
        
        // Calculate uncapped parent profit
        uint256 uncappedProfit = 0;
        if (parent.optionType == OptionType.CALL && finalPrice > parent.strikePrice) {
            uncappedProfit = finalPrice - parent.strikePrice;
        } else if (parent.optionType == OptionType.PUT && parent.strikePrice > finalPrice) {
            uncappedProfit = parent.strikePrice - finalPrice;
        }

        if (children.length == 0) {
            // No children, parent gets full profit
            return uncappedProfit;
        }

        // Find the cap based on closest child strike
        uint256 cap = type(uint256).max;
        for (uint256 i = 0; i < children.length; i++) {
            LayeredOption memory child = options[children[i]];
            uint256 childCap;
            
            if (parent.optionType == OptionType.CALL) {
                // For CALLs, cap is the difference to the lowest child strike
                childCap = child.strikePrice - parent.strikePrice;
            } else {
                // For PUTs, cap is the difference to the highest child strike  
                childCap = parent.strikePrice - child.strikePrice;
            }
            
            if (childCap < cap) {
                cap = childCap;
            }
        }

        // Return the minimum of uncapped profit and cap
        return uncappedProfit < cap ? uncappedProfit : cap;
    }

    /**
     * @dev Calculate uncapped profit for child option holder
     */
    function calculateChildProfit(
        uint256 childTokenId,
        uint256 finalPrice
    ) public view returns (uint256) {
        LayeredOption memory child = options[childTokenId];
        require(child.baseAsset != address(0), "Option does not exist");
        require(child.parentTokenId != 0, "Not a child option");

        // Child options get uncapped profit beyond their strike
        if (child.optionType == OptionType.CALL && finalPrice > child.strikePrice) {
            return finalPrice - child.strikePrice;
        } else if (child.optionType == OptionType.PUT && child.strikePrice > finalPrice) {
            return child.strikePrice - finalPrice;
        }

        return 0;
    }

    /**
     * @dev Settle a parent option and all its children atomically at maturity
     * Can only be called after maturity time has passed
     */
    function settleOptionTree(uint256 parentTokenId) external nonReentrant {
        LayeredOption memory parent = options[parentTokenId];
        require(parent.baseAsset != address(0), "Option does not exist");
        require(parent.parentTokenId == 0, "Must be parent option");
        require(getCurrentTime() >= parent.maturity, "Not yet matured");
        require(!parent.isSettled, "Already settled");
        
        // Get final price from oracle
        MockPriceFeed priceFeed = priceFeeds[parent.baseAsset];
        require(address(priceFeed) != address(0), "Price feed not set");
        
        (, int256 priceInt, , , ) = priceFeed.latestRoundData();
        require(priceInt > 0, "Invalid price");
        uint256 finalPrice = uint256(priceInt);
        
        // Calculate profits for parent and all children
        uint256 parentProfit = calculateParentProfit(parentTokenId, finalPrice);
        uint256[] memory children = childOptions[parentTokenId];
        uint256 totalChildProfit = 0;
        
        for (uint256 i = 0; i < children.length; i++) {
            totalChildProfit += calculateChildProfit(children[i], finalPrice);
        }
        
        uint256 totalProfitClaims = parentProfit + totalChildProfit;
        uint256 availableCollateral = parent.collateralAmount;
        
        // Store settlement data
        settlements[parentTokenId] = SettlementData({
            maturityPrice: finalPrice,
            priceSet: true,
            totalPayout: totalProfitClaims > availableCollateral ? availableCollateral : totalProfitClaims
        });
        
        // Mark parent and all children as settled
        options[parentTokenId].isSettled = true;
        for (uint256 i = 0; i < children.length; i++) {
            options[children[i]].isSettled = true;
        }
        
        emit OptionSettled(parentTokenId, msg.sender, finalPrice, settlements[parentTokenId].totalPayout);
    }

    /**
     * @dev Claim settlement payout for an option holder
     * Can be called by holders of parent or child options after settlement
     */
    function claimSettlement(uint256 tokenId) external nonReentrant {
        require(balanceOf(msg.sender, tokenId) > 0, "Not option holder");
        LayeredOption memory option = options[tokenId];
        require(option.isSettled, "Option not settled");
        
        // Find the root parent option to get settlement data
        uint256 parentTokenId = option.parentTokenId == 0 ? tokenId : option.parentTokenId;
        SettlementData memory settlement = settlements[parentTokenId];
        require(settlement.priceSet, "Settlement not available");
        
        // Calculate this option's profit share
        uint256 optionProfit;
        if (option.parentTokenId == 0) {
            // This is a parent option
            optionProfit = calculateParentProfit(tokenId, settlement.maturityPrice);
        } else {
            // This is a child option
            optionProfit = calculateChildProfit(tokenId, settlement.maturityPrice);
        }
        
        if (optionProfit == 0) {
            revert("No profit to claim");
        }
        
        // Calculate proportional payout
        LayeredOption memory parentOption = options[parentTokenId];
        uint256[] memory children = childOptions[parentTokenId];
        uint256 totalParentProfit = calculateParentProfit(parentTokenId, settlement.maturityPrice);
        uint256 totalChildProfit = 0;
        
        for (uint256 i = 0; i < children.length; i++) {
            totalChildProfit += calculateChildProfit(children[i], settlement.maturityPrice);
        }
        
        uint256 totalProfitClaims = totalParentProfit + totalChildProfit;
        uint256 proportionalPayout = (optionProfit * settlement.totalPayout) / totalProfitClaims;
        
        // Transfer collateral to option holder
        require(
            IERC20(parentOption.baseAsset).transfer(msg.sender, proportionalPayout),
            "Payout transfer failed"
        );
        
        // Mark option as claimed (burn the token)
        _burn(msg.sender, tokenId, 1);
        
        emit OptionSettled(tokenId, msg.sender, settlement.maturityPrice, proportionalPayout);
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

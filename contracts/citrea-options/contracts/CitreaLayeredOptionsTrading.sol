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
        address _timeOracle
    )
        ERC1155("https://metadata.citreaoptions.com/{id}")
        Ownable(initialOwner)
        ReentrancyGuard()
    {
        require(_stablecoin != address(0), "Invalid stablecoin address");
        require(_timeOracle != address(0), "Invalid time oracle address");
        stablecoin = _stablecoin;
        timeOracle = TimeOracle(_timeOracle);
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
            isSettled: false // Changed from isExercised
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
        // Simplified - in production this should query the token contract
        return 18; // Default to 18 decimals
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
        
        uint256 payout = settlements[tokenId].totalPayout;
        
        // Burn the option token
        _burn(msg.sender, tokenId, 1);

        // Transfer payout if any
        if (payout > 0) {
            require(
                IERC20(option.baseAsset).transfer(msg.sender, payout),
                "Payout transfer failed"
            );
        }

        emit OptionSettled(tokenId, msg.sender, settlements[tokenId].maturityPrice, payout);
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
     * Premium is always paid in stablecoin
     */
    function createChildOption(
        uint256 parentTokenId,
        uint256 newStrikePrice,
        uint256 newMaturity // Changed from newExpiry
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

        // Handle maturity - default to parent maturity if 0
        uint256 childMaturity = newMaturity == 0 ? parent.maturity : newMaturity;
        require(
            childMaturity <= parent.maturity,
            "Child maturity cannot exceed parent"
        );
        require(
            childMaturity > getCurrentTime(),
            "Child maturity must be in future"
        );

        // Calculate premium based on strike differential and time remaining
        uint256 childPremium = _calculateChildPremium(
            parent.strikePrice,
            newStrikePrice,
            parent.maturity, // Changed from expiry
            childMaturity, // Changed from expiry
            parent.optionType
        );

        // Premium is always paid in stablecoin for child options
        require(
            IERC20(stablecoin).transferFrom(
                msg.sender,
                address(this),
                childPremium
            ),
            "Stablecoin premium payment failed"
        );

        uint256 childTokenId = nextTokenId++;

        options[childTokenId] = LayeredOption({
            baseAsset: parent.baseAsset,
            strikePrice: newStrikePrice,
            maturity: childMaturity, // Changed from expiry
            premium: childPremium,
            parentTokenId: parentTokenId,
            optionType: parent.optionType, // Same type as parent
            premiumToken: stablecoin, // Always stablecoin for children
            isSettled: false // Changed from isExercised
        });

        _mint(msg.sender, childTokenId, 1, "");

        emit ChildOptionCreated(
            childTokenId,
            parentTokenId,
            msg.sender,
            newStrikePrice,
            childMaturity, // Changed from expiry
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
     */
    function calculateChildPremium(
        uint256 parentTokenId,
        uint256 newStrikePrice,
        uint256 newMaturity // Changed from newExpiry
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

        uint256 childMaturity = newMaturity == 0 ? parent.maturity : newMaturity; // Changed from expiry
        require(
            childMaturity <= parent.maturity,
            "Child maturity cannot exceed parent" // Changed from expiry
        );
        require(
            childMaturity > getCurrentTime(),
            "Child maturity must be in future" // Changed from expiry
        );

        return
            _calculateChildPremium(
                parent.strikePrice,
                newStrikePrice,
                parent.maturity, // Changed from expiry
                childMaturity, // Changed from expiry
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
    ) external pure returns (uint256[] memory) {
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

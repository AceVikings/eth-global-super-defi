// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./MockPriceFeed.sol";
import "./TimeOracle.sol";

/**
 * @title CitreaOptionsTrading
 * @dev Core options trading contract for Citrea network
 * Features: Collateral management, premium calculation, American-style exercise
 */
contract CitreaOptionsTrading is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum OptionType {
        CALL,
        PUT
    }
    enum OptionStatus {
        ACTIVE,
        EXERCISED,
        EXPIRED
    }

    struct Option {
        uint256 id;
        address writer;
        address buyer;
        OptionType optionType;
        uint256 strikePrice; // Strike price in USD (8 decimals)
        uint256 premium; // Premium paid (in collateral token)
        uint256 collateralAmount; // Collateral locked by writer
        uint256 expiryTimestamp;
        OptionStatus status;
        address underlyingAsset; // Address of the underlying asset
        address collateralToken; // Token used for collateral/premium
        uint256 contractSize; // Amount of underlying asset (e.g., 1 BTC = 1e8)
    }

    struct MarketParams {
        uint256 volatility; // Implied volatility (basis points, e.g., 2000 = 20%)
        uint256 riskFreeRate; // Risk-free rate (basis points, e.g., 500 = 5%)
        uint256 minTimeToExpiry; // Minimum time to expiry (seconds)
        uint256 maxTimeToExpiry; // Maximum time to expiry (seconds)
        bool isPaused;
    }

    // State variables
    mapping(uint256 => Option) public options;
    mapping(address => uint256[]) public userOptions;
    mapping(address => uint256) public totalCollateralLocked;
    mapping(address => MarketParams) public marketParams;

    uint256 private nextOptionId = 1;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PRICE_DECIMALS = 8;

    // Oracle contracts
    mapping(address => MockPriceFeed) public priceFeeds;
    TimeOracle public timeOracle;

    // Supported assets
    mapping(address => bool) public supportedAssets;
    mapping(address => bool) public supportedCollaterals;

    // Events
    event OptionCreated(
        uint256 indexed optionId,
        address indexed writer,
        OptionType optionType,
        uint256 strikePrice,
        uint256 premium,
        uint256 expiryTimestamp
    );

    event OptionPurchased(
        uint256 indexed optionId,
        address indexed buyer,
        uint256 premium
    );

    event OptionExercised(
        uint256 indexed optionId,
        address indexed exerciser,
        uint256 payout
    );

    event OptionExpired(uint256 indexed optionId);

    event CollateralDeposited(
        address indexed user,
        address token,
        uint256 amount
    );
    event CollateralWithdrawn(
        address indexed user,
        address token,
        uint256 amount
    );

    constructor(address _owner, address _timeOracle) Ownable(_owner) {
        timeOracle = TimeOracle(_timeOracle);
    }

    modifier onlyValidAsset(address asset) {
        require(supportedAssets[asset], "Asset not supported");
        _;
    }

    modifier onlyValidCollateral(address collateral) {
        require(supportedCollaterals[collateral], "Collateral not supported");
        _;
    }

    modifier optionExists(uint256 optionId) {
        require(options[optionId].id != 0, "Option does not exist");
        _;
    }

    modifier optionActive(uint256 optionId) {
        require(
            options[optionId].status == OptionStatus.ACTIVE,
            "Option not active"
        );
        require(!isExpired(optionId), "Option expired");
        _;
    }

    /**
     * @dev Add supported asset
     */
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

    /**
     * @dev Add supported collateral token
     */
    function addSupportedCollateral(address collateral) external onlyOwner {
        supportedCollaterals[collateral] = true;
    }

    /**
     * @dev Create a new option (writer side)
     */
    function createOption(
        OptionType optionType,
        uint256 strikePrice,
        uint256 expiryTimestamp,
        address underlyingAsset,
        address collateralToken,
        uint256 contractSize
    )
        external
        nonReentrant
        onlyValidAsset(underlyingAsset)
        onlyValidCollateral(collateralToken)
        returns (uint256)
    {
        require(!marketParams[underlyingAsset].isPaused, "Market is paused");
        require(
            expiryTimestamp > timeOracle.getCurrentTime(),
            "Expiry in the past"
        );
        require(strikePrice > 0, "Invalid strike price");
        require(contractSize > 0, "Invalid contract size");

        uint256 timeToExpiry = expiryTimestamp - timeOracle.getCurrentTime();
        require(
            timeToExpiry >= marketParams[underlyingAsset].minTimeToExpiry &&
                timeToExpiry <= marketParams[underlyingAsset].maxTimeToExpiry,
            "Invalid expiry time"
        );

        // Calculate required collateral
        uint256 collateralRequired = calculateCollateralRequired(
            optionType,
            strikePrice,
            underlyingAsset,
            contractSize
        );

        // Calculate premium using Black-Scholes approximation
        uint256 premium = calculatePremium(
            optionType,
            strikePrice,
            expiryTimestamp,
            underlyingAsset,
            contractSize
        );

        // Lock collateral
        IERC20(collateralToken).safeTransferFrom(
            msg.sender,
            address(this),
            collateralRequired
        );

        // Create option
        uint256 optionId = nextOptionId++;
        options[optionId] = Option({
            id: optionId,
            writer: msg.sender,
            buyer: address(0),
            optionType: optionType,
            strikePrice: strikePrice,
            premium: premium,
            collateralAmount: collateralRequired,
            expiryTimestamp: expiryTimestamp,
            status: OptionStatus.ACTIVE,
            underlyingAsset: underlyingAsset,
            collateralToken: collateralToken,
            contractSize: contractSize
        });

        userOptions[msg.sender].push(optionId);
        totalCollateralLocked[collateralToken] += collateralRequired;

        emit OptionCreated(
            optionId,
            msg.sender,
            optionType,
            strikePrice,
            premium,
            expiryTimestamp
        );

        return optionId;
    }

    /**
     * @dev Purchase an option
     */
    function purchaseOption(
        uint256 optionId
    )
        external
        payable
        nonReentrant
        optionExists(optionId)
        optionActive(optionId)
    {
        Option storage option = options[optionId];
        require(option.buyer == address(0), "Option already purchased");
        require(msg.sender != option.writer, "Cannot buy own option");

        // Transfer premium to writer
        IERC20(option.collateralToken).safeTransferFrom(
            msg.sender,
            option.writer,
            option.premium
        );

        option.buyer = msg.sender;
        userOptions[msg.sender].push(optionId);

        emit OptionPurchased(optionId, msg.sender, option.premium);
    }

    /**
     * @dev Exercise an option (American style)
     */
    function exerciseOption(
        uint256 optionId
    ) external nonReentrant optionExists(optionId) optionActive(optionId) {
        Option storage option = options[optionId];
        require(option.buyer == msg.sender, "Not option buyer");

        uint256 currentPrice = getCurrentPrice(option.underlyingAsset);
        uint256 payout = calculateExercisePayout(option, currentPrice);

        require(payout > 0, "Option not in the money");

        option.status = OptionStatus.EXERCISED;
        totalCollateralLocked[option.collateralToken] -= option
            .collateralAmount;

        // Transfer payout to buyer
        IERC20(option.collateralToken).safeTransfer(msg.sender, payout);

        // Return remaining collateral to writer
        uint256 remainingCollateral = option.collateralAmount - payout;
        if (remainingCollateral > 0) {
            IERC20(option.collateralToken).safeTransfer(
                option.writer,
                remainingCollateral
            );
        }

        emit OptionExercised(optionId, msg.sender, payout);
    }

    /**
     * @dev Claim expired option collateral (for writers)
     */
    function claimExpiredCollateral(
        uint256 optionId
    ) external nonReentrant optionExists(optionId) {
        Option storage option = options[optionId];
        require(option.writer == msg.sender, "Not option writer");
        require(isExpired(optionId), "Option not expired");
        require(
            option.status == OptionStatus.ACTIVE,
            "Option already processed"
        );

        option.status = OptionStatus.EXPIRED;
        totalCollateralLocked[option.collateralToken] -= option
            .collateralAmount;

        IERC20(option.collateralToken).safeTransfer(
            msg.sender,
            option.collateralAmount
        );

        emit OptionExpired(optionId);
    }

    // View functions and calculations

    /**
     * @dev Calculate required collateral for option
     */
    function calculateCollateralRequired(
        OptionType optionType,
        uint256 strikePrice,
        address underlyingAsset,
        uint256 contractSize
    ) public view returns (uint256) {
        uint256 currentPrice = getCurrentPrice(underlyingAsset);

        if (optionType == OptionType.CALL) {
            // For calls: collateral = contract size * current price
            return (contractSize * currentPrice) / (10 ** PRICE_DECIMALS);
        } else {
            // For puts: collateral = contract size * strike price
            return (contractSize * strikePrice) / (10 ** PRICE_DECIMALS);
        }
    }

    /**
     * @dev Calculate option premium using simplified Black-Scholes
     */
    function calculatePremium(
        OptionType optionType,
        uint256 strikePrice,
        uint256 expiryTimestamp,
        address underlyingAsset,
        uint256 contractSize
    ) public view returns (uint256) {
        uint256 currentPrice = getCurrentPrice(underlyingAsset);
        uint256 timeToExpiry = expiryTimestamp - timeOracle.getCurrentTime();

        MarketParams memory params = marketParams[underlyingAsset];

        // Simplified premium calculation (not true Black-Scholes)
        uint256 intrinsicValue = 0;
        if (optionType == OptionType.CALL && currentPrice > strikePrice) {
            intrinsicValue = currentPrice - strikePrice;
        } else if (optionType == OptionType.PUT && strikePrice > currentPrice) {
            intrinsicValue = strikePrice - currentPrice;
        }

        // Time value approximation
        uint256 timeValue = (currentPrice * params.volatility * timeToExpiry) /
            (BASIS_POINTS * 365 days);

        uint256 totalPremium = intrinsicValue + timeValue;

        // Scale by contract size
        return (totalPremium * contractSize) / (10 ** PRICE_DECIMALS);
    }

    /**
     * @dev Calculate payout for option exercise
     */
    function calculateExercisePayout(
        Option memory option,
        uint256 currentPrice
    ) public pure returns (uint256) {
        if (option.optionType == OptionType.CALL) {
            if (currentPrice > option.strikePrice) {
                uint256 profit = currentPrice - option.strikePrice;
                return (profit * option.contractSize) / (10 ** PRICE_DECIMALS);
            }
        } else {
            if (option.strikePrice > currentPrice) {
                uint256 profit = option.strikePrice - currentPrice;
                return (profit * option.contractSize) / (10 ** PRICE_DECIMALS);
            }
        }
        return 0;
    }

    /**
     * @dev Get current price from oracle
     */
    function getCurrentPrice(address asset) public view returns (uint256) {
        MockPriceFeed priceFeed = priceFeeds[asset];
        require(address(priceFeed) != address(0), "Price feed not set");

        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        return uint256(price);
    }

    /**
     * @dev Check if option is expired
     */
    function isExpired(uint256 optionId) public view returns (bool) {
        return timeOracle.getCurrentTime() >= options[optionId].expiryTimestamp;
    }

    /**
     * @dev Get user's options
     */
    function getUserOptions(
        address user
    ) external view returns (uint256[] memory) {
        return userOptions[user];
    }

    /**
     * @dev Get option details
     */
    function getOption(uint256 optionId) external view returns (Option memory) {
        return options[optionId];
    }

    /**
     * @dev Update market parameters (only owner)
     */
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
}

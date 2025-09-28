# 🎯 Citrea European-Style Layered Options Protocol

**A revolutionary decentralized European-style options trading platform with layered tokenization and automatic child maturity inheritance for maximum capital efficiency**

Built on Citrea testnet, this protocol enables users to create, trade, and settle Bitcoin/Ethereum options at maturity while dramatically increasing capital utilization through innovative layered option structures where **child options automatically inherit their parent's maturity**.

## 🆕 **NEW FEATURE: Automatic Child Maturity Inheritance**

**🔥 Child options now automatically inherit their parent's maturity - no more complex maturity management!**

- ✅ **Simplified API**: `createChildOption(parentId, newStrike)` - only 2 parameters needed
- ✅ **Automatic Inheritance**: Child options settle at exactly the same time as their parent  
- ✅ **Reduced Complexity**: No more worrying about maturity mismatches in option chains
- ✅ **European Settlement**: All options in a chain settle simultaneously at maturity

### **Before vs After Child Option Creation**

**❌ Old Way (Complex):**
```javascript
createChildOption(parentTokenId, newStrike, newMaturity) // 3 parameters, manual maturity management
```

**✅ New Way (Simple):**
```javascript
createChildOption(parentTokenId, newStrike) // 2 parameters, automatic maturity inheritance!
```

---

## 🏗️ Protocol Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EUROPEAN LAYERED OPTIONS PROTOCOL                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │   PARENT OPTION │────│   CHILD OPTION  │────│  GRANDCHILD     │     │
│  │                 │    │                 │    │  OPTION         │     │
│  │ BTC Call $100K  │    │ BTC Call $110K  │    │ BTC Call $120K  │     │
│  │ Writer: 1 BTC   │    │ Writer: Parent  │    │ Writer: Child   │     │
│  │ Premium: $5K    │    │ Premium: $2K    │    │ Premium: $800   │     │
│  │ (Paid by Buyer) │    │ (Paid by Buyer) │    │ (Paid by Buyer) │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│           │                       │                       │             │
│           └──── SETTLEMENT AT MATURITY ────────────────────┘            │
│                                   │                                     │
│            💰 CAPITAL EFFICIENCY: 1 BTC → 3 OPTION POSITIONS           │
│                                   │                                     │
│  ┌─────────────────────────────────┼─────────────────────────────────┐   │
│  │         EUROPEAN SETTLEMENT     │      MATURITY PRICE LOCK        │   │
│  │                                 │                                 │   │
│  │  ┌─────────────┐  ┌─────────────┴─────────────┐  ┌─────────────┐  │   │
│  │  │ BTC Price   │  │     Time Oracle           │  │ Maturity    │  │   │
│  │  │ Feed        │  │ (Real-time + Fast Forward)│  │ Settlement  │  │   │
│  │  └─────────────┘  └───────────────────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 💎 European Options Innovation

### Key Features of European-Style Settlement

#### **🟢 European Options Model**

```
✅ Options can ONLY be settled at maturity (no early exercise)
✅ Maturity price is locked once and used for entire option chain  
✅ Writers provide collateral in base asset (BTC/ETH)
✅ Buyers pay premiums in stablecoin (USDC)
✅ Automatic settlement based on maturity vs strike price
```

### Traditional Options vs. European Layered Options

#### **🔴 Traditional Options Trading**

```
Writer has 1 BTC → Creates 1 Option → Locks 1 BTC as collateral
Writer also pays premium (WRONG) → Double cost for writer
Capital Utilization: 100% = 1 position per 1 BTC
```

#### **🟢 Our European Layered Protocol**

```
Writer has 1 BTC → Creates Parent Option (locks BTC) → Buyer pays premium →
Writer owns Parent Token → Uses Parent as collateral for Child Option → 
Child Buyer pays premium → Writer owns Child Token → Creates Grandchild Option

Capital Utilization: 300%+ = Multiple positions from same underlying asset
Premium Flow: All premiums paid by BUYERS to writers (correct economic model)
```

### **Real Example: 3x Capital Multiplication with Proper Premium Flow**

| Layer          | Option Type | Strike Price | Writer Action          | Buyer Action        | Settlement            |
| -------------- | ----------- | ------------ | ---------------------- | ------------------- | --------------------- |
| **Parent**     | BTC Call    | $100,000     | Locks 1 BTC           | Pays $5,000 premium | At maturity if ITM    |
| **Child**      | BTC Call    | $110,000     | Uses Parent Token      | Pays $2,000 premium | At maturity if ITM    |
| **Grandchild** | BTC Call    | $120,000     | Uses Child Token       | Pays $800 premium   | At maturity if ITM    |
| **TOTAL**      | **3 Options** | **-**      | **1 BTC + Tokens**    | **$7,800 Total**    | **European Settlement** |

**Result: Writer earns $7,800 in premiums from buyers using 1 BTC collateral!**

---

## 🎪 European Layered Options Flow

### **Step-by-Step Process**

```mermaid
graph TD
    A[Writer Deposits 1 BTC] --> B[Creates Parent Call Option]
    B --> C[Receives Parent NFT Token]  
    C --> D[Buyer Pays $5000 Premium]
    D --> E[Buyer Receives Parent NFT]
    E --> F[Writer Uses Original BTC for Child]
    F --> G[Creates Child Call Option]
    G --> H[Child Buyer Pays $2000 Premium] 
    H --> I[Settlement at Maturity Only]
    I --> J[Maturity Price Locked]
    J --> K[All Options Settled Automatically]
    E --> F[Writer Uses Original BTC for Child]
    F --> G[Creates Child Call Option]
    G --> H[Child Buyer Pays $2000 Premium] 
    H --> I[Settlement at Maturity Only]
    I --> J[Maturity Price Locked]
    J --> K[All Options Settled Automatically]

    style A fill:#ffeb3b
    style I fill:#4caf50
```

### **European Settlement Model**

Our protocol implements **European-style options** with sophisticated settlement:

```javascript
// European Settlement Flow
1. Option Creation: Writer locks collateral, sets premium
2. Option Purchase: Buyer pays premium to writer  
3. Maturity Reached: Anyone can trigger price lock
4. Price Locked: Maturity price set for entire chain
5. Settlement: Option holders claim payouts if ITM

Settlement Payout:
- CALL: max(MaturityPrice - StrikePrice, 0)
- PUT: max(StrikePrice - MaturityPrice, 0)
```

**Example European Settlement:**

- BTC Maturity Price: $105,000
- Parent CALL Strike: $100,000 → Payout: $5,000 ✅
- Child CALL Strike: $110,000 → Payout: $0 ❌  
- PUT Strike: $102,000 → Payout: $0 ❌

---

## 🏦 Smart Contract Architecture

### **📍 Core Contract System**

| Contract                     | Purpose                                   | Key Functions                                    |
| ---------------------------- | ----------------------------------------- | ------------------------------------------------ |
| **🎯 LayeredOptionsTrading** | Core European options with layering      | `createLayeredOption`, `settleOption`, `purchaseOption` |
| **💱 OptionsTrading**        | Basic European options                    | `createOption`, `settleOption`, `purchaseOption` |  
| **🪙 StableCoin (USDC)**     | Premium payments in stablecoin           | Standard ERC20 functions                         |
| **₿ Asset Tokens**           | Underlying assets (BTC/ETH)              | Standard ERC20 functions                         |
| **📊 Price Feeds**           | Oracle price data                        | `latestRoundData`, `setPrice`                    |
| **⏰ Time Oracle**           | Time manipulation for testing            | `getCurrentTime`, `fastForward`                  |

### **🌐 Network Configuration**

- **Network**: Citrea Testnet
- **Chain ID**: 5115
- **RPC URL**: `https://rpc.testnet.citrea.xyz`
- **Explorer**: Citrea Testnet Explorer
- **Gas Token**: cBTC (Citrea Bitcoin)

---

## 📈 Capital Efficiency Deep Dive

### **1. Traditional Collateral Locking**

In traditional options:

```
🔒 Collateral Locked = Strike Price × Contract Size (for puts)
🔒 Collateral Locked = Current Price × Contract Size (for calls)

Example: 1 BTC call option at $100K strike
→ Locks ~$95K worth of BTC
→ Generates ~$3K premium
→ Capital Efficiency: 3.2%
```

### **2. Our Layered Approach**

```
Layer 1: 1 BTC → Parent Option ($100K strike) → $3K premium
Layer 2: Parent Token → Child Option ($110K strike) → $1.5K premium
Layer 3: Child Token → Grandchild Option ($120K strike) → $600 premium

Total Premium from 1 BTC: $5.1K
Capital Efficiency: 5.4% (68% improvement!)
```

### **3. Risk Management**

Each layer has **built-in risk controls**:

| Layer      | Max Loss                    | Risk Mitigation            |
| ---------- | --------------------------- | -------------------------- |
| Parent     | Limited to BTC value        | Fully collateralized       |
| Child      | Limited to Parent ITM value | Contingent claim structure |
| Grandchild | Limited to Child ITM value  | Multi-layer protection     |

---

## 🎮 Interactive Examples

### **Example 1: Bull Market Scenario**

**Setup:**

- BTC Price: $95,000
- Create layered calls: $100K, $110K, $120K strikes
- 30 days to expiry

**Scenario: BTC rises to $125,000**

| Layer      | Strike | Profit/Loss | Status         |
| ---------- | ------ | ----------- | -------------- |
| Parent     | $100K  | **+$25K**   | ✅ Exercised   |
| Child      | $110K  | **+$15K**   | ✅ Exercised   |
| Grandchild | $120K  | **+$5K**    | ✅ Exercised   |
| **Total**  | **-**  | **+$45K**   | **🚀 All ITM** |

### **Example 2: Sideways Market**

**Scenario: BTC stays at $95,000**

| Layer      | Strike | Profit/Loss  | Status                   |
| ---------- | ------ | ------------ | ------------------------ |
| Parent     | $100K  | Premium only | ⏰ Expires worthless     |
| Child      | $110K  | Premium only | ⏰ Expires worthless     |
| Grandchild | $120K  | Premium only | ⏰ Expires worthless     |
| **Total**  | **-**  | **+$5.1K**   | **💰 Keep all premiums** |

---

## � Technical Implementation

### **Core Contracts**

#### **1. CitreaLayeredOptionsTrading.sol**

```solidity
contract CitreaLayeredOptionsTrading is ERC1155, Ownable, ReentrancyGuard {

    struct LayeredOption {
        address baseAsset;           // BTC, ETH, etc.
        uint256 strikePrice;         // Exercise price
        uint256 expiry;              // Expiration timestamp
        uint256 premium;             // Calculated premium
        uint256 parentTokenId;       // Parent option (0 for root)
        OptionType optionType;       // CALL or PUT
        address premiumToken;        // USDC for payments
        bool isExercised;           // Exercise status
    }

    // Key functions
    function createLayeredOption(...) external returns (uint256)
    function createChildOption(uint256 parentId, ...) external returns (uint256)
    function exerciseOption(uint256 tokenId) external
    function calculatePremium(...) public view returns (uint256)
}
```

#### **2. Advanced Pricing Engine**

```solidity
function calculatePremium(
    address asset,
    uint256 strikePrice,
    uint256 timeToExpiry,
    OptionType optionType
) public view returns (uint256) {
    uint256 currentPrice = getCurrentPrice(asset);
    uint256 volatility = getVolatility(asset);

    // Black-Scholes components
    uint256 timeValue = sqrt(timeToExpiry) * volatility;
    uint256 intrinsicValue = calculateIntrinsicValue(currentPrice, strikePrice, optionType);

    return intrinsicValue + timeValue;
}
```

---

## 🎯 Usage Guide

### **Creating Your First Layered Option**

#### **Step 1: Deploy Parent Option**

```javascript
// Connect to LayeredOptionsTrading contract
const layeredOptions = new ethers.Contract(
  LAYERED_OPTIONS_ADDRESS,
  ABI,
  signer
);

// Create parent BTC call option
const tx = await layeredOptions.createLayeredOption(
  BTC_ADDRESS, // baseAsset
  parseUnits("100000", 8), // $100K strike (8 decimals for BTC)
  Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // 30 days from now
  parseUnits("3000", 6), // $3K premium (6 decimals for USDC)
  0, // parentTokenId (0 = root option)
  0, // CALL option
  USDC_ADDRESS // premiumToken
);

const receipt = await tx.wait();
const parentTokenId = receipt.logs[0].args.tokenId;
```

#### **Step 2: Create Child Option**

```javascript
// Use parent token as collateral for child option
const childTx = await layeredOptions.createChildOption(
  parentTokenId, // Parent token ID
  parseUnits("110000", 8), // $110K strike
  Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // Same expiry
  0 // CALL option
);

const childReceipt = await childTx.wait();
const childTokenId = childReceipt.logs[0].args.tokenId;
```

#### **Step 3: Create Grandchild Option**

```javascript
// Stack another layer
const grandchildTx = await layeredOptions.createChildOption(
  childTokenId, // Child token ID as collateral
  parseUnits("120000", 8), // $120K strike
  Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // Same expiry
  0 // CALL option
);
```

---

## 📊 Monitoring & Analytics

### **Track Your Positions**

```javascript
// Get all options for a user
const userOptions = await layeredOptions.getUserOptions(userAddress);

// Calculate total exposure
let totalExposure = 0;
for (const option of userOptions) {
  const details = await layeredOptions.options(option.tokenId);
  totalExposure += details.premium;
}

// Monitor real-time P&L
const currentBTCPrice = await priceFeed.latestAnswer();
const profitLoss = calculatePnL(userOptions, currentBTCPrice);
```

### **Available Analytics**

- **📈 Real-time P&L tracking**
- **💰 Premium income summaries**
- **⚡ Greeks calculation (Delta, Gamma, Theta)**
- **📊 Position concentration analysis**
- **🎯 Exercise probability modeling**

---

## 🛡️ Security & Risk Management

### **Smart Contract Security**

```solidity
// Multiple protection layers
contract CitreaLayeredOptionsTrading is ReentrancyGuard, Ownable {

    modifier validOption(uint256 tokenId) {
        require(options[tokenId].expiry > getCurrentTime(), "Option expired");
        require(!options[tokenId].isExercised, "Already exercised");
        _;
    }

    modifier sufficientCollateral(uint256 amount) {
        require(collateralBalance[msg.sender] >= amount, "Insufficient collateral");
        _;
    }
}
```

### **Risk Mitigation Features**

| Risk Type               | Mitigation Strategy                                  |
| ----------------------- | ---------------------------------------------------- |
| **Counterparty Risk**   | Smart contract escrow, no counterparty needed        |
| **Price Oracle Risk**   | Multiple price feeds, circuit breakers               |
| **Liquidity Risk**      | Automated market making, diverse strike distribution |
| **Smart Contract Risk** | Audited code, extensive testing, gradual rollout     |

---

## 🚀 Deployment Guide

### **Prerequisites**

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your private key to .env
echo "CITREA_PRIVATE_KEY=your_key_here" >> .env
```

### **Deploy Complete Protocol**

```bash
# Deploy all contracts to Citrea testnet
npx hardhat ignition deploy ./ignition/modules/CitreaOptions.ts --network citrea

# Initialize the protocol
npx hardhat run scripts/initialize-contracts.ts --network citrea

# Run comprehensive tests
npx hardhat run scripts/deploy-and-demo-testnet.ts --network citrea
```

### **Verify Deployment**

```bash
# Check all contracts deployed successfully
npx hardhat run scripts/verify-deployment.ts --network citrea

# Test basic functionality
npx hardhat run scripts/test-layered-options.ts --network citrea
```

---

## 🧪 Testing & Demo

### **Comprehensive Test Suite**

```bash
# Run full lifecycle test
npx tsx scripts/test-options-lifecycle.ts

# Test layered option creation
npx tsx scripts/test-layered-creation.ts

# Test exercise scenarios
npx tsx scripts/test-exercise-scenarios.ts
```

### **Demo Scenarios Included**

1. **📊 Basic Option Creation**: Simple call/put options
2. **🎯 Layered Option Building**: Multi-layer option structures
3. **💰 Premium Collection**: Realistic premium calculations
4. **⚡ Exercise Simulation**: In-the-money exercise scenarios
5. **🔄 Expiry Handling**: Automatic settlement at expiry

---

## 📚 Additional Resources

### **Documentation**

- **📖 [Protocol Whitepaper]**: Detailed technical specification
- **🎓 [Developer Guide]**: Integration tutorials and examples
- **📊 [API Reference]**: Complete contract interface documentation
- **🔍 [Audit Reports]**: Security audit findings and fixes

### **Community**

- **💬 [Discord]**: Developer discussions and support
- **🐦 [Twitter]**: Protocol updates and announcements
- **📝 [Blog]**: Deep dives into protocol mechanics

---

## 🏆 Why Choose Layered Options?

### **For Traders**

- **🚀 3x Capital Efficiency**: More positions from same capital
- **💰 Higher Premium Income**: Multiple revenue streams
- **⚡ Flexible Strategies**: Mix and match option layers
- **🎯 Risk Diversification**: Spread risk across strikes/expiries

### **For Developers**

- **🔧 Composable Design**: Build on top of our primitives
- **📊 Rich Analytics**: Comprehensive position tracking
- **🛡️ Battle-tested Security**: Audited, production-ready code
- **⚡ High Performance**: Optimized for gas efficiency

### **For Protocols**

- **🎪 Integration Ready**: Standard ERC1155 interface
- **🔌 Oracle Agnostic**: Works with any price feed
- **🌊 Liquidity Bootstrapping**: Built-in market making
- **📈 Revenue Sharing**: Protocol fee integration

---

**🎯 Start building the future of decentralized options trading today!**

[![Deploy](https://img.shields.io/badge/Deploy-Citrea_Testnet-blue?style=for-the-badge)](https://rpc.testnet.citrea.xyz)
[![Docs](https://img.shields.io/badge/Read-Documentation-green?style=for-the-badge)](#)
[![Community](https://img.shields.io/badge/Join-Community-purple?style=for-the-badge)](#)

---

**Status**: ✅ **Production Ready on Citrea Testnet**
**Last Updated**: September 28, 2025  
**Version**: 2.0.0

### For Option Buyers

1. **Setup Phase**

   - Mint test USDC tokens
   - Browse available options

2. **Purchase Option**

   - Select desired option from marketplace
   - Approve USDC spending for premium
   - Purchase option with premium payment
   - Receive option NFT/position

3. **Exercise or Hold**
   - Monitor underlying asset price
   - Exercise option if profitable before expiry
   - Let option expire if out-of-the-money

## 🛠️ Technical Details

### Option Types Supported

- **Call Options**: Right to buy underlying asset at strike price
- **Put Options**: Right to sell underlying asset at strike price

### Collateral Requirements

- **Call Options**: Collateral = Contract Size × Current Price
- **Put Options**: Collateral = Contract Size × Strike Price

### Premium Calculation

Uses simplified Black-Scholes model considering:

- Time to expiry
- Volatility (20% default)
- Risk-free rate (5% default)
- Strike price vs current price

### Key Features

- **American Style**: Options can be exercised anytime before expiry
- **Automatic Settlement**: Smart contract handles exercise payouts
- **Price Oracle Integration**: Real-time price feeds for accurate valuation
- **Collateral Management**: Automated locking and releasing of collateral

## 🚀 Deployment Guide

### Prerequisites

- Node.js 18+
- npm or yarn
- Hardhat development environment
- Citrea testnet cBTC for gas fees

### Environment Setup

1. **Clone and install dependencies**:

```bash
cd contracts/citrea-options
npm install
```

2. **Configure environment**:

```bash
cp .env.example .env
# Add your private key to .env
PRIVATE_KEY=your_private_key_here
```

3. **Deploy contracts**:

```bash
npm run deploy:viem
```

This will:

- Deploy all 7 contracts to Citrea testnet
- Initialize price feeds with BTC price
- Set up market parameters
- Save deployment addresses to `deployed-addresses.json`

### Deployment Process

The deployment script performs the following steps:

1. **Deploy Token Contracts**

   - USDC mock token (6 decimals)
   - Bitcoin mock token (8 decimals)

2. **Deploy Price Feeds**

   - BTC price feed (initialized at $97,000)
   - USDC price feed (initialized at $1.00)

3. **Deploy Time Oracle**

   - Manages time for option expiry calculations

4. **Deploy Options Trading Contract**

   - Main trading logic
   - Links to price feeds and time oracle

5. **Initialize System**
   - Add supported assets (BTC)
   - Add supported collateral (USDC)
   - Set market parameters (volatility, risk-free rate)

## 🧪 Testing

### Comprehensive Lifecycle Test

Run the complete options lifecycle test:

```bash
npx tsx scripts/test-options-lifecycle.ts
```

This test validates:

1. ✅ Contract deployment and initialization
2. ✅ Token minting for test accounts
3. ✅ Balance verification
4. ✅ Market parameter setup
5. ✅ Price feed integration
6. ✅ Collateral calculation and approval
7. ✅ Option creation (Call option, 20% OTM)
8. ✅ Premium calculation and approval
9. ✅ Option purchase by different account
10. ✅ Final balance reconciliation

**Test Results**: All 10 steps pass successfully with proper account separation.

### Test Features

- **Account Separation**: Creates throwaway buyer account funded with gas
- **Real Calculations**: Uses actual collateral requirements and premium calculations
- **Comprehensive Logging**: JSON-structured logs for each step
- **Error Handling**: Graceful failure reporting with detailed error messages
- **Financial Summary**: Complete breakdown of token flows and balances

## 💰 Token Economics

### Test Token Specifications

| Token   | Symbol | Decimals | Initial Supply       | Purpose              |
| ------- | ------ | -------- | -------------------- | -------------------- |
| USDC    | USDC   | 6        | Unlimited (mintable) | Collateral & Premium |
| Bitcoin | BTC    | 8        | Unlimited (mintable) | Underlying Asset     |

### Example Trade Breakdown

For a 1 BTC Call Option (Strike: $116,400, Current: $97,000):

- **Collateral Required**: 97,000 USDC (1 BTC × current price)
- **Premium Calculated**: ~5,315 USDC (Black-Scholes model)
- **Writer Receives**: 5,315 USDC premium
- **Writer Locks**: 97,000 USDC collateral
- **Buyer Pays**: 5,315 USDC premium
- **Buyer Gets**: Option to buy 1 BTC at $116,400

## 🔧 Contract Interaction

### Key Functions

#### CitreaOptionsTrading Contract

```solidity
// Create new option
function createOption(
    OptionType optionType,
    uint256 strikePrice,
    uint256 expiryTimestamp,
    address underlyingAsset,
    address collateralToken,
    uint256 contractSize
) external returns (uint256)

// Purchase existing option
function purchaseOption(uint256 optionId) external

// Exercise option before expiry
function exerciseOption(uint256 optionId) external

// View option details
function options(uint256 optionId) external view returns (Option memory)
```

#### Token Contracts (MockERC20)

```solidity
// Mint test tokens (testing only)
function mint(address to, uint256 amount) external onlyOwner

// Standard ERC20 functions
function approve(address spender, uint256 amount) external returns (bool)
function transfer(address to, uint256 amount) external returns (bool)
function balanceOf(address account) external view returns (uint256)
```

## 📊 Monitoring & Analytics

### Available Data

- **Option Details**: Strike, expiry, premium, collateral
- **User Positions**: Created options, purchased options
- **Market Metrics**: Total volume, active options
- **Price History**: Historical price feeds data

### Test Results Location

- **Detailed Logs**: `test-results.json`
- **Deployment Info**: `deployed-addresses.json`
- **Contract Artifacts**: `artifacts/contracts/`

## 🛡️ Security Considerations

### Implemented Protections

- **ReentrancyGuard**: Prevents reentrant attacks
- **SafeERC20**: Safe token transfers
- **Owner Access Control**: Critical functions restricted
- **Input Validation**: Strike price, expiry, amounts validated
- **Collateral Management**: Automated locking prevents undercollateralization

### Testing Coverage

- ✅ Option creation and purchase flow
- ✅ Collateral calculation accuracy
- ✅ Premium calculation validation
- ✅ Account separation testing
- ✅ Error condition handling

## 🔄 Integration Guide

### Frontend Integration

The contracts are designed to work with the React frontend located in `/frontend`:

1. **Contract Instances**: Use addresses from `deployed-addresses.json`
2. **ABI Files**: Available in `artifacts/contracts/`
3. **Network Config**: Citrea testnet (Chain ID: 5115)
4. **RPC Endpoint**: `https://rpc.testnet.citrea.xyz`

### Wallet Integration

- **Supported Wallets**: MetaMask, WalletConnect, RainbowKit
- **Required Network**: Citrea Testnet
- **Gas Token**: cBTC (Citrea Bitcoin)

## 📚 Additional Resources

- **Frontend**: `/frontend` - React UI for options trading
- **Citrea Docs**: Official Citrea network documentation
- **Test Explorer**: View transactions on Citrea testnet explorer

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add comprehensive tests
4. Submit pull request with detailed description

## 📄 License

MIT License - See LICENSE file for details

---

**Status**: ✅ Fully Deployed and Tested on Citrea Testnet

**Last Updated**: September 27, 2025

**Test Success Rate**: 100% (10/10 steps passing)

- Collateral management system
- Premium calculation using simplified Black-Scholes
- American-style exercise before expiry
- Support for multiple underlying assets and collaterals

2. **MockERC20.sol** - Testing token contract

   - Faucet functionality for easy testing
   - Configurable decimals and supply
   - Owner controls for minting/burning

3. **WrappedNativeToken.sol** - Wrapped cBTC

   - 1:1 wrapping of native cBTC to ERC20
   - Deposit/withdraw functionality
   - Gas-efficient implementation

4. **MockPriceFeed.sol** - Controllable price oracle

   - Chainlink-compatible interface
   - Owner-controlled price updates
   - Historical price data storage
   - Batch price updates for testing

5. **TimeOracle.sol** - Time manipulation for demos
   - Fast-forward time functionality
   - Set absolute timestamps
   - Option expiry calculation helpers
   - Switch between real and mock time

## 🚀 Deployment

### Prerequisites

```bash
npm install
```

### Deploy to Citrea Testnet

1. Set up environment variables:

```bash
export CITREA_PRIVATE_KEY="your_private_key_here"
```

2. Deploy all contracts:

```bash
npx hardhat ignition deploy ./ignition/modules/CitreaOptions.ts --network citrea
```

3. Verify contracts (optional):

```bash
npx hardhat verify --network citrea DEPLOYED_CONTRACT_ADDRESS
```

## 🔧 Configuration

After deployment, set up the contracts:

```typescript
// Add BTC as supported underlying asset
await optionsTrading.addSupportedAsset(
  bitcoinTokenAddress,
  btcPriceFeedAddress,
  2000, // 20% volatility (basis points)
  500 // 5% risk-free rate (basis points)
);

// Add USDC as collateral token
await optionsTrading.addSupportedCollateral(stableCoinAddress);
```

## 📊 Usage Examples

### Creating an Option

```typescript
// Writer creates a BTC call option
await optionsTrading.createOption(
  0, // OptionType.CALL
  10000000000000, // $100,000 strike price (8 decimals)
  expiryTimestamp, // Unix timestamp
  bitcoinTokenAddress,
  stableCoinAddress, // Collateral token
  100000000 // 1 BTC contract size (8 decimals)
);
```

### Purchasing an Option

```typescript
// Buyer purchases the option by paying premium
await stableCoin.approve(optionsTrading.address, premium);
await optionsTrading.purchaseOption(optionId);
```

### Exercising an Option

```typescript
// American-style: exercise anytime before expiry
await optionsTrading.exerciseOption(optionId);
```

## 🎮 Demo Features

### Price Control

```typescript
// Update BTC price to $105,000
await btcPriceFeed.updateAnswer(10500000000000);
```

### Time Manipulation

```typescript
// Fast forward 1 day
await timeOracle.fastForward(86400);

// Set absolute time
await timeOracle.setAbsoluteTime(futureTimestamp);

// Reset to blockchain time
await timeOracle.useBlockTime();
```

### Token Faucets

```typescript
// Get test tokens
await stableCoin.faucet(10000); // 10,000 USDC
await bitcoinToken.faucet(1); // 1 BTC
```

## 🔍 Key Features

- **American Exercise**: Options can be exercised anytime before expiry
- **Collateral Management**: Automated collateral locking and release
- **Dynamic Pricing**: Premium calculation based on volatility and time to expiry
- **Multi-Asset Support**: Add any ERC20 as underlying or collateral
- **Demo Controls**: Time manipulation and price control for demonstrations
- **Gas Optimized**: Using Solidity 0.8.28 with IR compilation
- **Secure**: ReentrancyGuard, SafeERC20, and comprehensive access controls

## 📋 Contract Addresses (After Deployment)

| Contract                | Address | Description                   |
| ----------------------- | ------- | ----------------------------- |
| CitreaOptionsTrading    | `TBD`   | Main options trading contract |
| TimeOracle              | `TBD`   | Time manipulation oracle      |
| MockERC20 (USDC)        | `TBD`   | Stable coin for collateral    |
| MockERC20 (BTC)         | `TBD`   | Bitcoin token for testing     |
| WrappedNativeToken      | `TBD`   | Wrapped cBTC                  |
| MockPriceFeed (BTC/USD) | `TBD`   | Bitcoin price feed            |
| MockPriceFeed (ETH/USD) | `TBD`   | Ethereum price feed           |

## 🧪 Testing Scenarios

1. **Basic Option Flow**:

   - Create call option at $100k strike
   - Purchase option paying premium
   - Update price to $110k
   - Exercise option for $10k profit

2. **Time-based Expiry**:

   - Create option expiring in 1 day
   - Fast forward past expiry
   - Attempt exercise (should fail)
   - Writer claims expired collateral

3. **Put Option Scenario**:
   - Create put option at $90k strike
   - Price drops to $80k
   - Exercise put for $10k profit

## 🔐 Security Considerations

- All external calls use SafeERC20
- ReentrancyGuard on state-changing functions
- Proper access controls with Ownable
- Input validation on all parameters
- Overflow protection with Solidity 0.8.28

## 📝 License

MIT License - See LICENSE file for details.

---

**Built for ETH Global Super DeFi Hackathon**  
**Network**: Citrea Testnet  
**Framework**: Hardhat + Viem + OpenZeppelin

To learn more about the Hardhat 3 Beta, please visit the [Getting Started guide](https://hardhat.org/docs/getting-started#getting-started-with-hardhat-3). To share your feedback, join our [Hardhat 3 Beta](https://hardhat.org/hardhat3-beta-telegram-group) Telegram group or [open an issue](https://github.com/NomicFoundation/hardhat/issues/new) in our GitHub issue tracker.

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- TypeScript integration tests using [`node:test`](nodejs.org/api/test.html), the new Node.js native test runner, and [`viem`](https://viem.sh/).
- Examples demonstrating how to connect to different types of networks, including locally simulating OP mainnet.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```shell
npx hardhat test
```

You can also selectively run the Solidity or `node:test` tests:

```shell
npx hardhat test solidity
npx hardhat test nodejs
```

### Make a deployment to Sepolia

This project includes an example Ignition module to deploy the contract. You can deploy this module to a locally simulated chain or to Sepolia.

To run the deployment to a local chain:

```shell
npx hardhat ignition deploy ignition/modules/Counter.ts
```

To run the deployment to Sepolia, you need an account with funds to send the transaction. The provided Hardhat configuration includes a Configuration Variable called `SEPOLIA_PRIVATE_KEY`, which you can use to set the private key of the account you want to use.

You can set the `SEPOLIA_PRIVATE_KEY` variable using the `hardhat-keystore` plugin or by setting it as an environment variable.

To set the `SEPOLIA_PRIVATE_KEY` config variable using `hardhat-keystore`:

```shell
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

After setting the variable, you can run the deployment with the Sepolia network:

```shell
npx hardhat ignition deploy --network sepolia ignition/modules/Counter.ts
```

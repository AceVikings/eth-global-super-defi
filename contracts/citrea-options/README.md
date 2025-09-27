# Citrea Options Trading Smart Contracts

A decentralized options trading platform built on Citrea testnet, enabling users to create, trade, and exercise Bitcoin options with USDC collateral.

## 🏗️ Architecture Overview

The platform consists of 7 smart contracts working together to provide a complete options trading experience:

### Core Contracts

1. **CitreaOptionsTrading.sol** - Main options trading contract
2. **MockERC20.sol** - Token contracts for USDC and Bitcoin simulation
3. **MockPriceFeed.sol** - Chainlink-compatible price oracle
4. **TimeOracle.sol** - Time management for options expiry

## 📋 Contract Addresses (Citrea Testnet)

| Contract | Address |
|----------|---------|
| Stable Coin (USDC) | `0x471E11D879A395b8F1B66537EA1837e8eE113B80` |
| Bitcoin Token | `0xA06f12B8d9fE2515d41b62E556CCE0467666E347` |
| Options Trading | `0x41FefceBEf394dEeFc228AF5615064bA430b95Ec` |
| BTC Price Feed | `0x333F8D70cE57F9e8Be05aCF3e879c0834F4Db6b6` |
| Time Oracle | `0x5C3Ca88Cefc90E9AA3d8D3b46d0B1A1476a95fFf` |
| USDC Price Feed | `0x04FAE3b677BfccD7Ea8c9fd30f0A67e6ECE65db1` |

## 🔄 User Flow

### For Option Writers (Sellers)

1. **Setup Phase**
   - Mint test tokens (USDC/BTC) using the token minter
   - Ensure you have sufficient USDC for collateral

2. **Create Option**
   - Navigate to Options Trading page
   - Select option type (Call/Put)
   - Set strike price and expiry date
   - Approve USDC collateral spending
   - Submit option creation transaction
   - Collateral is locked in the contract

3. **Earn Premium**
   - Receive premium payment when option is purchased
   - Wait for option to expire or be exercised

4. **Option Resolution**
   - If not exercised: Reclaim collateral after expiry
   - If exercised: Automatic settlement based on option terms

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

| Token | Symbol | Decimals | Initial Supply | Purpose |
|-------|--------|----------|---------------|----------|
| USDC | USDC | 6 | Unlimited (mintable) | Collateral & Premium |
| Bitcoin | BTC | 8 | Unlimited (mintable) | Underlying Asset |

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
  500   // 5% risk-free rate (basis points)
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
await bitcoinToken.faucet(1);   // 1 BTC
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

| Contract | Address | Description |
|----------|---------|-------------|
| CitreaOptionsTrading | `TBD` | Main options trading contract |
| TimeOracle | `TBD` | Time manipulation oracle |
| MockERC20 (USDC) | `TBD` | Stable coin for collateral |
| MockERC20 (BTC) | `TBD` | Bitcoin token for testing |
| WrappedNativeToken | `TBD` | Wrapped cBTC |
| MockPriceFeed (BTC/USD) | `TBD` | Bitcoin price feed |
| MockPriceFeed (ETH/USD) | `TBD` | Ethereum price feed |

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

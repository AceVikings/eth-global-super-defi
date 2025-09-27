# Citrea Options Trading Platform

A comprehensive options trading platform built for the Citrea network, featuring American-style options with collateral management, dynamic pricing, and demo-friendly time controls.

## 🏗️ Architecture

### Smart Contracts

1. **CitreaOptionsTrading.sol** - Main options trading contract
   - Create and manage options (calls & puts)
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

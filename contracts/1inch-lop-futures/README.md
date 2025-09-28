# 1inch Limit Order Protocol Futures Integration

A complete system for creating bilateral futures positions through 1inch limit orders on Polygon mainnet. This innovative approach allows users to gain leveraged exposure to assets without directly holding them, using 1inch's decentralized limit order infrastructure as the settlement mechanism.

## 🚀 System Overview

### Core Innovation
Instead of traditional futures that require centralized exchanges or isolated protocols, this system leverages 1inch's Limit Order Protocol to create **bilateral futures positions** where:

- **Makers** create limit orders that, when filled, automatically open futures positions
- **Takers** fill orders and simultaneously enter the opposite side of the futures contract
- **No underlying assets** need to be held - positions are purely derivative
- **Decentralized execution** through 1inch's proven infrastructure
- **Automated collateral management** with role-based access control

### Key Benefits
- ✅ **Capital Efficiency**: Leveraged exposure without holding underlying assets
- ✅ **Decentralized**: No centralized exchange or order book required
- ✅ **Automated**: Seamless integration with existing 1inch limit order flow
- ✅ **Bilateral**: Both parties get exactly the exposure they want
- ✅ **Production Ready**: Deployed on Polygon mainnet with real USDC collateral

## 📋 Architecture

### Smart Contracts

#### Core Contracts
- **`FuturesVault.sol`** - Collateral management with role-based access control
- **`FuturesMarket.sol`** - Bilateral position management, PnL calculation, and liquidation
- **`PreInteractionAdapter.sol`** - Handles taker collateral locking before order execution
- **`PostInteractionAdapter.sol`** - Opens bilateral positions after settlement
- **`FuturesSettlement.sol`** - Receives 1inch swap outputs and triggers position creation

#### Support Contracts
- **`MockOracle.sol`** - Price feed oracle (testnet) / Chainlink integration (mainnet)
- **`ILimitOrderProtocol.sol`** - 1inch protocol interface for integration

### Integration Flow

```
1. User creates 1inch limit order with futures extensions
   ├── preInteraction: PreInteractionAdapter (locks taker collateral)
   ├── receiver: FuturesSettlement (receives swap output)  
   └── postInteraction: PostInteractionAdapter (opens position)

2. 1inch Keeper fills the limit order
   ├── preInteraction() called → taker collateral locked
   ├── swap executed → tokens sent to FuturesSettlement
   └── postInteraction() called → bilateral position created

3. Position Management
   ├── Real-time PnL tracking based on oracle prices
   ├── Liquidation when margin insufficient
   └── Settlement when positions are closed
```

## 🛠 Usage

### Running Tests

To run all the tests in the project:

```shell
npx hardhat test
```

You can also selectively run Solidity or TypeScript tests:

```shell
npx hardhat test solidity
npx hardhat test nodejs
```

### Deployment

To deploy the complete futures system:

```shell
# Local deployment
npx hardhat run scripts/deploy-complete-system.ts

# Polygon deployment (set POLYGON_RPC_URL and PRIVATE_KEY in .env)
npx hardhat run scripts/deploy-complete-system.ts --network polygon
```

### Example Usage

See `examples/order-creation.ts` for complete integration examples:

```typescript
// Create a long ETH futures position via 1inch limit order
const order = createFuturesLimitOrder(
  maker, taker,
  usdcAddress, wethAddress,
  parseUnits("2000", 6), parseUnits("1", 18),
  parseUnits("1", 18), // Long 1 ETH
  2, // 2x leverage
  parseUnits("1000", 6), parseUnits("1000", 6) // Margins
);
```

---

**⚠️ Disclaimer**: This is experimental software for educational purposes. Use at your own risk.

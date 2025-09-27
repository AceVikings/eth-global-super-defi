import { WalletDropdown } from '../components/WalletDropdown'

interface SwapPageProps {
  onNavigate: (page: string) => void;
}

export function SwapPage({ onNavigate }: SwapPageProps) {
  return (
    <div className="h-screen w-screen overflow-auto" style={{ background: 'linear-gradient(180deg, var(--sky-blue) 0%, var(--light-green) 50%, var(--cream) 100%)' }}>
      
      {/* Game Menu Navigation */}
      <nav className="game-menu sticky top-0 z-40">
        <div className="w-full flex justify-between items-center">
          <div 
            className="menu-item"
            onClick={() => onNavigate('home')}
          >
            Home
          </div>
          
          <div className="flex">
            <div 
              className="menu-item"
              onClick={() => onNavigate('options')}
            >
              Options
            </div>
            <div className="menu-item active">Swap</div>
            <div 
              className="menu-item"
              onClick={() => onNavigate('futures')}
            >
              Futures
            </div>
          </div>
          
          <div className="flex items-center">
            <WalletDropdown />
          </div>
        </div>
      </nav>

      {/* Swap Content */}
      <div className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl mb-4 animate-pixel-bounce" style={{ color: 'var(--warm-red)' }}>
              🔄 CROSS-CHAIN SWAPS
            </h1>
            <p className="text-xl" style={{ color: 'var(--charcoal)' }}>
              Powered by 1inch Cross-Chain Fusion+
            </p>
          </div>

          {/* Coming Soon Section */}
          <div className="dialogue-box mb-8">
            <h2 className="text-2xl mb-4" style={{ color: 'var(--warm-red)' }}>
              Professor DeFi says:
            </h2>
            <p className="mb-4">
              "Welcome to the Cross-Chain Swap arena! This is where the magic happens - seamless trading 
              across 15+ blockchains powered by 1inch Cross-Chain Fusion+ on Starknet!"
            </p>
            <p>
              "Soon you'll be able to swap tokens with optimized routing, minimal slippage, 
              and access to unified liquidity pools across the entire DeFi ecosystem!"
            </p>
          </div>

          {/* Swap Interface Mockup */}
          <div className="game-card mb-8 max-w-lg mx-auto">
            <h3 className="text-xl text-center mb-6" style={{ color: 'var(--charcoal)' }}>
              SWAP INTERFACE
            </h3>
            
            {/* From Token */}
            <div className="mb-4">
              <label className="block text-sm mb-2" style={{ color: 'var(--charcoal)' }}>From</label>
              <div className="flex items-center p-3 rounded-lg" style={{ background: 'var(--light-gray)', border: '2px solid var(--charcoal)' }}>
                <div className="w-8 h-8 rounded-full bg-orange-400 mr-3"></div>
                <span className="flex-1">ETH</span>
                <span className="text-sm" style={{ color: 'var(--charcoal)' }}>Ethereum</span>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="text-center mb-4">
              <div className="inline-block p-2 rounded-full" style={{ background: 'var(--cream)' }}>
                ⬇️
              </div>
            </div>

            {/* To Token */}
            <div className="mb-6">
              <label className="block text-sm mb-2" style={{ color: 'var(--charcoal)' }}>To</label>
              <div className="flex items-center p-3 rounded-lg" style={{ background: 'var(--light-gray)', border: '2px solid var(--charcoal)' }}>
                <div className="w-8 h-8 rounded-full bg-purple-400 mr-3"></div>
                <span className="flex-1">USDC</span>
                <span className="text-sm" style={{ color: 'var(--charcoal)' }}>Polygon</span>
              </div>
            </div>

            {/* Swap Button */}
            <button className="w-full nintendo-button-primary opacity-50 cursor-not-allowed">
              Coming Soon - Connect Wallet to Swap
            </button>
          </div>

          {/* Feature Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>MULTI-CHAIN SUPPORT</h3>
              <p className="text-sm mb-4">
                Trade across 15+ blockchains including Ethereum, Polygon, Arbitrum, Starknet, and more.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>OPTIMAL ROUTING</h3>
              <p className="text-sm mb-4">
                1inch Cross-Chain Fusion+ finds the best routes for minimal slippage and gas costs.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>UNIFIED LIQUIDITY</h3>
              <p className="text-sm mb-4">
                Access deep liquidity pools across all supported chains for better execution.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>STARKNET INTEGRATION</h3>
              <p className="text-sm mb-4">
                Leverage Starknet's scalability and cost efficiency for cross-chain operations.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

          </div>

          {/* Development Status */}
          <div className="text-center">
            <div className="inline-block p-4 rounded-lg" style={{ background: 'var(--light-gray)', border: '4px solid var(--charcoal)' }}>
              <p className="text-sm" style={{ color: 'var(--charcoal)' }}>
                🚧 Cross-chain functionality is being built for the hackathon! 🚧
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--charcoal)' }}>
                Integrating with 1inch Cross-Chain Fusion+ and Starknet for optimal trading experience
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
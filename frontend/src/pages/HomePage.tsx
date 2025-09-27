import { useState } from 'react'
import { WalletDropdown } from '../components/WalletDropdown'

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)

  return (
    <div className="h-screen w-screen overflow-auto" style={{ background: 'linear-gradient(180deg, var(--sky-blue) 0%, var(--light-green) 50%, var(--cream) 100%)' }}>
      
      {/* Game Menu Navigation */}
      <nav className="game-menu sticky top-0 z-40">
        <div className="w-full flex justify-between items-center">
          <div className="menu-item active">
            Home
          </div>
          
          <div className="flex">
            <div 
              className="menu-item"
              onClick={() => onNavigate('options')}
            >
              Options
            </div>
            <div 
              className="menu-item"
              onClick={() => onNavigate('swap')}
            >
              Swap
            </div>
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

      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl mb-4 animate-pixel-bounce" style={{ color: 'var(--warm-red)' }}>
              🎮 SUPER DeFi
            </h1>
            <p className="text-xl md:text-2xl mb-6" style={{ color: 'var(--charcoal)' }}>
              Cross-Chain Adventures in Decentralized Finance
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-8">
            <button 
              className="nintendo-button-primary"
              onClick={() => onNavigate('options')}
            >
              START ADVENTURE
            </button>
            <button className="nintendo-button">
              HOW TO PLAY
            </button>
          </div>

          <div className="text-sm" style={{ color: 'var(--charcoal)' }}>
            <p>🌟 Multi-Chain Support • 💎 Advanced Options • ⚡ Lightning Fast</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl text-center mb-12" style={{ color: 'var(--sky-blue)' }}>
            PLATFORM FEATURES
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            
            <div 
              className="game-card text-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onNavigate('swap')}
            >
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>CROSS-CHAIN SWAPS</h3>
              <p className="text-sm leading-relaxed">
                Powered by 1inch Cross-Chain Fusion+ on Starknet. Trade seamlessly across 
                15+ blockchains with optimized routing, minimal slippage, and unified liquidity access.
              </p>
            </div>

            <div 
              className="game-card text-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onNavigate('options')}
            >
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>ADVANCED OPTIONS</h3>
              <p className="text-sm leading-relaxed">
                Next-generation derivatives protocol on Citrea. Trade put/call options with 
                strategic collateral management and unified Uniswap V4 pool integration.
              </p>
            </div>

            <div 
              className="game-card text-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onNavigate('futures')}
            >
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>FUTURES TRADING</h3>
              <p className="text-sm leading-relaxed">
                Perpetual contracts with advanced leverage management and cross-collateral optimization 
                for maximum capital efficiency while maintaining swap readiness.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 px-4" style={{ background: 'linear-gradient(180deg, var(--light-green) 0%, var(--cream) 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 flex items-center justify-center flex-shrink-0">
              <div className="text-8xl">🎓</div>
            </div>
            
            <div className="dialogue-box flex-1">
              <h3 className="text-xl mb-4" style={{ color: 'var(--warm-red)' }}>
                Professor DeFi says:
              </h3>
              <p className="leading-relaxed">
                "Welcome to the world of decentralized finance! Super DeFi combines the excitement 
                of classic gaming with cutting-edge blockchain technology. Whether you're a seasoned 
                trader or just starting your journey, there's an adventure waiting for everyone!"
              </p>
              <div className="mt-4">
                <button className="nintendo-button mr-4">LEARN MORE</button>
                <button 
                  className="nintendo-button-primary"
                  onClick={() => setIsWalletModalOpen(true)}
                >
                  CONNECT WALLET
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wallet Connect Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="game-window max-w-md w-full">
            <div className="window-header">
              <span>CONNECT WALLET</span>
              <button 
                className="close-button"
                onClick={() => setIsWalletModalOpen(false)}
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <div className="dialogue-box mb-6">
                <p>Choose your wallet to start your DeFi adventure!</p>
              </div>
              
              <div className="space-y-4">
                <button className="nintendo-button w-full text-left flex items-center space-x-4">
                  <div className="sprite-icon bg-orange-400"></div>
                  <span>MetaMask (EVM Chains)</span>
                </button>
                
                <button className="nintendo-button w-full text-left flex items-center space-x-4">
                  <div className="sprite-icon bg-blue-400"></div>
                  <span>StarkNet Wallet</span>
                </button>
                
                <button className="nintendo-button w-full text-left flex items-center space-x-4">
                  <div className="sprite-icon bg-purple-400 animate-sparkle"></div>
                  <span>More Wallets Coming Soon!</span>
                </button>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-xs" style={{ color: 'var(--charcoal)' }}>
                  * Multi-chain support in development 🚧
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
import { WalletDropdown } from '../components/WalletDropdown'

interface OptionsPageProps {
  onNavigate: (page: string) => void;
}

export function OptionsPage({ onNavigate }: OptionsPageProps) {
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
            <div className="menu-item active">Options</div>
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

      {/* Options Content */}
      <div className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl mb-4 animate-pixel-bounce" style={{ color: 'var(--warm-red)' }}>
              📊 ADVANCED OPTIONS
            </h1>
            <p className="text-xl" style={{ color: 'var(--charcoal)' }}>
              Next-Generation Derivatives on Citrea
            </p>
          </div>

          {/* Coming Soon Section */}
          <div className="dialogue-box mb-8">
            <h2 className="text-2xl mb-4" style={{ color: 'var(--warm-red)' }}>
              Professor DeFi says:
            </h2>
            <p className="mb-4">
              "Welcome to the Advanced Options trading arena! This feature is currently under development 
              and will soon provide you with powerful derivatives trading capabilities."
            </p>
            <p>
              "Here you'll be able to trade put/call options with strategic collateral management 
              on the Citrea network, integrated with Uniswap V4 pools!"
            </p>
          </div>

          {/* Feature Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>PUT/CALL OPTIONS</h3>
              <p className="text-sm mb-4">
                Trade sophisticated derivatives with flexible strike prices and expiration dates.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>COLLATERAL MANAGEMENT</h3>
              <p className="text-sm mb-4">
                Automated collateral optimization using Citrea's advanced smart contract capabilities.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>LIQUIDITY INTEGRATION</h3>
              <p className="text-sm mb-4">
                Seamless integration with Uniswap V4 hooks for optimal capital efficiency.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>RISK ANALYTICS</h3>
              <p className="text-sm mb-4">
                Real-time risk assessment and portfolio optimization tools.
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
                🚧 This feature is under active development for the hackathon! 🚧
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--charcoal)' }}>
                Stay tuned for updates as we build this revolutionary options trading platform
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
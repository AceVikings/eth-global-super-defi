import { Navigation } from '../components/Navigation'

export function FuturesPage() {
  return (
    <div className="h-screen w-screen overflow-auto" style={{ background: 'linear-gradient(180deg, var(--sky-blue) 0%, var(--light-green) 50%, var(--cream) 100%)' }}>
      
      {/* Game Menu Navigation */}
      <Navigation />

      {/* Futures Content */}
      <div className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl mb-4 animate-pixel-bounce" style={{ color: 'var(--warm-red)' }}>
              🚀 FUTURES TRADING
            </h1>
            <p className="text-xl" style={{ color: 'var(--charcoal)' }}>
              Next-Generation Perpetual Contracts
            </p>
          </div>

          {/* Coming Soon Section */}
          <div className="dialogue-box mb-8">
            <h2 className="text-2xl mb-4" style={{ color: 'var(--warm-red)' }}>
              Professor DeFi says:
            </h2>
            <p className="mb-4">
              "Step into the future of derivatives trading! Our Futures platform will offer 
              perpetual contracts with advanced leverage management and cross-collateral optimization."
            </p>
            <p>
              "Trade with confidence using our innovative liquidation protection and 
              automated position sizing algorithms!"
            </p>
          </div>

          {/* Feature Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>PERPETUAL CONTRACTS</h3>
              <p className="text-sm mb-4">
                Trade perpetual futures with no expiration dates and flexible leverage up to 100x.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>CROSS-COLLATERAL</h3>
              <p className="text-sm mb-4">
                Use multiple assets as collateral with intelligent margin optimization.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>LIQUIDATION PROTECTION</h3>
              <p className="text-sm mb-4">
                Advanced algorithms to prevent unnecessary liquidations and protect positions.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

            <div className="game-card">
              <h3 className="text-lg mb-3" style={{ color: 'var(--charcoal)' }}>FUNDING RATES</h3>
              <p className="text-sm mb-4">
                Competitive funding rates with transparent pricing and real-time updates.
              </p>
              <div className="nintendo-button opacity-50 cursor-not-allowed">
                Coming Soon
              </div>
            </div>

          </div>

          {/* Mock Trading Interface */}
          <div className="game-card mb-8 max-w-lg mx-auto">
            <h3 className="text-xl text-center mb-6" style={{ color: 'var(--charcoal)' }}>
              FUTURES INTERFACE PREVIEW
            </h3>
            
            {/* Market Selection */}
            <div className="mb-4">
              <label className="block text-sm mb-2" style={{ color: 'var(--charcoal)' }}>Market</label>
              <div className="flex items-center p-3 rounded-lg" style={{ background: 'var(--light-gray)', border: '2px solid var(--charcoal)' }}>
                <div className="w-8 h-8 rounded-full bg-orange-400 mr-3"></div>
                <span className="flex-1">BTC-PERP</span>
                <span className="text-sm text-green-600">+2.45%</span>
              </div>
            </div>

            {/* Position Size */}
            <div className="mb-4">
              <label className="block text-sm mb-2" style={{ color: 'var(--charcoal)' }}>Size</label>
              <div className="flex items-center p-3 rounded-lg" style={{ background: 'var(--light-gray)', border: '2px solid var(--charcoal)' }}>
                <input 
                  type="text" 
                  placeholder="0.00" 
                  className="flex-1 bg-transparent outline-none"
                  style={{ color: 'var(--charcoal)' }}
                  disabled
                />
                <span className="text-sm">BTC</span>
              </div>
            </div>

            {/* Leverage */}
            <div className="mb-6">
              <label className="block text-sm mb-2" style={{ color: 'var(--charcoal)' }}>Leverage</label>
              <div className="flex gap-2 mb-3">
                {['5x', '10x', '20x', '50x'].map((lev) => (
                  <button key={lev} className="nintendo-button text-sm px-3 py-1 opacity-50 cursor-not-allowed">
                    {lev}
                  </button>
                ))}
              </div>
            </div>

            {/* Trade Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button className="nintendo-button-primary opacity-50 cursor-not-allowed text-green-700" style={{ background: 'var(--light-green)' }}>
                Long
              </button>
              <button className="nintendo-button-primary opacity-50 cursor-not-allowed text-red-700" style={{ background: 'var(--warm-red)' }}>
                Short
              </button>
            </div>
          </div>

          {/* Development Status */}
          <div className="text-center">
            <div className="inline-block p-4 rounded-lg" style={{ background: 'var(--light-gray)', border: '4px solid var(--charcoal)' }}>
              <p className="text-sm" style={{ color: 'var(--charcoal)' }}>
                🚧 Futures trading is being built for the hackathon! 🚧
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--charcoal)' }}>
                Advanced perpetual contracts with cross-chain collateral support coming soon
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
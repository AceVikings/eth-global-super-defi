import { useState, useEffect } from 'react'
import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { formatEther } from 'viem'
import { citreaTestnet } from '../wagmi.config'
import { 
  FaWallet, 
  FaChevronDown, 
  FaCircle, 
  FaPlug,
  FaSignOutAlt,
  FaEthereum,
  FaNetworkWired,
  FaGem
} from 'react-icons/fa'

interface StarknetWalletState {
  wallet: any | null
  address: string | null
  isConnected: boolean
  balance: string | null
}

export const WalletDropdown = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [starknetWallet, setStarknetWallet] = useState<StarknetWalletState>({
    wallet: null,
    address: null,
    isConnected: false,
    balance: null
  })

  // EVM wallet hooks
  const { address: evmAddress, isConnected: isEvmConnected, chain } = useAccount()
  const { disconnect: disconnectEvm } = useDisconnect()
  
  // Get EVM balance
  const { data: evmBalance } = useBalance({
    address: evmAddress,
  })

  // Check for existing Starknet connection on component mount
  useEffect(() => {
    // This would need to be implemented based on your Starknet wallet state management
    // For now, we'll use a placeholder
  }, [])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0.000'
    const formatted = formatEther(balance)
    return parseFloat(formatted).toFixed(3)
  }

  const getChainName = (chainId: number) => {
    switch (chainId) {
      case 1: return 'Ethereum'
      case 137: return 'Polygon'
      case 42161: return 'Arbitrum'
      case 8453: return 'Base'
      case 10: return 'Optimism'
      case citreaTestnet.id: return 'Citrea Testnet'
      default: return 'Unknown Chain'
    }
  }

  const hasConnectedWallets = isEvmConnected || starknetWallet.isConnected

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="menu-item flex items-center gap-2"
      >
        {hasConnectedWallets ? (
          <>
            <FaCircle className="w-2 h-2 text-green-400 animate-pulse" />
            <FaWallet className="text-sm" />
            {isEvmConnected && evmAddress ? formatAddress(evmAddress) : 'Connected'}
          </>
        ) : (
          <>
            <FaWallet className="text-sm" />
            Connect Wallet
          </>
        )}
        <FaChevronDown className="text-xs" />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 z-50">
            <div className="dialogue-box min-w-80">
              <h3 className="text-lg mb-4 text-center" style={{ color: 'var(--warm-red)' }}>
                WALLET STATUS
              </h3>

              {/* EVM Wallets Section */}
              <div className="mb-6">
                <h4 className="text-sm mb-3 font-bold flex items-center gap-2" style={{ color: 'var(--sky-blue)' }}>
                  <FaEthereum />
                  EVM CHAINS
                </h4>
                
                {isEvmConnected && evmAddress ? (
                  <div className="game-card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-1">
                          <FaNetworkWired className="text-xs" />
                          <div className="text-xs mb-1" style={{ color: 'var(--charcoal)' }}>
                            {chain ? getChainName(chain.id) : 'Unknown'}
                          </div>
                        </div>
                        <div className="text-sm font-mono">
                          {formatAddress(evmAddress)}
                        </div>
                      </div>
                      <button
                        onClick={() => disconnectEvm()}
                        className="text-xs px-2 py-1 nintendo-button flex items-center gap-1"
                      >
                        <FaSignOutAlt />
                        Disconnect
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm" style={{ color: 'var(--charcoal)' }}>
                        Balance:
                      </div>
                      <div className="text-sm font-bold">
                        {formatBalance(evmBalance?.value)} {evmBalance?.symbol || 'ETH'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="game-card text-center py-4">
                    <ConnectButton.Custom>
                      {({ openConnectModal }) => (
                        <button
                          onClick={() => {
                            openConnectModal()
                            setIsOpen(false)
                          }}
                          className="nintendo-button-primary w-full"
                        >
                          Connect EVM Wallet
                        </button>
                      )}
                    </ConnectButton.Custom>
                  </div>
                )}
              </div>

              {/* Starknet Section */}
              <div className="mb-4">
                <h4 className="text-sm mb-3 font-bold flex items-center gap-2" style={{ color: 'var(--soft-purple)' }}>
                  <FaGem />
                  STARKNET
                </h4>
                
                {starknetWallet.isConnected && starknetWallet.address ? (
                  <div className="game-card">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-xs mb-1" style={{ color: 'var(--charcoal)' }}>
                          Starknet Mainnet
                        </div>
                        <div className="text-sm font-mono">
                          {formatAddress(starknetWallet.address)}
                        </div>
                      </div>
                      <button
                        onClick={() => setStarknetWallet({
                          wallet: null,
                          address: null,
                          isConnected: false,
                          balance: null
                        })}
                        className="text-xs px-2 py-1 nintendo-button flex items-center gap-1"
                      >
                        <FaSignOutAlt />
                        Disconnect
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm" style={{ color: 'var(--charcoal)' }}>
                        Balance:
                      </div>
                      <div className="text-sm font-bold">
                        {starknetWallet.balance || '0.000'} ETH
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="game-card text-center py-4">
                    <button
                      onClick={async () => {
                        // Import and use the Argent connect function
                        const { connect } = await import('@starknet-io/get-starknet')
                        
                        try {
                          const wallet = await connect({
                            modalMode: 'canAsk',
                            modalTheme: 'light'
                          })
                          
                          if (wallet) {
                            const accounts = await wallet.request({
                              type: 'wallet_requestAccounts',
                              params: {}
                            })
                            
                            if (accounts && accounts.length > 0) {
                              setStarknetWallet({
                                wallet,
                                address: accounts[0],
                                isConnected: true,
                                balance: '0.000' // This would need to be fetched
                              })
                            }
                          }
                        } catch (error) {
                          console.error('Error connecting Starknet wallet:', error)
                        }
                        
                        setIsOpen(false)
                      }}
                      className="nintendo-button-primary w-full flex items-center justify-center gap-2"
                    >
                      <FaPlug />
                      Connect Argent Wallet
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t-2 border-charcoal pt-3 mt-4">
                <div className="text-xs text-center" style={{ color: 'var(--charcoal)' }}>
                  Supported Networks: Ethereum, Arbitrum, Polygon, Base, Optimism, Citrea Testnet, Starknet
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
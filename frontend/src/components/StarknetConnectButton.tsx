import { useConnect, useDisconnect, useAccount } from "@starknet-react/core"
import { useState } from "react"

export const StarknetConnectButton = () => {
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { address, isConnected } = useAccount()
  const [isOpen, setIsOpen] = useState(false)

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && address) {
    return (
      <div className="flex gap-2">
        <button
          className="menu-item"
          style={{ 
            background: 'var(--soft-purple)',
            color: 'var(--white)'
          }}
        >
          Starknet
        </button>
        <button
          onClick={() => disconnect()}
          className="menu-item"
          style={{ 
            background: 'var(--light-green)',
            color: 'var(--charcoal)'
          }}
        >
          {formatAddress(address)}
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="menu-item"
      >
        Connect Starknet
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 dialogue-box min-w-48 z-50">
          <h3 className="text-sm mb-3" style={{ color: 'var(--charcoal)' }}>
            Choose Wallet:
          </h3>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => {
                connect({ connector })
                setIsOpen(false)
              }}
              className="nintendo-button w-full mb-2 text-xs"
              disabled={!connector.available()}
            >
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
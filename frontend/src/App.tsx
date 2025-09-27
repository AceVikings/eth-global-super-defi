import { useState } from 'react'
import './App.css'
import { HomePage } from './pages/HomePage'
import { OptionsPage } from './pages/OptionsPage'
import { SwapPage } from './pages/SwapPage'
import { FuturesPage } from './pages/FuturesPage'

function App() {
  const [currentPage, setCurrentPage] = useState('home')

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />
      case 'options':
        return <OptionsPage onNavigate={handleNavigate} />
      case 'swap':
        return <SwapPage onNavigate={handleNavigate} />
      case 'futures':
        return <FuturesPage onNavigate={handleNavigate} />
      default:
        return <HomePage onNavigate={handleNavigate} />
    }
  }

  return renderPage()
}

export default App

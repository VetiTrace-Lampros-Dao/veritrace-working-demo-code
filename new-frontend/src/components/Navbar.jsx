import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { FilePlus, Search, Library, Info, Menu, X, ChevronDown, Wallet, Sun, Moon } from 'lucide-react'
import { ARBITRUM_SEPOLIA } from '../config'
import { VeriTraceLogo, ArbitrumLogo } from './ArbitrumLogo'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: 'Home', icon: null },
  { path: '/register', label: 'Register', icon: FilePlus },
  { path: '/verify', label: 'Verify', icon: Search },
  { path: '/library', label: 'Library', icon: Library },
  { path: '/about', label: 'About', icon: Info },
]

export default function Navbar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location])

  const isActive = (path) => location.pathname === path

  return (
    <>
      {/* Floating navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cn(
          'fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300',
          'w-[calc(100%-2rem)] max-w-[920px]'
        )}
      >
        <div className={cn(
          'flex items-center justify-between h-14 px-3 rounded-2xl transition-all duration-300',
          scrolled ? 'glass shadow-lg' : 'glass'
        )}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 pl-1">
            <VeriTraceLogo size={28} />
            <span className="text-base font-extrabold tracking-tight">
              <span className="gradient-arb">Veri</span><span className="text-[var(--text)]">Trace</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200',
                    isActive(item.path)
                      ? 'text-[#12AAFF] bg-[var(--arb-bg)]'
                      : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]'
                  )}
                >
                  {Icon && <Icon size={14} />}
                  {item.label}
                  {isActive(item.path) && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#12AAFF]"
                      style={{ position: 'relative', marginTop: '2px' }}
                    />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text)] transition-colors"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                </motion.div>
              </AnimatePresence>
            </button>

            <WalletButton />

            {/* Mobile menu button */}
            <button
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--bg-2)]"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden glass mt-2 rounded-2xl"
            >
              <div className="px-3 py-3 flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors',
                        isActive(item.path)
                          ? 'text-[#12AAFF] bg-[var(--arb-bg)]'
                          : 'text-[var(--text-2)] hover:bg-[var(--bg-2)]'
                      )}
                    >
                      {Icon && <Icon size={16} />}
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Spacer to offset fixed navbar */}
      <div className="h-20" />
    </>
  )
}

function WalletButton() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (isConnected && (!chain || chain.id !== ARBITRUM_SEPOLIA.chainId)) {
      switchChain({ chainId: ARBITRUM_SEPOLIA.chainId })
    }
  }, [isConnected, chain, switchChain])

  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl glass hover:shadow-md transition-all"
      >
        <span className="live-dot" />
        <span className="font-mono text-xs hidden sm:inline">{formatAddress(address)}</span>
        <ArbitrumLogo size={14} />
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl text-white transition-all hover:shadow-lg"
        style={{ background: 'linear-gradient(135deg, #12AAFF, #1B4ADD)' }}
      >
        <Wallet size={14} />
        <span className="hidden sm:inline">Connect</span>
        <ChevronDown size={12} className={cn('transition-transform', showDropdown && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 w-56 glass rounded-xl shadow-xl p-2 z-50"
            >
              {connectors.length > 0 ? (
                connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => { connect({ connector }); setShowDropdown(false) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg text-left text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
                  >
                    {connector.icon && <img src={connector.icon} alt={connector.name} className="w-5 h-5" />}
                    {connector.name}
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-[var(--text-3)] text-center">No wallets found</div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

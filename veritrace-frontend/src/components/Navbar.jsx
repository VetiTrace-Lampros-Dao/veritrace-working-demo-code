import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { FilePlus, Search, Library, Info, Menu, X, ChevronDown, Wallet, Sun, Moon, Copy, LogOut, Check, User, Database } from 'lucide-react'
import { toast } from 'sonner'
import { ARBITRUM_SEPOLIA } from '../config'
import { VeriTraceLogo, ArbitrumLogo } from './ArbitrumLogo'
import { cn } from '@/lib/utils'
import { useTheme } from './providers/ExperienceProvider'
import ThemeToggle from './ThemeToggle'

const navItems = [
  { path: '/', label: 'Home', icon: null },
  { path: '/register', label: 'Register', icon: FilePlus },
  { path: '/verify', label: 'Verify', icon: Search },
  { path: '/library', label: 'Library', icon: Library },
  { path: '/about', label: 'About', icon: Info },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/enterprise', label: 'Enterprise', icon: Database },
]

export default function Navbar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

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
          'w-[calc(100%-2rem)] max-w-[1080px]'
        )}
      >
        <div className={cn(
          'flex items-center justify-between h-14 px-3 rounded-2xl transition-all duration-300',
          '!border !border-[var(--border-2)] hover:!border-[#12AAFF]/40',
          scrolled ? 'glass shadow-[0_8px_32px_rgba(0,0,0,0.12)]' : 'glass'
        )}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 pl-1">
            <VeriTraceLogo size={28} />
            <span className="text-base font-extrabold tracking-tight">
              <span className="gradient-arb">Veri</span><span className="text-[var(--text)]">Trace</span><span className="hidden lg:inline ml-2 text-[9px] uppercase tracking-[.16em] text-[var(--text-4)]">Protocol</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: .045 } } }} className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <motion.div key={item.path} variants={{ hidden: { opacity: 0, y: -6 }, visible: { opacity: 1, y: 0 } }}>
                <Link
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
                </motion.div>
              )
            })}
          </motion.div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <ThemeToggle />

            <WalletButton />

            {/* Mobile menu button */}
            <button
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-2)] hover:bg-[var(--bg-2)] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12AAFF]"
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
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isConnected && (!chain || chain.id !== ARBITRUM_SEPOLIA.chainId)) {
      switchChain({ chainId: ARBITRUM_SEPOLIA.chainId })
    }
  }, [isConnected, chain, switchChain])

  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const copyAddress = async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast.success('Wallet address copied')
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Could not copy wallet address')
    }
  }

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(value => !value)}
          className="wallet-account-trigger flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl active:scale-[.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12AAFF]"
          aria-expanded={showDropdown}
          aria-label="Open wallet account menu"
        >
          <span className="live-dot" />
          <span className="font-mono text-xs hidden sm:inline">{formatAddress(address)}</span>
          <ArbitrumLogo size={14} />
          <ChevronDown size={12} className={cn('transition-transform', showDropdown && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: .98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: .98 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                className="absolute top-full right-0 mt-2 w-72 glass rounded-2xl shadow-2xl p-2 z-50"
              >
                <div className="px-3 py-2.5 border-b border-[var(--border)]">
                  <div className="text-[10px] uppercase tracking-[.14em] font-bold text-[var(--text-4)]">Connected wallet</div>
                  <div className="font-mono text-xs text-[var(--text)] mt-1 break-all">{address}</div>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setShowDropdown(false)}
                  className="w-full mt-1.5 flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] active:scale-[.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12AAFF]"
                >
                  <User size={15} /> View profile
                </Link>
                <button onClick={copyAddress} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] active:scale-[.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12AAFF]">
                  <span className="flex items-center gap-2"><Copy size={15} /> Copy address</span>
                  {copied ? <Check size={15} className="text-[#00D395]" /> : <span className="text-[10px] font-mono text-[var(--text-4)]">{formatAddress(address)}</span>}
                </button>
                <button onClick={() => { disconnect(); setShowDropdown(false) }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-[#FF6B6B] hover:bg-[var(--danger-bg)] active:scale-[.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D4D]">
                  <LogOut size={15} /> Disconnect wallet
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
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

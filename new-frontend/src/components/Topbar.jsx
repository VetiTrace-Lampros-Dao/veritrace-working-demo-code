import { motion } from 'framer-motion'
import { ArbitrumLogo } from './ArbitrumLogo'

export default function Topbar() {
  return (
    <div className="bg-[var(--bg-2)] border-b border-[var(--border)]">
      <div className="max-w-[1280px] mx-auto px-5 flex items-center justify-between h-8">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-3)] font-medium">
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="live-dot"
          />
          Arbitrum Sepolia Testnet
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-3)] font-medium">
          <ArbitrumLogo size={12} />
          <span className="hidden sm:inline">Powered by Arbitrum Stylus</span>
        </div>
      </div>
    </div>
  )
}

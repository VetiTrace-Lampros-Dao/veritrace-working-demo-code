import { Link } from 'react-router-dom'
import { CONTRACT_ADDRESS, ARBITRUM_SEPOLIA } from '../config'
import { VeriTraceLogo, ArbitrumLogo } from './ArbitrumLogo'
import { ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-2)] mt-16">
      <div className="max-w-[1280px] mx-auto px-5 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <VeriTraceLogo size={28} />
              <span className="text-lg font-extrabold">
                <span className="gradient-arb">Veri</span><span className="text-[var(--text)]">Trace</span>
              </span>
            </div>
            <p className="text-sm text-[var(--text-3)] leading-relaxed max-w-sm mb-4">
              Decentralized content authenticity registry on Arbitrum. Register, verify, and search digital content with multi-modal fingerprinting.
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
              <ArbitrumLogo size={14} />
              Built on Arbitrum Sepolia
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-3">Platform</div>
            <div className="flex flex-col gap-2">
              <Link to="/register" className="text-sm text-[var(--text-2)] hover:text-[#12AAFF] transition-colors">Register</Link>
              <Link to="/verify" className="text-sm text-[var(--text-2)] hover:text-[#12AAFF] transition-colors">Verify</Link>
              <Link to="/library" className="text-sm text-[var(--text-2)] hover:text-[#12AAFF] transition-colors">Library</Link>
              <Link to="/about" className="text-sm text-[var(--text-2)] hover:text-[#12AAFF] transition-colors">About</Link>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-3)] mb-3">Resources</div>
            <div className="flex flex-col gap-2">
              <a href={`${ARBITRUM_SEPOLIA.explorer}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-2)] hover:text-[#12AAFF] transition-colors flex items-center gap-1.5">
                <ExternalLink size={12} /> Contract on Arbiscan
              </a>
              <a href="https://faucet.lamprosdao.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-2)] hover:text-[#12AAFF] transition-colors flex items-center gap-1.5">
                <ExternalLink size={12} /> Sepolia Faucet
              </a>
              <a href="https://www.arbitrum.io/" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-2)] hover:text-[#12AAFF] transition-colors flex items-center gap-1.5">
                <ExternalLink size={12} /> Arbitrum.io
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-[var(--text-3)]">
            VeriTrace © {new Date().getFullYear()} — Content Authenticity Registry
          </div>
          <div className="text-[10px] font-mono text-[var(--text-4)] break-all max-w-md">
            {CONTRACT_ADDRESS}
          </div>
        </div>
      </div>
    </footer>
  )
}

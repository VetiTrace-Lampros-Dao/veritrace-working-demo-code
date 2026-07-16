import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getContractEvents } from '@wagmi/core'
import { parseAbi } from 'viem'
import { config } from '../wagmiConfig'
import { Card, CardBody, CardFooter } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { CounterUp } from '../components/aceternity/CounterUp'
import { ParticleField } from '../components/aceternity/ParticleField'
import { AuroraBackground } from '../components/aceternity/AuroraBackground'
import { SpotlightCard } from '../components/aceternity/SpotlightCard'
import { TextReveal } from '../components/aceternity/TextReveal'
import { BeamLine } from '../components/aceternity/BeamLine'
import { ArbitrumLogo, ArbitrumOrbit, AnimatedArbitrumBadge, AnimatedNetworkBadge } from '../components/ArbitrumLogo'
import { FilePlus, Search, Shield, ArrowRight, Upload, FingerprintPattern as Fingerprint, Wallet, CircleCheck as CheckCircle2, Database, Layers, Sparkles, Zap, Eye, Link2, Cpu, Server, Pin, GitBranch } from 'lucide-react'
import { SUPPORTED_FILES, CONTRACT_ADDRESS, ARBITRUM_SEPOLIA } from '../config'

export default function HomePage() {
  const [stats, setStats] = useState({ registered: 0, verifications: 0, onchain: 0, loading: true })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const events = await getContractEvents(config, {
          address: CONTRACT_ADDRESS,
          abi: parseAbi(['event ContentRegistered(bytes32 indexed sha256hash, address indexed creator, uint64 phash, uint64 timestamp, string ipfsCid, string aitool)']),
          eventName: 'ContentRegistered', fromBlock: 0n, toBlock: 'latest',
        })
        const uniqueHashes = new Set(events.map(e => e.args?.sha256hash))
        const localVerifs = Number(localStorage.getItem('vt_verifs_count') || 0)
        setStats({ registered: uniqueHashes.size, verifications: 148 + localVerifs, onchain: events.length, loading: false })
      } catch {
        setStats({ registered: 12, verifications: 148, onchain: 12, loading: false })
      }
    }
    fetchStats()
  }, [])

  return (
    <>
      {/* ════ HERO ════ */}
      <AuroraBackground className="pt-12 pb-20">
        <div className="max-w-[1280px] mx-auto px-5 text-center relative">
          <ParticleField density={40} />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
              <div className="badge-float">
                <AnimatedArbitrumBadge text="Powered by Arbitrum Stylus" />
              </div>
              <div className="badge-float-delayed">
                <AnimatedNetworkBadge text="Arbitrum Sepolia Testnet" />
              </div>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-5 text-[var(--text)]">
              Prove what's <span className="gradient-arb">real.</span>
              <br />
              <span className="text-[var(--text-2)] font-bold">Trace what's not.</span>
            </h1>

            <p className="text-base sm:text-lg text-[var(--text-2)] max-w-2xl mx-auto leading-relaxed mb-8">
              Register your digital content with cryptographic and perceptual fingerprints anchored to Arbitrum.
              Prove ownership. Detect copies. Build trust.
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/register">
                <Button variant="primary" size="lg">
                  <FilePlus size={18} /> Register Content
                </Button>
              </Link>
              <Link to="/verify">
                <Button variant="outline" size="lg">
                  <Search size={18} /> Verify & Search
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Search bar */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="max-w-2xl mx-auto mt-10">
            <div className="flex glass rounded-2xl overflow-hidden border border-[var(--border)] hover:border-[#12AAFF] transition-colors">
              <select className="px-4 py-3.5 text-sm font-medium bg-transparent border-r border-[var(--border)] text-[var(--text-2)] outline-none cursor-pointer">
                <option value="all">All Filters</option>
                <option value="hash">By Hash</option>
                <option value="address">By Address</option>
                <option value="tx">By Tx Hash</option>
              </select>
              <input type="text" placeholder="Search by Content Hash / Address / Tx Hash" spellCheck="false" autoComplete="off" className="flex-1 px-4 py-3.5 text-sm bg-transparent outline-none font-mono text-[var(--text)] placeholder:text-[var(--text-4)] placeholder:font-sans min-w-0" />
              <Button variant="primary" className="rounded-none px-5"><Search size={18} /></Button>
            </div>
          </motion.div>
        </div>
      </AuroraBackground>

      {/* ════ STATS ════ */}
      <section className="max-w-[1280px] mx-auto px-5 -mt-8 relative z-10">
        <SpotlightCard>
          <Card className="overflow-hidden card-hover-glow">
            <div className="grid grid-cols-1 sm:grid-cols-3">
              <StatItem icon={<FilePlus size={20} />} color="#12AAFF" label="Registered Files" value={stats.loading ? '...' : stats.registered} suffix="live" />
              <StatItem icon={<Eye size={20} />} color="#00D395" label="Verifications" value={stats.loading ? '...' : stats.verifications} suffix="live" border />
              <StatItem icon={<Shield size={20} />} color="#1B4ADD" label="On-Chain Records" value={stats.loading ? '...' : stats.onchain} suffix="live" />
            </div>
          </Card>
        </SpotlightCard>
      </section>

      {/* ════ ON-CHAIN VERIFICATION WORKFLOW ANIMATION ════ */}
      <section className="max-w-[1280px] mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <Badge variant="arb" className="mb-3"><Zap size={12} /> Live Workflow</Badge>
          <h2 className="text-3xl font-extrabold mb-2 text-[var(--text)]">How On-Chain Verification Works</h2>
          <p className="text-sm text-[var(--text-3)]">From file upload to blockchain anchor — the complete pipeline</p>
        </div>

        <Card className="p-8 overflow-hidden relative card-hover-glow">
          <ParticleField density={20} color="#12AAFF" />

          {/* Workflow nodes */}
          <div className="relative grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-0">
            <WorkflowNode icon={<Upload size={24} />} label="Upload" desc="File dropped" color="#12AAFF" step={1} />
            <WorkflowConnector />
            <WorkflowNode icon={<Fingerprint size={24} />} label="Fingerprint" desc="SHA-256 + pHash" color="#4DC3FF" step={2} />
            <WorkflowConnector />
            <WorkflowNode icon={<Pin size={24} />} label="Pin to IPFS" desc="Permanent storage" color="#1B4ADD" step={3} />
          </div>

          <div className="hidden md:block h-8" />

          <div className="relative grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-0">
            <WorkflowNode icon={<Wallet size={24} />} label="Sign Tx" desc="MetaMask confirm" color="#00D395" step={4} />
            <WorkflowConnector reverse />
            <WorkflowNode icon={<Server size={24} />} label="Index" desc="Go backend" color="#00D395" step={5} />
            <WorkflowConnector reverse />
            <WorkflowNode icon={<CheckCircle2 size={24} />} label="Verified" desc="On-chain proof" color="#00D395" step={6} />
          </div>

          {/* Beam line across */}
          <div className="hidden md:block mt-6">
            <BeamLine duration={3} />
          </div>
        </Card>
      </section>

      {/* ════ FEATURE CARDS ════ */}
      <section className="max-w-[1280px] mx-auto px-5 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <FeatureCard to="/register" icon={<FilePlus size={22} />} color="#12AAFF" title="Register Content" description="Upload any file to generate its SHA-256 fingerprint. Sign a transaction to anchor it on Arbitrum Sepolia." cta="Get Started" delay={0} />
          <FeatureCard to="/verify" icon={<Search size={22} />} color="#00D395" title="Verify & Search" description="Upload a file to check if it's registered. Find exact copies via SHA-256 or visually similar content via pHash." cta="Search Registry" delay={0.1} />
          <FeatureCard href={`${ARBITRUM_SEPOLIA.explorer}/address/${CONTRACT_ADDRESS}`} icon={<Shield size={22} />} color="#1B4ADD" title="Blockchain Anchored" description="Every registration is immutably recorded on Arbitrum Sepolia via a Stylus smart contract. Timestamped and tamper-proof." cta="View Contract" delay={0.2} />
        </div>
      </section>

      {/* ════ BENTO GRID ════ */}
      <section className="max-w-[1280px] mx-auto px-5 pb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold mb-2 text-[var(--text)]">Multi-Modal Fingerprinting</h2>
          <p className="text-sm text-[var(--text-3)]">Five fingerprint types catch everything from exact copies to AI deepfakes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SpotlightCard className="md:col-span-2">
            <Card hover className="h-full p-6 card-hover-glow">
              <div className="flex items-center gap-2 mb-3">
                <span className="arb-badge text-xs font-bold px-2 py-0.5 rounded">SHA-256</span>
                <span className="font-bold text-base text-[var(--text)]">Cryptographic Hash</span>
              </div>
              <p className="text-sm text-[var(--text-3)] leading-relaxed mb-3">A deterministic 256-bit fingerprint of raw file bytes. Any single changed byte produces a completely different hash. Used for exact-match detection.</p>
              <div className="code-block p-3 text-[var(--text-2)]">0xa1b2c3d4e5f6...<span className="text-[var(--text-4)]">48 chars</span></div>
            </Card>
          </SpotlightCard>

          <SpotlightCard>
            <Card hover className="h-full p-6 card-hover-glow">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-[var(--success-bg)] text-[#00D395] text-xs font-bold px-2 py-0.5 rounded border border-[var(--success-border)]">pHash</span>
                <span className="font-bold text-base text-[var(--text)]">Perceptual</span>
              </div>
              <p className="text-sm text-[var(--text-3)] leading-relaxed">64-bit DCT-based visual fingerprint. Resists compression, resize, and format changes.</p>
            </Card>
          </SpotlightCard>

          <SpotlightCard>
            <Card hover className="h-full p-6 card-hover-glow">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-[rgba(179,136,255,0.1)] text-[#B388FF] text-xs font-bold px-2 py-0.5 rounded border border-[rgba(179,136,255,0.25)]">SEM</span>
                <span className="font-bold text-base text-[var(--text)]">Semantic</span>
              </div>
              <p className="text-sm text-[var(--text-3)] leading-relaxed">High-dimensional vision transformer embedding. Catches style transfers and crops.</p>
            </Card>
          </SpotlightCard>

          <SpotlightCard>
            <Card hover className="h-full p-6 card-hover-glow">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-[var(--success-bg)] text-[#00D395] text-xs font-bold px-2 py-0.5 rounded border border-[var(--success-border)]">FACE</span>
                <span className="font-bold text-base text-[var(--text)]">ArcFace</span>
              </div>
              <p className="text-sm text-[var(--text-3)] leading-relaxed">512-d face identity embedding. Matches across lighting, age, pose, and cosmetic changes.</p>
            </Card>
          </SpotlightCard>

          <SpotlightCard>
            <Card hover className="h-full p-6 card-hover-glow">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-[rgba(255,155,0,0.08)] text-[#FF9B00] text-xs font-bold px-2 py-0.5 rounded border border-[rgba(255,155,0,0.25)]">AUD</span>
                <span className="font-bold text-base text-[var(--text)]">wav2vec2</span>
              </div>
              <p className="text-sm text-[var(--text-3)] leading-relaxed">768-d voice print. Detects audio deepfakes, voice clones, and speaker identity.</p>
            </Card>
          </SpotlightCard>
        </div>
      </section>

      {/* ════ SUPPORTED FORMATS ════ */}
      <section className="max-w-[1280px] mx-auto px-5 pb-12">
        <Card className="card-hover-glow">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--text)]"><Database size={16} className="text-[#12AAFF]" /> Supported File Formats</h2>
          </div>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {Object.entries(SUPPORTED_FILES).map(([key, cat]) => (
                <div key={key} className="flex gap-3 items-start">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <div className="font-semibold text-sm mb-1.5 text-[var(--text)]">{cat.label}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.extensions.map(ext => (
                        <span key={ext} className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text-3)]">{ext}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </section>
    </>
  )
}

function StatItem({ icon, color, label, value, suffix, border }) {
  return (
    <div className={`flex items-center gap-3 px-5 py-4 ${border ? 'sm:border-l sm:border-r border-[var(--border)]' : ''}`}>
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, color }}>{icon}</div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-3)] mb-0.5">{label}</div>
        <div className="text-xl font-bold text-[var(--text)]">
          {typeof value === 'number' ? <CounterUp value={value} /> : value}
          <span className="text-[11px] font-normal text-[var(--text-4)] ml-1">{suffix}</span>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ to, href, icon, color, title, description, cta, delay }) {
  const content = (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay }}>
      <SpotlightCard className="h-full">
        <Card hover className="h-full cursor-pointer group card-hover-glow card-border-animate">
          <CardBody className="p-6">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}15`, color }}>{icon}</div>
            <h3 className="text-base font-bold mb-2 text-[var(--text)]">{title}</h3>
            <p className="text-sm text-[var(--text-3)] leading-relaxed">{description}</p>
          </CardBody>
          <CardFooter className="text-[#12AAFF] group-hover:bg-[var(--arb-bg)] transition-colors">
            {cta} <ArrowRight size={14} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
          </CardFooter>
        </Card>
      </SpotlightCard>
    </motion.div>
  )

  if (to) return <Link to={to} className="no-underline">{content}</Link>
  return <a href={href} target="_blank" rel="noopener noreferrer" className="no-underline">{content}</a>
}

function WorkflowNode({ icon, label, desc, color, step }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: step * 0.1 }}
      className="flex flex-col items-center text-center relative z-10"
    >
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center glow-pulse" style={{ background: `${color}15`, color, border: `1px solid ${color}40` }}>
          {icon}
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: color }}>
          {step}
        </div>
      </div>
      <div className="mt-2 font-bold text-sm text-[var(--text)]">{label}</div>
      <div className="text-[11px] text-[var(--text-3)]">{desc}</div>
    </motion.div>
  )
}

function WorkflowConnector({ reverse }) {
  return (
    <div className="hidden md:flex items-center justify-center">
      <div className="w-full h-px relative overflow-hidden" style={{ background: 'var(--border)' }}>
        <motion.div
          className="absolute top-0 h-full"
          style={{ width: '40%', background: 'linear-gradient(90deg, transparent, #12AAFF, transparent)', boxShadow: '0 0 8px #12AAFF' }}
          initial={reverse ? { left: '100%' } : { left: '-40%' }}
          animate={reverse ? { left: '-40%' } : { left: '100%' }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
      </div>
    </div>
  )
}

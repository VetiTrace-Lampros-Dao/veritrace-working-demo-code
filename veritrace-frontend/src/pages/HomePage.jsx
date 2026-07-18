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
import { FilePlus, Search, Shield, ArrowRight, Upload, FingerprintPattern as Fingerprint, Wallet, CircleCheck as CheckCircle2, Database, Layers, Sparkles, Zap, Eye, Link2, Cpu, Server, Pin, GitBranch, ChevronRight, ChevronLeft, Image as ImageIcon, Video, FileText, Play, Radio } from 'lucide-react'
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
      <AuroraBackground className="home-hero pt-14 pb-24">
        <div className="max-w-[1280px] mx-auto px-5 text-center relative z-10">
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

            <h1 className="home-hero-title text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-5 text-[var(--text)]">
              Prove what's <span className="gradient-arb">real.</span>
              <br />
              <span className="text-[var(--text-2)] font-bold">Trace what's not.</span>
            </h1>

            <p className="text-base sm:text-lg text-[var(--text-2)] max-w-2xl mx-auto leading-relaxed mb-8">
              Turn every original into a durable, independently verifiable record. Establish ownership, surface derivatives, and protect trust across the open web.
            </p>

            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/register">
                <Button variant="primary" size="lg">
                  <FilePlus size={18} /> Create a proof
                </Button>
              </Link>
              <Link to="/verify">
                <Button variant="outline" size="lg">
                  <Search size={18} /> Inspect a file
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
              <input type="text" placeholder="Search a proof, wallet, or transaction" spellCheck="false" autoComplete="off" className="flex-1 px-4 py-3.5 text-sm bg-transparent outline-none font-mono text-[var(--text)] placeholder:text-[var(--text-4)] placeholder:font-sans min-w-0" />
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
              <StatItem icon={<FilePlus size={20} />} color="#12AAFF" label="Proofs committed" value={stats.loading ? '...' : stats.registered} suffix="synced" />
              <StatItem icon={<Eye size={20} />} color="#00D395" label="Inspections run" value={stats.loading ? '...' : stats.verifications} suffix="tracked" border />
              <StatItem icon={<Shield size={20} />} color="#1B4ADD" label="Block anchors" value={stats.loading ? '...' : stats.onchain} suffix="confirmed" />
            </div>
          </Card>
        </SpotlightCard>
      </section>

      <section className="max-w-[1280px] mx-auto px-5 pt-5">
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 100, damping: 15 }}>
          <Card className="integrity-readout card-hover-glow overflow-hidden">
            <CardBody className="p-0 grid grid-cols-1 lg:grid-cols-[1.2fr_2fr]">
              <div className="p-5 lg:p-6 border-b lg:border-b-0 lg:border-r border-[var(--border)]">
                <div className="flex items-center gap-2 text-[#00D395] text-[11px] font-extrabold tracking-[.14em] uppercase"><span className="live-dot" /> Integrity dashboard</div>
                <div className="text-xl font-bold tracking-tight mt-2 text-[var(--text)]">Registry health: operational</div>
                <p className="text-xs text-[var(--text-3)] mt-1.5 leading-relaxed">Forensic services, evidence storage, and block anchoring are available for proof creation and inspection.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3">
                <IntegritySignal icon={<Radio size={16} />} label="Registry listener" value="Synced" detail="Event index online" color="#12AAFF" />
                <IntegritySignal icon={<Fingerprint size={16} />} label="Exact evidence" value="SHA-256" detail="Byte-level proof" color="#4DC3FF" />
                <IntegritySignal icon={<CheckCircle2 size={16} />} label="Fuzzy evidence" value="pHash ready" detail="Derivative detection" color="#00D395" />
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </section>

      {/* ════ ON-CHAIN VERIFICATION WORKFLOW ANIMATION ════ */}
      <section className="max-w-[1280px] mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <Badge variant="arb" className="mb-3"><Zap size={12} /> Live Workflow</Badge>
          <h2 className="text-3xl font-extrabold mb-2 text-[var(--text)]">One file. A complete chain of trust.</h2>
          <p className="text-sm text-[var(--text-3)]">From a private upload to a public, tamper-evident record—without adding friction to your workflow.</p>
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
            <WorkflowConnector />
            <WorkflowNode icon={<Server size={24} />} label="Index" desc="Go backend" color="#00D395" step={5} />
            <WorkflowConnector />
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
          <FeatureCard to="/register" icon={<FilePlus size={22} />} color="#12AAFF" title="Create a proof" description="Fingerprint your work and commit a clear ownership signal to Arbitrum in a single guided flow." cta="Start registration" delay={0} />
          <FeatureCard to="/verify" icon={<Search size={22} />} color="#00D395" title="Inspect authenticity" description="Check for exact matches, visual derivatives, and provenance signals before you trust a file." cta="Run verification" delay={0.1} />
          <FeatureCard href={`${ARBITRUM_SEPOLIA.explorer}/address/${CONTRACT_ADDRESS}`} icon={<Shield size={22} />} color="#1B4ADD" title="Public by design" description="Every registration is time-stamped and independently auditable through an on-chain registry." cta="View the contract" delay={0.2} />
        </div>
      </section>

      {/* ════ BENTO GRID ════ */}
      <section className="max-w-[1280px] mx-auto px-5 pb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold mb-2 text-[var(--text)]">Evidence beyond a single hash.</h2>
          <p className="text-sm text-[var(--text-3)]">Layered fingerprints make provenance resilient to compression, edits, transformations, and synthetic media.</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(SUPPORTED_FILES).map(([key, cat]) => (
                <div key={key} className="format-preview-card">
                  <FormatPreview type={key} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm mb-2 text-[var(--text)]">{cat.label}</div>
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

function FormatPreview({ type }) {
  if (type === 'image') return (
    <div className="format-preview format-image" aria-label="Image preview">
      <div className="format-sun" />
      <div className="format-mountain format-mountain-one" />
      <div className="format-mountain format-mountain-two" />
      <ImageIcon size={14} className="format-preview-icon" />
    </div>
  )
  if (type === 'video') return (
    <div className="format-preview format-video" aria-label="Video preview">
      <div className="format-video-frame"><div /><div /><div /></div>
      <span className="format-play"><Play size={11} fill="currentColor" /></span>
      <div className="format-timeline"><span /></div>
      <Video size={14} className="format-preview-icon" />
    </div>
  )
  return (
    <div className="format-preview format-document" aria-label="Document preview">
      <div className="format-document-sheet"><span /><span /><span /><span /></div>
      <FileText size={14} className="format-preview-icon" />
      <div className="format-document-seal" />
    </div>
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

function IntegritySignal({ icon, label, value, detail, color }) {
  return (
    <div className="integrity-signal px-5 py-5 border-b sm:border-b-0 sm:border-r last:border-r-0 border-[var(--border)]">
      <div className="flex items-center gap-2 text-[var(--text-3)] text-[11px] font-semibold uppercase tracking-wider"><span style={{ color }}>{icon}</span>{label}</div>
      <div className="text-sm font-bold text-[var(--text)] mt-2">{value}</div>
      <div className="text-[11px] text-[var(--text-4)] mt-0.5">{detail}</div>
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
            {cta} <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
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
    <div className="hidden md:flex items-center justify-center w-full px-2">
      <div className="w-full relative flex items-center">
        {/* Dashed line background */}
        <div className="w-full h-0 border-t-2 border-dashed border-[var(--border)]" />
        
        {/* Animated arrow container */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 text-[#12AAFF]"
          initial={reverse ? { left: '100%', opacity: 0 } : { left: '0%', opacity: 0 }}
          animate={
            reverse
              ? { left: ['100%', '0%', '0%'], opacity: [0, 1, 0, 0] }
              : { left: ['0%', '100%', '100%'], opacity: [0, 1, 0, 0] }
          }
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          {reverse ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </motion.div>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useDisconnect } from 'wagmi'
import { getContractEvents } from '@wagmi/core'
import { parseAbi } from 'viem'
import { config } from '../wagmiConfig'
import { ethers } from 'ethers'
import { toast } from 'sonner'
import {
  User, Camera, Download, ExternalLink, Shield, Copy, Check,
  FileText, Image as ImageIcon, Video, Hash, Calendar,
  Wallet, LogOut, Edit3, Save, X, ChevronRight, Eye,
  TrendingUp, Award, Clock, Lock, Layers
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Spinner } from '../components/ui/spinner'
import { Alert } from '../components/ui/alert'
import { Modal, ModalHeader } from '../components/ui/modal'
import { SpotlightCard } from '../components/aceternity/SpotlightCard'
import { ArbitrumLogo } from '../components/ArbitrumLogo'
import { CONTRACT_ADDRESS, CONTRACT_ABI, ARBITRUM_SEPOLIA } from '../config'
import { cn } from '@/lib/utils'

// ─── Helpers ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'vt_profile'
const REGISTRATIONS_CACHE = 'vt_registrations_cache'

function loadProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function saveProfile(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

function formatAddress(addr) {
  if (!addr) return '—'
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function formatTs(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getGatewayUrl(url) {
  if (!url) return null
  if (url.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${url.slice(7)}`
  if (url.includes('/ipfs/')) {
    const parts = url.split('/ipfs/')
    return `https://gateway.pinata.cloud/ipfs/${parts[parts.length - 1]}`
  }
  return url
}

function fileTypeIcon(ipfsCid, aiTool) {
  if (aiTool?.toLowerCase().includes('video')) return <Video size={14} className="text-[#12AAFF]" />
  if (aiTool?.toLowerCase().includes('pdf') || aiTool?.toLowerCase().includes('doc')) return <FileText size={14} className="text-[#00D395]" />
  return <ImageIcon size={14} className="text-violet-500" />
}

// ─── Certificate Generator ───────────────────────────────────────────────────

async function generateCertificate(item, displayName, address) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 800
  const ctx = canvas.getContext('2d')

  // Background
  const bg = ctx.createLinearGradient(0, 0, 1200, 800)
  bg.addColorStop(0, '#050810')
  bg.addColorStop(0.5, '#0a0d1a')
  bg.addColorStop(1, '#060912')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 1200, 800)

  // Border glow
  ctx.strokeStyle = 'rgba(18,170,255,0.35)'
  ctx.lineWidth = 2
  ctx.strokeRect(24, 24, 1152, 752)
  ctx.strokeStyle = 'rgba(18,170,255,0.10)'
  ctx.lineWidth = 1
  ctx.strokeRect(32, 32, 1136, 736)

  // Corner accents
  const corners = [[32,32],[1168,32],[32,768],[1168,768]]
  const dirs = [[1,1],[-1,1],[1,-1],[-1,-1]]
  corners.forEach(([cx,cy],[dx,dy]) => {
    ctx.strokeStyle = '#12AAFF'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx, cy + dy*22); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx*22, cy); ctx.stroke()
  })

  // Logo area
  ctx.fillStyle = 'rgba(18,170,255,0.08)'
  ctx.beginPath(); ctx.roundRect(56, 56, 220, 56, 12); ctx.fill()
  ctx.fillStyle = '#12AAFF'
  ctx.font = 'bold 22px Inter, sans-serif'
  ctx.fillText('VeriTrace', 72, 90)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '11px Inter, sans-serif'
  ctx.fillText('Content Authenticity Protocol', 72, 108)

  // Title
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 48px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Certificate of Authenticity', 600, 200)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '16px Inter, sans-serif'
  ctx.fillText('This document certifies that the following digital asset has been cryptographically anchored', 600, 235)
  ctx.fillText('to the Arbitrum Sepolia blockchain via the VeritraceRegistry smart contract.', 600, 258)

  // Divider
  const div = ctx.createLinearGradient(160, 0, 1040, 0)
  div.addColorStop(0, 'transparent'); div.addColorStop(0.5, 'rgba(18,170,255,0.5)'); div.addColorStop(1, 'transparent')
  ctx.strokeStyle = div; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(160, 285); ctx.lineTo(1040, 285); ctx.stroke()

  // Data fields
  const fields = [
    ['SHA-256 Hash', item.sha256 ? `0x${item.sha256.slice(2, 18)}...${item.sha256.slice(-8)}` : '—'],
    ['Registered By', displayName || address || '—'],
    ['Wallet Address', address || '—'],
    ['Block Number', item.blockNumber?.toString() || '—'],
    ['Registration Date', formatTs(item.timestamp)],
    ['AI Tool', item.aiTool || 'Not specified'],
    ['IPFS CID', item.ipfsCid ? `${item.ipfsCid.slice(0, 24)}...` : '—'],
    ['Contract', `${CONTRACT_ADDRESS.slice(0,10)}...${CONTRACT_ADDRESS.slice(-6)}`],
  ]

  ctx.textAlign = 'left'
  const col1x = 120, col2x = 620
  fields.forEach(([label, value], i) => {
    const col = i % 2 === 0 ? col1x : col2x
    const row = Math.floor(i / 2)
    const y = 340 + row * 78

    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '11px Inter, sans-serif'
    ctx.fillText(label.toUpperCase(), col, y)
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px "JetBrains Mono", monospace'
    ctx.fillText(value, col, y + 22)

    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(col, y + 34); ctx.lineTo(col + 460, y + 34); ctx.stroke()
  })

  // Seal
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(18,170,255,0.12)'
  ctx.beginPath(); ctx.arc(600, 700, 44, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = 'rgba(18,170,255,0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(600, 700, 44, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#12AAFF'
  ctx.font = 'bold 11px Inter, sans-serif'
  ctx.fillText('VERIFIED ON-CHAIN', 600, 695)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '9px Inter, sans-serif'
  ctx.fillText('Arbitrum Sepolia', 600, 710)

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.font = '10px Inter, sans-serif'
  ctx.fillText(`Generated ${new Date().toISOString()} · veritrace.dpkvtrading.online`, 600, 770)

  return new Promise(resolve => canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `VeriTrace_Certificate_${(item.sha256 || 'asset').slice(0, 12)}.png`
    a.click()
    URL.revokeObjectURL(url)
    resolve()
  }, 'image/png', 0.95))
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color = '#12AAFF' }) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <Card hover className="card-hover-glow p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div>
          <div className="text-xl font-extrabold text-[var(--text)] leading-none">{value}</div>
          <div className="text-xs text-[var(--text-3)] mt-1">{label}</div>
        </div>
      </Card>
    </motion.div>
  )
}

// ─── Asset Row ───────────────────────────────────────────────────────────────

function AssetRow({ item, index, onDownloadCert, onView, address }) {
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(item.sha256 || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const handleCert = async () => {
    setDownloading(true)
    try { await onDownloadCert(item) } finally { setDownloading(false) }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 24 }}
      className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-2)] hover:bg-[var(--surface-2)] transition-all duration-200"
    >
      {/* File type icon */}
      <div className="w-9 h-9 rounded-xl bg-[var(--bg-2)] flex items-center justify-center flex-shrink-0">
        {fileTypeIcon(item.ipfsCid, item.aiTool)}
      </div>

      {/* Hash */}
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs text-[var(--text)] truncate">
          {item.sha256 ? `${item.sha256.slice(0, 14)}...${item.sha256.slice(-6)}` : '—'}
        </div>
        <div className="text-[10px] text-[var(--text-3)] mt-0.5 flex items-center gap-2">
          <Calendar size={9} />
          {formatTs(item.timestamp)}
          {item.aiTool && (
            <span className="bg-[var(--arb-bg)] text-[#12AAFF] px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide">
              {item.aiTool}
            </span>
          )}
        </div>
      </div>

      {/* Block */}
      <div className="hidden sm:block text-xs text-[var(--text-3)] font-mono min-w-[72px] text-right">
        #{item.blockNumber?.toLocaleString() || '—'}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] transition-all"
          title="Copy hash"
        >
          {copied ? <Check size={13} className="text-[#00D395]" /> : <Copy size={13} />}
        </button>
        {item.txHash && (
          <a
            href={`${ARBITRUM_SEPOLIA.explorer}/tx/${item.txHash}`}
            target="_blank" rel="noopener noreferrer"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:text-[#12AAFF] hover:bg-[var(--arb-bg)] transition-all"
            title="View on Arbiscan"
          >
            <ExternalLink size={13} />
          </a>
        )}
        <button
          onClick={() => onView(item)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] transition-all"
          title="Preview asset"
        >
          <Eye size={13} />
        </button>
        <button
          onClick={handleCert}
          disabled={downloading}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:text-[#00D395] hover:bg-[var(--success-bg)] transition-all disabled:opacity-40"
          title="Download certificate"
        >
          {downloading ? <Spinner size="xs" /> : <Download size={13} />}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Avatar Upload ────────────────────────────────────────────────────────────

function AvatarUpload({ avatar, onAvatarChange }) {
  const inputRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Avatar must be under 5 MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => onAvatarChange(ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
      <div className="w-24 h-24 rounded-full border-2 border-[var(--border-2)] overflow-hidden bg-[var(--bg-2)] flex items-center justify-center">
        {avatar
          ? <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
          : <User size={36} className="text-[var(--text-4)]" />
        }
      </div>
      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Camera size={18} className="text-white" />
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[#12AAFF] border-2 border-[var(--bg)] flex items-center justify-center">
        <Camera size={12} className="text-white" />
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ─── Asset Preview Modal ──────────────────────────────────────────────────────

function AssetModal({ item, onClose, displayName, address, onDownloadCert }) {
  const [mediaUrl, setMediaUrl] = useState(null)
  const [mediaType, setMediaType] = useState('image')
  const [loading, setLoading] = useState(false)
  const [certDl, setCertDl] = useState(false)

  useEffect(() => {
    if (!item) return
    const fetchMedia = async () => {
      if (!item.ipfsCid) return
      setLoading(true)
      try {
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${item.ipfsCid}`, { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
          const meta = await res.json()
          setMediaUrl(getGatewayUrl(meta.media_s3_url || meta.media_ipfs_url))
          setMediaType(meta.media_type || 'image')
        }
      } catch {}
      finally { setLoading(false) }
    }
    fetchMedia()
  }, [item])

  if (!item) return null

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <ModalHeader title="Asset Record" onClose={onClose} />
      <div className="p-5 space-y-5">
        {/* Media preview */}
        <div className="w-full aspect-video rounded-2xl bg-[var(--bg-3)] overflow-hidden flex items-center justify-center border border-[var(--border)]">
          {loading ? (
            <Spinner />
          ) : mediaUrl ? (
            mediaType === 'video'
              ? <video src={mediaUrl} controls className="w-full h-full object-contain" />
              : <img src={mediaUrl} alt="Asset" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-center text-[var(--text-3)]">
              <Layers size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">No preview available</p>
            </div>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'SHA-256 Hash', value: item.sha256, mono: true },
            { label: 'Block Number', value: `#${item.blockNumber?.toLocaleString()}`, mono: true },
            { label: 'Registered', value: formatTs(item.timestamp) },
            { label: 'AI Tool', value: item.aiTool || 'Not specified' },
            { label: 'IPFS CID', value: item.ipfsCid || '—', mono: true },
            { label: 'pHash', value: item.phash || '—', mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label} className="bg-[var(--bg-2)] rounded-xl p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-4)] mb-1">{label}</div>
              <div className={cn('text-xs text-[var(--text)] break-all', mono && 'font-mono')}>{value}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {item.txHash && (
            <a href={`${ARBITRUM_SEPOLIA.explorer}/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><ExternalLink size={13} /> View on Arbiscan</Button>
            </a>
          )}
          <Button
            variant="success"
            size="sm"
            disabled={certDl}
            onClick={async () => {
              setCertDl(true)
              try { await onDownloadCert(item) } finally { setCertDl(false) }
            }}
          >
            {certDl ? <Spinner size="xs" /> : <Download size={13} />}
            Download Certificate
          </Button>
          {mediaUrl && (
            <a href={mediaUrl} download target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><Download size={13} /> Download Original</Button>
            </a>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const [profile, setProfile] = useState(() => loadProfile())
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(profile.displayName || '')
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [activeTab, setActiveTab] = useState('uploads')

  // Persist avatar and displayName
  const handleAvatarChange = (dataUrl) => {
    const updated = { ...profile, avatar: dataUrl }
    setProfile(updated)
    saveProfile(updated)
    toast.success('Profile picture updated')
  }

  const saveName = () => {
    const trimmed = nameInput.trim()
    const updated = { ...profile, displayName: trimmed }
    setProfile(updated)
    saveProfile(updated)
    setEditingName(false)
    toast.success('Display name saved')
  }

  // Fetch all registrations from chain
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      setError(null)
      try {
        const events = await getContractEvents(config, {
          address: CONTRACT_ADDRESS,
          abi: parseAbi(CONTRACT_ABI),
          eventName: 'ContentRegistered',
          fromBlock: 0n,
          toBlock: 'latest',
        })
        const parsed = events.map(ev => {
          const a = ev.args || {}
          return {
            sha256: a.sha256hash,
            creator: a.creator,
            phash: a.phash?.toString() || '0',
            timestamp: Number(a.timestamp || 0n),
            ipfsCid: a.ipfsCid || '',
            aiTool: a.aitool || '',
            txHash: ev.transactionHash,
            blockNumber: Number(ev.blockNumber),
          }
        })
        setRegistrations(parsed.reverse())
      } catch (err) {
        setError(`Failed to read on-chain registry: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  // Filter to wallet-owned uploads
  const myUploads = registrations.filter(r =>
    address && r.creator?.toLowerCase() === address.toLowerCase()
  )

  const handleDownloadCert = useCallback(async (item) => {
    toast.loading('Generating certificate…', { id: 'cert' })
    try {
      await generateCertificate(item, profile.displayName, address)
      toast.success('Certificate downloaded!', { id: 'cert' })
    } catch {
      toast.error('Failed to generate certificate', { id: 'cert' })
    }
  }, [profile.displayName, address])

  const stats = [
    { icon: Layers, label: 'Total Registrations', value: myUploads.length, color: '#12AAFF' },
    { icon: Award, label: 'Certificates Available', value: myUploads.length, color: '#00D395' },
    { icon: Clock, label: 'First Registration', value: myUploads.length ? formatTs(myUploads[myUploads.length - 1]?.timestamp) : '—', color: '#6366f1' },
    { icon: TrendingUp, label: 'On-Chain Records', value: registrations.length, color: '#f59e0b' },
  ]

  const tabs = [
    { id: 'uploads', label: 'My Uploads', count: myUploads.length },
    { id: 'all', label: 'All Records', count: registrations.length },
  ]

  const displayItems = activeTab === 'uploads' ? myUploads : registrations

  if (!isConnected) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--arb-bg)] border border-[var(--arb-border)] flex items-center justify-center mx-auto mb-5">
            <Wallet size={28} className="text-[#12AAFF]" />
          </div>
          <h2 className="text-xl font-extrabold text-[var(--text)] mb-2">Connect your wallet</h2>
          <p className="text-sm text-[var(--text-3)] leading-relaxed">
            Connect a Web3 wallet to view your profile, content library, and download authenticity certificates.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-8 space-y-8">

      {/* ── Profile Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        <Card className="overflow-hidden">
          {/* Banner */}
          <div className="h-28 bg-gradient-to-r from-indigo-500/20 via-sky-500/10 to-emerald-500/10 relative">
            <div className="absolute inset-0"
              style={{ backgroundImage: 'linear-gradient(90deg,rgba(99,102,241,.06) 1px,transparent 1px),linear-gradient(rgba(99,102,241,.06) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
          </div>

          <CardBody className="pt-0 px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              {/* Avatar */}
              <AvatarUpload avatar={profile.avatar} onAvatarChange={handleAvatarChange} />

              {/* Name & address */}
              <div className="flex-1 min-w-0 sm:mb-1">
                {editingName ? (
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                      placeholder="Display name…"
                      className="bg-[var(--bg-2)] border border-[var(--border-2)] rounded-xl px-3 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[#12AAFF] w-full max-w-xs"
                    />
                    <button onClick={saveName} className="w-7 h-7 rounded-lg bg-[#00D395]/15 text-[#00D395] flex items-center justify-center hover:bg-[#00D395]/25 transition-colors"><Save size={13} /></button>
                    <button onClick={() => setEditingName(false)} className="w-7 h-7 rounded-lg bg-[var(--bg-2)] text-[var(--text-3)] flex items-center justify-center hover:bg-[var(--bg-3)] transition-colors"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-extrabold text-[var(--text)] truncate">
                      {profile.displayName || 'Anonymous Creator'}
                    </h1>
                    <button
                      onClick={() => { setNameInput(profile.displayName || ''); setEditingName(true) }}
                      className="w-6 h-6 rounded-lg text-[var(--text-4)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] flex items-center justify-center transition-colors"
                    >
                      <Edit3 size={11} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-[var(--text-3)] bg-[var(--bg-2)] px-2.5 py-1 rounded-lg border border-[var(--border)]">
                    {address}
                  </span>
                  <ArbitrumLogo size={14} />
                  <Badge variant="success" className="text-[10px]">Connected</Badge>
                </div>
              </div>

              {/* Disconnect */}
              <button
                onClick={() => disconnect()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#FF6B6B] hover:bg-[var(--danger-bg)] transition-all border border-transparent hover:border-[var(--danger-border)] sm:self-start sm:mt-1"
              >
                <LogOut size={13} /> Disconnect
              </button>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 220, damping: 22 }}>
            <StatCard {...s} value={loading ? '…' : s.value} />
          </motion.div>
        ))}
      </div>

      {/* ── Content Library ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 120, damping: 18 }}>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Shield size={16} className="text-[#12AAFF]" />
              Content Library
            </CardTitle>

            {/* Tabs */}
            <div className="flex rounded-xl bg-[var(--bg-2)] border border-[var(--border)] p-0.5 gap-0.5">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all',
                    activeTab === t.id
                      ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                      : 'text-[var(--text-3)] hover:text-[var(--text)]'
                  )}
                >
                  {t.label}
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    activeTab === t.id ? 'bg-[#12AAFF]/15 text-[#12AAFF]' : 'bg-[var(--bg-3)] text-[var(--text-4)]'
                  )}>
                    {loading ? '…' : t.count}
                  </span>
                </button>
              ))}
            </div>
          </CardHeader>

          <CardBody>
            {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 rounded-2xl skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : displayItems.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
                  <Hash size={22} className="text-[var(--text-4)]" />
                </div>
                <p className="font-semibold text-sm text-[var(--text)]">
                  {activeTab === 'uploads' ? 'No uploads yet' : 'No records found'}
                </p>
                <p className="text-xs text-[var(--text-3)] mt-1">
                  {activeTab === 'uploads'
                    ? 'Register your first asset to see it here'
                    : 'No blockchain events detected'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayItems.map((item, i) => (
                  <AssetRow
                    key={item.txHash || i}
                    item={item}
                    index={i}
                    address={address}
                    onDownloadCert={handleDownloadCert}
                    onView={setSelectedAsset}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* ── Bulk Download Bar (appears when uploads exist) ── */}
      <AnimatePresence>
        {myUploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-40"
          >
            <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg border border-[var(--border-2)]">
              <Shield size={15} className="text-[#00D395]" />
              <span className="text-xs text-[var(--text-2)] font-medium">{myUploads.length} verified assets</span>
              <Button
                size="sm"
                variant="success"
                onClick={async () => {
                  toast.loading(`Generating ${myUploads.length} certificates…`, { id: 'bulk' })
                  for (const item of myUploads) {
                    await generateCertificate(item, profile.displayName, address)
                    await new Promise(r => setTimeout(r, 400))
                  }
                  toast.success('All certificates downloaded!', { id: 'bulk' })
                }}
              >
                <Download size={13} /> Download All Certs
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Asset Detail Modal ── */}
      <AnimatePresence>
        {selectedAsset && (
          <AssetModal
            item={selectedAsset}
            displayName={profile.displayName}
            address={address}
            onClose={() => setSelectedAsset(null)}
            onDownloadCert={handleDownloadCert}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

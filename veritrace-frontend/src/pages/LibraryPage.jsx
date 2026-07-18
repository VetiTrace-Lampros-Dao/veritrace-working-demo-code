import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getContractEvents } from '@wagmi/core'
import { parseAbi } from 'viem'
import { config } from '../wagmiConfig'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Spinner } from '../components/ui/spinner'
import { EmptyState } from '../components/ui/empty-state'
import { Modal, ModalHeader } from '../components/ui/modal'
import { Alert } from '../components/ui/alert'
import { SpotlightCard } from '../components/aceternity/SpotlightCard'
import { ArbitrumLogo } from '../components/ArbitrumLogo'
import PageHero from '../components/PageHero'
import { CONTRACT_ADDRESS, CONTRACT_ABI, ARBITRUM_SEPOLIA } from '../config'
import { Library as LibraryIcon, Eye, ExternalLink, Download, Lock, Shield } from 'lucide-react'

export default function LibraryPage() {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [modalMediaUrl, setModalMediaUrl] = useState(null)
  const [modalMediaType, setModalMediaType] = useState('image')
  const [modalLoading, setModalLoading] = useState(false)

  const getGatewayUrl = (url) => {
    if (!url) return null
    if (url.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${url.slice(7)}`
    if (url.includes('/ipfs/')) { const parts = url.split('/ipfs/'); return `https://gateway.pinata.cloud/ipfs/${parts[parts.length - 1]}` }
    return url
  }

  const handleOpenAsset = async (item) => {
    setSelectedAsset(item); setModalMediaUrl(null); setModalMediaType('image')
    const hashKey = (item.sha256 || '').toLowerCase()
    const cachedStr = localStorage.getItem(`vt_media_${hashKey}`)
    if (cachedStr) { try { const cached = JSON.parse(cachedStr); if (cached.media_ipfs_url || cached.media_s3_url) { setModalMediaUrl(getGatewayUrl(cached.media_s3_url || cached.media_ipfs_url)); setModalMediaType(cached.media_type || 'image'); return } } catch {} }
    if (item.ipfsCid && !item.ipfsCid.startsWith('QmYourMetadataCid')) {
      setModalLoading(true)
      try {
        const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 4000)
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${item.ipfsCid}`, { signal: controller.signal })
        clearTimeout(timeoutId)
        if (res.ok) {
          const meta = await res.json()
          setModalMediaUrl(getGatewayUrl(meta.media_s3_url || meta.media_ipfs_url))
          setModalMediaType(meta.media_type || 'image')
          try { localStorage.setItem(`vt_media_${hashKey}`, JSON.stringify({ sha256: item.sha256, media_ipfs_url: meta.media_ipfs_url, media_s3_url: meta.media_s3_url, media_type: meta.media_type || 'image', ipfsCid: item.ipfsCid })) } catch {}
        }
      } catch {} finally { setModalLoading(false) }
    }
  }

  useEffect(() => {
    const fetchEventLogs = async () => {
      try {
        setLoading(true); setError(null)
        const events = await getContractEvents(config, { address: CONTRACT_ADDRESS, abi: parseAbi(CONTRACT_ABI), eventName: 'ContentRegistered', fromBlock: 0n, toBlock: 'latest' })
        const parsedLogs = events.map(event => {
          const args = event.args || {}
          return { sha256: args.sha256hash, creator: args.creator, phash: args.phash?.toString() || '0', timestamp: Number(args.timestamp || 0n), ipfsCid: args.ipfsCid || '', aiTool: args.aitool || '', txHash: event.transactionHash, blockNumber: Number(event.blockNumber) }
        })
        setRegistrations(parsedLogs.reverse())
      } catch (err) { setError(`Failed to read on-chain registry: ${err.message}`) }
      finally { setLoading(false) }
    }
    fetchEventLogs()
  }, [])

  const formatAddress = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <section>
      <PageHero eyebrow="PUBLIC PROVENANCE LEDGER" title="Explore the evidence." description="A transparent, independently auditable record of every media and text proof written to the Arbitrum Sepolia registry." icon={LibraryIcon} />
      <div className="max-w-[1280px] mx-auto px-5 pt-7">

      {error && <div className="mb-5"><Alert variant="danger">{error}</Alert></div>}

      <SpotlightCard>
        <Card className="card-hover-glow card-border-animate">
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2"><LibraryIcon size={16} className="text-[#12AAFF]" /> Evidence ledger <span className="text-[var(--text-4)]">({registrations.length})</span></span>
            </CardTitle>
            <Badge variant="arb"><ArbitrumLogo size={12} /> Arbitrum Sepolia</Badge>
          </CardHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              {/* Dual-ring animated loader with Arbitrum logo */}
              <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                <div className="loading-orb-outer absolute inset-0 rounded-full" style={{ border: '3px solid var(--border)', borderTopColor: '#12AAFF', borderRightColor: '#12AAFF' }} />
                <div className="loading-orb-inner absolute inset-2 rounded-full" style={{ border: '3px solid var(--border)', borderBottomColor: '#00D395', borderLeftColor: '#00D395' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ArbitrumLogo size={28} animated />
                </div>
              </div>
              <div className="text-lg font-bold text-[var(--text)] mb-1.5">Synchronizing registry evidence…</div>
              <div className="text-sm text-[var(--text-3)] mb-5">Reading verified ContentRegistered events from Arbitrum Sepolia</div>
              {/* Skeleton table rows */}
              <div className="w-full max-w-3xl flex flex-col gap-2">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="skeleton-row h-12 rounded-lg" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : registrations.length === 0 ? (
            <EmptyState icon={<LibraryIcon size={28} />} title="The registry is waiting for its first proof" description="Register an original to create the first public, cryptographically verifiable record." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full vt-table">
                <thead>
                  <tr>
                    {['Evidence fingerprint', 'Visual signature', 'Registrant', 'Declared source', 'Block timestamp', 'Inspect'].map((h, i) => (
                      <th key={h} className={i === 5 ? 'text-right' : ''}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((item, idx) => (
                    <motion.tr key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}>
                      <td><span className="font-mono text-xs text-[#12AAFF]" title={item.sha256}>{item.sha256?.slice(0, 10)}...{item.sha256?.slice(-8)}</span></td>
                      <td><span className="font-mono text-xs text-[var(--text)]">{item.phash !== '0' ? item.phash : <span className="text-[var(--text-4)] italic">None</span>}</span></td>
                      <td><a href={`${ARBITRUM_SEPOLIA.explorer}/address/${item.creator}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#12AAFF] hover:opacity-80">{formatAddress(item.creator)}</a></td>
                      <td>{item.aiTool ? <Badge variant="info">{item.aiTool}</Badge> : <Badge variant="success">Authentic</Badge>}</td>
                      <td><span className="text-xs text-[var(--text-2)]">{new Date(item.timestamp * 1000).toLocaleString()}</span></td>
                      <td>
                        <div className="flex gap-1.5 justify-end items-center">
                          <Button variant="primary" size="sm" onClick={() => handleOpenAsset(item)} className="!px-2 !py-1 !text-[11px]"><Eye size={12} /> View</Button>
                          <a href={`${ARBITRUM_SEPOLIA.explorer}/tx/${item.txHash}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="!px-2 !py-1 !text-[11px]"><ExternalLink size={12} /></Button></a>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </SpotlightCard>

      <Modal open={!!selectedAsset} onClose={() => setSelectedAsset(null)} maxWidth="max-w-2xl">
        {selectedAsset && (
          <>
            <ModalHeader title="Registered Asset Details" onClose={() => setSelectedAsset(null)} icon={<Shield size={18} className="text-[#00D395]" />} />
            <div className="p-5 flex flex-col gap-4">
              <div className="relative w-full h-72 bg-[var(--bg-2)] rounded-xl overflow-hidden flex items-center justify-center border border-[var(--border)]" onContextMenu={(e) => e.preventDefault()}>
                {modalLoading ? (
                  <div className="text-center"><Spinner /><div className="text-xs text-[var(--text-3)] mt-2">Retrieving media from IPFS...</div></div>
                ) : modalMediaUrl ? (
                    modalMediaType === 'video' ? <video src={modalMediaUrl} controls controlsList="nodownload" className="max-w-full max-h-full" /> : <img src={modalMediaUrl} alt="Asset" className="max-w-full max-h-full object-contain pointer-events-none select-none" />
                ) : (
                  <div className="text-center p-4 flex flex-col items-center">
                    <Lock size={28} className="text-[var(--text-3)] mb-1" />
                    <div className="text-xs font-semibold text-[var(--text)]">Protected Registry Node</div>
                    <div className="text-[11px] text-[var(--text-3)] mt-1 mb-3 max-w-[240px]">{selectedAsset.ipfsCid ? 'Media not resolved from IPFS.' : 'Legacy registration: File was not pinned to storage.'}</div>
                    <label className="cursor-pointer"><Button variant="outline" size="sm" as="span">Select local file to view</Button><input type="file" className="hidden" onChange={(e) => { const file = e.target.files[0]; if (file) { setModalMediaUrl(URL.createObjectURL(file)); setModalMediaType(file.type.startsWith('video/') ? 'video' : 'image') } }} /></label>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <DataRow label="Cryptographic SHA-256" value={selectedAsset.sha256} mono />
                <DataRow label="Visual Perceptual Hash" value={selectedAsset.phash !== '0' ? selectedAsset.phash : 'None'} mono />
                <DataRow label="Anchored Date" value={new Date(selectedAsset.timestamp * 1000).toLocaleString()} />
                <DataRow label="AI Model" value={selectedAsset.aiTool || 'Authentic Content'} />
                <DataRow label="Registrant Address"><a href={`${ARBITRUM_SEPOLIA.explorer}/address/${selectedAsset.creator}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#12AAFF] hover:opacity-80">{selectedAsset.creator}</a></DataRow>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-2)] flex gap-3">
              <a href={`${ARBITRUM_SEPOLIA.explorer}/tx/${selectedAsset.txHash}`} target="_blank" rel="noopener noreferrer" className="flex-1"><Button variant="primary" size="sm" className="w-full"><ExternalLink size={14} /> Arbiscan</Button></a>
              {selectedAsset.ipfsCid && <Button variant="outline" size="sm" className="flex-1" onClick={() => { const certData = { title: 'VeriTrace Registration Certificate', sha256: selectedAsset.sha256, phash: selectedAsset.phash, owner: selectedAsset.creator, anchoredAt: new Date(selectedAsset.timestamp * 1000).toISOString(), aiModel: selectedAsset.aiTool || 'None', ipfsMetadataUrl: `https://ipfs.io/ipfs/${selectedAsset.ipfsCid}` }; const blob = new Blob([JSON.stringify(certData, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `veritrace-cert-${selectedAsset.sha256?.slice(2, 10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url) }}><Download size={14} /> Certificate</Button>}
            </div>
          </>
        )}
      </Modal>
      </div>
    </section>
  )
}

function DataRow({ label, value, mono, children }) {
  return <div className="flex justify-between items-center border-b border-[var(--border)] pb-1.5"><span className="text-[var(--text-3)]">{label}</span>{children || <span className={mono ? 'font-mono font-semibold' : ''}>{value}</span>}</div>
}

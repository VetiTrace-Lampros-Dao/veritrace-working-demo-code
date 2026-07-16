import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CircleCheck as CheckCircle2, Search, TriangleAlert as AlertTriangle, Lock, Cloud } from 'lucide-react'
import { ARBITRUM_SEPOLIA, CORE_BACKEND_API } from '../config'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import { EmptyState } from './ui/empty-state'
import { Modal, ModalHeader } from './ui/modal'

export default function SearchResults({ results, loading, uploadedFile }) {
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null)
  const [comparisonMatch, setComparisonMatch] = useState(null)
  const [heatmapBase64, setHeatmapBase64] = useState(null)
  const [heatmapLoading, setHeatmapLoading] = useState(false)
  const [resolvedOriginalUrl, setResolvedOriginalUrl] = useState(null)
  const [resolvedMediaType, setResolvedMediaType] = useState('image')
  const [loadingOriginal, setLoadingOriginal] = useState(false)
  const [uploadingLegacy, setUploadingLegacy] = useState(false)

  useEffect(() => {
    if (!uploadedFile || (!uploadedFile.type?.startsWith('image/') && !uploadedFile.type?.startsWith('video/'))) { setLocalPreviewUrl(null); return }
    const url = URL.createObjectURL(uploadedFile)
    setLocalPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [uploadedFile])

  const getGatewayUrl = (url) => { if (!url) return null; if (url.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${url.slice(7)}`; return url }

  useEffect(() => {
    if (!comparisonMatch) { setResolvedOriginalUrl(null); setResolvedMediaType('image'); setLoadingOriginal(false); return }
    const { mediaS3Url, mediaIpfsUrl, ipfsCid, mediaType, sha256, assetId } = comparisonMatch
    const hashKey = (sha256 || assetId || '').toLowerCase()
    const cachedMediaStr = localStorage.getItem(`vt_media_${hashKey}`)
    if (cachedMediaStr) { try { const cached = JSON.parse(cachedMediaStr); if (cached.media_ipfs_url || cached.media_s3_url) { setResolvedOriginalUrl(getGatewayUrl(cached.media_s3_url || cached.media_ipfs_url)); setResolvedMediaType(cached.media_type || mediaType || 'image'); return } } catch {} }
    const cachedUrl = localStorage.getItem(`vt_legacy_${hashKey}`)
    if (cachedUrl) { setResolvedOriginalUrl(getGatewayUrl(cachedUrl)); setResolvedMediaType(mediaType || 'image'); return }
    const initialUrl = getGatewayUrl(mediaS3Url) || getGatewayUrl(mediaIpfsUrl)
    if (initialUrl) { setResolvedOriginalUrl(initialUrl); setResolvedMediaType(mediaType || 'image'); return }
    if (ipfsCid && ipfsCid !== '' && !ipfsCid.startsWith('QmYourMetadataCid')) {
      setLoadingOriginal(true)
      const fetchMetadata = async () => {
        try { const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 4000); const res = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsCid}`, { signal: controller.signal }); clearTimeout(timeoutId); if (res.ok) { const meta = await res.json(); setResolvedOriginalUrl(getGatewayUrl(meta.media_s3_url || meta.media_ipfs_url)); setResolvedMediaType(meta.media_type || mediaType || 'image') } } catch {} finally { setLoadingOriginal(false) }
      }
      fetchMetadata()
    } else { setResolvedOriginalUrl(null); setResolvedMediaType(mediaType || 'image'); setLoadingOriginal(false) }
  }, [comparisonMatch])

  const handleViewAlterations = useCallback(async () => {
    if (!uploadedFile || !resolvedOriginalUrl) return
    setHeatmapLoading(true)
    try {
      const res = await fetch(resolvedOriginalUrl); const blob = await res.blob(); const fd = new FormData()
      fd.append('file1', blob, 'original.jpg'); fd.append('file2', uploadedFile)
      const compareRes = await fetch(`https://api.hash.veritrace.dpkvtrading.online/api/v1/compare`, { method: 'POST', body: fd })
      if (compareRes.ok) { const data = await compareRes.json(); setHeatmapBase64(data.heatmap_base64) }
    } catch {} finally { setHeatmapLoading(false) }
  }, [uploadedFile, resolvedOriginalUrl])

  useEffect(() => {
    if (resolvedOriginalUrl && uploadedFile && resolvedMediaType === 'image') handleViewAlterations()
    else setHeatmapBase64(null)
  }, [resolvedOriginalUrl, uploadedFile, resolvedMediaType, handleViewAlterations])

  const handleArchiveLegacy = async () => {
    if (!uploadedFile || !comparisonMatch) return
    setUploadingLegacy(true)
    try {
      const formData = new FormData(); formData.append('file', uploadedFile)
      const res = await fetch(`${CORE_BACKEND_API}/api/v1/pin-file`, { method: 'POST', body: formData })
      if (res.ok) { const data = await res.json(); const mediaUrl = data.media_s3_url || data.media_ipfs_url; if (mediaUrl) { const hashKey = (comparisonMatch.sha256 || comparisonMatch.assetId || '').toLowerCase(); localStorage.setItem(`vt_media_${hashKey}`, JSON.stringify({ sha256: hashKey, media_ipfs_url: data.media_ipfs_url, media_s3_url: data.media_s3_url, media_type: comparisonMatch.mediaType || 'image' })); localStorage.setItem(`vt_legacy_${hashKey}`, mediaUrl); setResolvedOriginalUrl(getGatewayUrl(mediaUrl)) } }
    } catch {} finally { setUploadingLegacy(false) }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-stretch rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="w-1 bg-[var(--bg-3)]" />
            <div className="flex-1 p-3.5"><div className="skeleton h-3.5 rounded w-70% mb-2" /><div className="skeleton h-2.5 rounded w-50%" /></div>
            <div className="p-3.5"><div className="skeleton w-10 h-10 rounded-full" /></div>
          </div>
        ))}
      </div>
    )
  }

  if (!results) return <EmptyState icon={<Search size={28} />} title="Upload a file to search" description="We'll check for exact SHA-256 matches and visually similar content in the registry." />
  if (results.length === 0) return <EmptyState icon={<CheckCircle2 size={28} />} title="No matches found" description="This content hasn't been registered yet. You can be the first to register it!" />

  return (
    <>
      <div className="flex flex-col gap-2">
        {results.map((result, index) => <MatchCard key={index} result={result} onSelect={() => setComparisonMatch(result)} />)}
      </div>

      <Modal open={!!comparisonMatch} onClose={() => { setComparisonMatch(null); setHeatmapBase64(null) }} maxWidth={resolvedOriginalUrl && resolvedMediaType === 'image' ? 'max-w-7xl' : 'max-w-5xl'}>
        {comparisonMatch && (
          <>
            <ModalHeader title={`Authenticity Check — ${comparisonMatch.similarity?.toFixed(1)}% Match`} onClose={() => { setComparisonMatch(null); setHeatmapBase64(null) }} icon={<Search size={18} className="text-[#12AAFF]" />} />
            <div className="p-5 flex flex-col gap-4">
              <div className="grid gap-3" style={{ gridTemplateColumns: resolvedOriginalUrl && resolvedMediaType === 'image' ? '1fr 1fr 1fr' : '1fr 1fr' }}>
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-2)]">Uploaded Target (To Verify)</div>
                  <div className="flex-1 bg-[var(--bg-2)] rounded-xl border border-[var(--border)] overflow-hidden flex items-center justify-center min-h-[300px] relative">
                    {uploadedFile?.type?.startsWith('video/') ? <video src={localPreviewUrl} controls className="max-w-full max-h-full object-contain" /> : localPreviewUrl ? <img src={localPreviewUrl} alt="Uploaded" className="max-w-full max-h-full object-contain" /> : <span className="text-xs text-[var(--text-3)]">No image loaded</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-2)]">Matched Original (On-Chain)</div>
                  <div className="flex-1 bg-[var(--bg-2)] rounded-xl border border-[var(--border)] overflow-hidden flex items-center justify-center min-h-[300px] relative" onContextMenu={(e) => e.preventDefault()}>
                    {loadingOriginal ? <div className="text-center"><Spinner /><div className="text-xs text-[var(--text-3)] mt-2">Resolving media...</div></div> : resolvedOriginalUrl ? (
                      <>
                        {resolvedMediaType === 'video' ? <video src={resolvedOriginalUrl} controls controlsList="nodownload" className="max-w-full max-h-full object-contain" /> : <img src={resolvedOriginalUrl} alt="Matched" className="max-w-full max-h-full object-contain pointer-events-none select-none" />}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 15px, rgba(0,0,0,0.1) 15px, rgba(0,0,0,0.1) 30px)' }}><span className="rotate-[-25deg] text-sm font-extrabold uppercase tracking-widest text-white/15 select-none">VERITRACE REGISTERED</span></div>
                      </>
                    ) : (
                      <div className="text-center p-4 flex flex-col items-center">
                        <Lock size={24} className="text-[var(--text-3)] mb-1" />
                        <div className="text-xs font-semibold text-[var(--text)]">Original Media Not Archived</div>
                        <div className="text-[10px] text-[var(--text-3)] mt-1 max-w-[240px]">This registration was created using a legacy version that did not store the media file online.</div>
                        {comparisonMatch.similarity === 100 && <Button variant="primary" size="sm" className="mt-3" onClick={handleArchiveLegacy} disabled={uploadingLegacy}><Cloud size={14} /> {uploadingLegacy ? 'Archiving...' : 'Archive to S3 & IPFS'}</Button>}
                      </div>
                    )}
                  </div>
                </div>
                {resolvedOriginalUrl && resolvedMediaType === 'image' && (
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#FF4D4D]">Pixel Diff Heatmap</div>
                    <div className="flex-1 bg-[var(--bg-2)] rounded-xl border border-dashed border-[#FF4D4D]/30 overflow-hidden flex items-center justify-center min-h-[300px]">
                      {heatmapLoading ? <div className="text-center"><Spinner className="!border-t-[#FF4D4D]" /><div className="text-xs text-[var(--text-3)] mt-2">Analyzing pixel diffs...</div></div> : heatmapBase64 ? <img src={heatmapBase64} alt="Heatmap" className="max-w-full max-h-full object-contain" /> : <div className="text-center p-4 flex flex-col items-center"><AlertTriangle size={24} className="text-[var(--text-3)] mb-1" /><div className="text-xs font-semibold text-[var(--text)]">Heatmap Not Loaded</div><Button variant="outline" size="sm" className="mt-3" onClick={handleViewAlterations}>Retry Analysis</Button></div>}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs border-t border-[var(--border)] pt-3">
                <div>
                  <div className="font-semibold text-[var(--text-2)] mb-1">Asset Identification</div>
                  <div className="text-[var(--text-3)]">SHA-256 Slice: <span className="font-mono text-[#12AAFF]">{comparisonMatch.assetId}</span></div>
                  <div className="text-[var(--text-3)]">AI Model: {comparisonMatch.aiTool || 'None (Authentic Content)'}</div>
                </div>
                <div>
                  <div className="font-semibold text-[var(--text-2)] mb-1">On-Chain Record</div>
                  <div className="text-[var(--text-3)]">Owner: <span className="font-mono">{comparisonMatch.creator ? `${comparisonMatch.creator.slice(0, 8)}...${comparisonMatch.creator.slice(-6)}` : 'Unknown'}</span></div>
                  <div className="text-[var(--text-3)]">Registered: {comparisonMatch.registeredAt}</div>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-2)] flex justify-center"><Button variant="primary" onClick={() => { setComparisonMatch(null); setHeatmapBase64(null) }}>Back to Results</Button></div>
          </>
        )}
      </Modal>
    </>
  )
}

function MatchCard({ result, onSelect }) {
  const isExact = result.matchType === 'exact'
  const isDeepfake = result.matchType === 'deepfake' || result.isDeepfake
  const isAudioDeepfake = result.isAudioDeepfake
  const percentage = result.similarity || 0
  const getGatewayUrl = (url) => url?.startsWith('ipfs://') ? `https://gateway.pinata.cloud/ipfs/${url.slice(7)}` : url
  const isLegacy = !result.ipfsCid || result.ipfsCid === '' || result.ipfsCid.startsWith('QmYourMetadataCid')
  const previewUrl = getGatewayUrl(result.mediaS3Url) || getGatewayUrl(result.mediaIpfsUrl)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} onClick={onSelect} className="flex items-stretch rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden cursor-pointer hover:border-[var(--border-2)] hover:shadow-md transition-all group">
      <div className="w-1 flex-shrink-0" style={{ background: isExact ? '#00D395' : isDeepfake ? '#FF4D4D' : '#FF9B00' }} />
      <div className="flex items-center justify-center p-3 flex-shrink-0">
        {!previewUrl ? <div className="w-[140px] h-[95px] rounded-lg border border-[var(--border)] bg-[var(--bg-2)] flex items-center justify-center text-[10px] text-[var(--text-3)] text-center p-2 leading-tight">{isLegacy ? 'No preview (Legacy)' : 'Click to compare'}</div> : <img src={previewUrl} alt="Match" className="w-[140px] h-[95px] object-cover rounded-lg border border-[var(--border)] bg-[var(--bg-2)]" onError={(e) => { if (result.assetId && e.target.src !== `https://api.veritrace.dpkvtrading.online/uploads/${result.assetId}`) { e.target.src = `https://api.veritrace.dpkvtrading.online/uploads/${result.assetId}` } else { e.target.style.display = 'none' } }} />}
      </div>
      <div className="flex-1 p-3.5 flex flex-col justify-center gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={isExact ? 'success' : isDeepfake ? 'danger' : 'warning'}>{isExact ? <><CheckCircle2 size={10} /> Exact Match</> : isDeepfake ? 'DEEPFAKE DETECTED' : '≈ Similar'}</Badge>
          {isAudioDeepfake && <Badge variant="danger" className="ml-1">AUDIO DEEPFAKE</Badge>}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">{result.mediaType || 'unknown'}</span>
        </div>
        {result.assetId && <div className="text-xs"><span className="text-[var(--text-3)]">Asset: </span><span className="font-mono text-[#12AAFF]">{result.assetId}</span></div>}
        {result.creator && <div className="text-xs"><span className="text-[var(--text-3)]">Creator: </span><a href={`${ARBITRUM_SEPOLIA.explorer}/address/${result.creator}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[#12AAFF] hover:opacity-80" onClick={(e) => e.stopPropagation()}>{result.creator.slice(0, 10)}...{result.creator.slice(-6)}</a></div>}
        {result.registeredAt && <div className="text-xs text-[var(--text-3)]">Registered: {result.registeredAt}</div>}
      </div>
      <div className="flex items-center justify-center px-5 flex-shrink-0">
        <div className="text-center">
          <div className="text-xl font-extrabold" style={{ color: isExact ? '#00D395' : isDeepfake ? '#FF4D4D' : percentage >= 80 ? '#FF9B00' : 'var(--text-4)' }}>{percentage.toFixed(1)}%</div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">match</div>
        </div>
      </div>
    </motion.div>
  )
}

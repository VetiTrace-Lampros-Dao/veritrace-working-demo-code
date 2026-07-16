import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { readContract, getContractEvents } from '@wagmi/core'
import { parseAbi } from 'viem'
import FileUpload from '../components/FileUpload'
import { HashDisplay } from '../components/ui/hash-display'
import SearchResults from '../components/SearchResults'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Alert } from '../components/ui/alert'
import { Progress } from '../components/ui/progress'
import { Spinner } from '../components/ui/spinner'
import { EmptyState } from '../components/ui/empty-state'
import { SpotlightCard } from '../components/aceternity/SpotlightCard'
import { ArbitrumLogo } from '../components/ArbitrumLogo'
import { useUpload } from '../context/UploadContext'
import { config } from '../wagmiConfig'
import {
  HASH_ENGINE_API, CONTRACT_ADDRESS, CONTRACT_ABI, ARBITRUM_SEPOLIA, CORE_BACKEND_API,
} from '../config'
import { Search, Shield, Database, Info, CircleCheck as CheckCircle2 } from 'lucide-react'

export default function VerifyPage() {
  const {
    verFile: file, setVerFile: setFile,
    verLoading: loading, setVerLoading: setLoading,
    verUploadProgress: uploadProgress, setVerUploadProgress: setUploadProgress,
    verError: error, setVerError: setError,
    verLocalSha256: localSha256, setVerLocalSha256: setLocalSha256,
    verPhash: phash, setVerPhash: setPhash,
    verBlockchainRecord: blockchainRecord, setVerBlockchainRecord: setBlockchainRecord,
    verDbResults: dbResults, setVerDbResults: setDbResults,
  } = useUpload()

  const computeLocalSHA256 = async (f) => {
    const arrayBuffer = await f.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const queryBlockchainRegistry = async (sha256Hex) => {
    try {
      const record = await readContract(config, { address: CONTRACT_ADDRESS, abi: parseAbi(CONTRACT_ABI), functionName: 'verifyContent', args: ['0x' + sha256Hex] })
      return { isRegistered: true, creator: record[0], timestamp: Number(record[1]), phash: Number(record[2]), ipfsCid: record[3], aiTool: record[4] }
    } catch { return null }
  }

  const handleFileSelected = async (f) => {
    setFile(f); setError(null); setLocalSha256(null); setPhash(null); setBlockchainRecord(null); setDbResults(null); setUploadProgress(0)
    if (!f) return
    try {
      setLoading(true)
      const sha256Hex = await computeLocalSHA256(f)
      setLocalSha256(sha256Hex)
      const onChainData = await queryBlockchainRegistry(sha256Hex)
      if (onChainData) setBlockchainRecord(onChainData)
      const hashData = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('file', f)
        formData.append('filename', f.name)
        xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)) })
        xhr.addEventListener('load', () => { if (xhr.status >= 200 && xhr.status < 300) { try { resolve(JSON.parse(xhr.responseText)) } catch { reject(new Error('Invalid response')) } } else { reject(new Error(`Server error: ${xhr.status}`)) } })
        xhr.addEventListener('error', () => reject(new Error('Network error')))
        xhr.open('POST', `${HASH_ENGINE_API}/api/v1/hash`)
        xhr.send(formData)
      })
      if (hashData.phash) setPhash(hashData.phash)

      const matches = []
      const getHammingDistance = (a, b) => { let xor = BigInt(a) ^ BigInt(b), dist = 0; while (xor > 0n) { if (xor & 1n) dist++; xor >>= 1n } return dist }
      const getSimilarityScore = (dist) => 100 - (dist / 64) * 100

      try {
        const events = await getContractEvents(config, { address: CONTRACT_ADDRESS, abi: parseAbi(CONTRACT_ABI), eventName: 'ContentRegistered', fromBlock: 0n, toBlock: 'latest' })
        if (hashData.phash) {
          const uploadedPhash = BigInt(hashData.phash)
          for (const event of events) {
            const args = event.args || {}
            const isExactSha = args.sha256hash?.toLowerCase() === ('0x' + sha256Hex).toLowerCase()
            if (args.phash && args.phash !== 0n) {
              const distance = getHammingDistance(uploadedPhash, args.phash)
              const score = getSimilarityScore(distance)
              if (score >= 80) {
                let mediaS3Url, mediaIpfsUrl
                if (args.ipfsCid) { try { const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 3000); const metaRes = await fetch(`https://gateway.pinata.cloud/ipfs/${args.ipfsCid}`, { signal: controller.signal }); clearTimeout(timeoutId); if (metaRes.ok) { const metaData = await metaRes.json(); mediaS3Url = metaData.media_s3_url; mediaIpfsUrl = metaData.media_ipfs_url } } catch {} }
                matches.push({ matchType: isExactSha ? 'exact' : 'similar', similarity: score, assetId: args.sha256hash?.slice(0, 16), sha256: args.sha256hash, mediaType: hashData.media_type || 'unknown', registeredAt: new Date(Number(args.timestamp || 0n) * 1000).toLocaleString(), creator: args.creator, aiTool: args.aitool || '', ipfsCid: args.ipfsCid || '', mediaS3Url, mediaIpfsUrl })
              }
            }
          }
        }
      } catch (logErr) { console.error('On-chain fuzzy search failed:', logErr) }

      if (onChainData && matches.filter(m => m.matchType === 'exact').length === 0) {
        matches.push({ matchType: 'exact', similarity: 100, assetId: `onchain-${sha256Hex.slice(0, 8)}`, sha256: `0x${sha256Hex}`, mediaType: hashData.media_type || 'unknown', registeredAt: new Date(onChainData.timestamp * 1000).toLocaleString(), creator: onChainData.creator, aiTool: onChainData.aiTool, ipfsCid: onChainData.ipfsCid })
      }

      try {
        const exactRes = await fetch(`${CORE_BACKEND_API}/api/v1/verify/exact?hash=0x${sha256Hex}`)
        if (exactRes.ok) {
          const exactData = await exactRes.json()
          if (exactData.match_found && exactData.record) {
            const alreadyMatched = matches.some(m => m.assetId?.toLowerCase().includes(sha256Hex.slice(0, 8).toLowerCase()))
            if (onChainData) setBlockchainRecord(prev => ({ ...prev, mediaS3Url: exactData.record.MediaS3Url, mediaIpfsUrl: exactData.record.MediaIpfsUrl }))
            if (!alreadyMatched) matches.push({ matchType: 'exact', similarity: 100, assetId: exactData.record.Sha256Hash?.slice(0, 16), sha256: exactData.record.Sha256Hash, mediaType: hashData.media_type || 'unknown', registeredAt: new Date(exactData.record.Timestamp * 1000).toLocaleString(), creator: exactData.record.CreatorAddress, aiTool: exactData.record.AiTool, ipfsCid: exactData.record.IpfsCid, mediaS3Url: exactData.record.MediaS3Url, mediaIpfsUrl: exactData.record.MediaIpfsUrl })
          }
        }
      } catch (dbErr) { console.warn('Backend exact match failed:', dbErr.message) }

      try {
        let segmentsPayload = []
        if (hashData.keyframes?.length > 0) segmentsPayload = hashData.keyframes.map(k => ({ offset: Number(k.offset), phash: Number(k.phash), semantic_hash: k.semantic_hash || [], face_hash: k.face_hash || [] }))
        else if (hashData.phash) segmentsPayload = [{ offset: 0, phash: Number(hashData.phash), semantic_hash: hashData.semantic_hash || [], face_hash: hashData.face_hash || [] }]
        if (segmentsPayload.length > 0) {
          const segmentRes = await fetch(`${CORE_BACKEND_API}/api/v1/verify/segments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sha256: '0x' + sha256Hex, media_type: hashData.media_type, audio_hashes: hashData.audio_hashes || [], segments: segmentsPayload }) })
          if (segmentRes.ok) {
            const segmentData = await segmentRes.json()
            if (segmentData.match_found && segmentData.record) {
              const existingIndex = matches.findIndex(m => m.assetId?.toLowerCase().includes(segmentData.record.Sha256Hash?.slice(0, 8).toLowerCase()))
              const newMatch = { matchType: segmentData.is_deepfake ? 'deepfake' : 'similar', isDeepfake: segmentData.is_deepfake, isAudioDeepfake: segmentData.is_audio_deepfake, similarity: segmentData.similarity || 90, assetId: segmentData.record.Sha256Hash?.slice(0, 16), sha256: segmentData.record.Sha256Hash, mediaType: hashData.media_type || 'unknown', registeredAt: new Date(segmentData.record.Timestamp * 1000).toLocaleString(), creator: segmentData.record.CreatorAddress, aiTool: segmentData.record.AiTool, ipfsCid: segmentData.record.IpfsCid, mediaS3Url: segmentData.record.MediaS3Url, mediaIpfsUrl: segmentData.record.MediaIpfsUrl }
              if (existingIndex >= 0) { if (segmentData.is_deepfake || matches[existingIndex].matchType !== 'exact') matches[existingIndex] = { ...matches[existingIndex], ...newMatch } }
              else matches.push(newMatch)
            }
          }
        }
      } catch (dbErr) { console.warn('Backend similarity search failed:', dbErr.message) }

      setDbResults(matches)
      try { const count = Number(localStorage.getItem('vt_verifs_count') || 0); localStorage.setItem('vt_verifs_count', count + 1) } catch {}
    } catch (err) { setError(`Failed to perform verification check: ${err.message}`) }
    finally { setLoading(false) }
  }

  return (
    <section className="max-w-[1280px] mx-auto px-5 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold mb-1 text-[var(--text)]">Verify & Search Content</h1>
        <p className="text-sm text-[var(--text-3)]">Upload a file to check if it's registered or search for visual matches in the database</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5">
        {/* LEFT */}
        <div className="flex flex-col gap-5">
          <SpotlightCard>
            <Card className="card-hover-glow">
              <CardHeader><CardTitle><Search size={16} className="text-[#12AAFF]" /> Upload File to Verify</CardTitle></CardHeader>
              <CardBody><FileUpload onFileSelected={handleFileSelected} label="Drop a file to check against the VeriTrace registry" /></CardBody>
            </Card>
          </SpotlightCard>

          <AnimatePresence>
            {(localSha256 || loading) && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="card-hover-glow">
                  <CardHeader><CardTitle>Computed Fingerprints</CardTitle></CardHeader>
                  <CardBody className="flex flex-col gap-3">
                    {loading && !localSha256 ? <div className="skeleton h-9 rounded-lg w-full" /> : (
                      <>
                        <HashDisplay label="SHA-256 Cryptographic Hash" hash={localSha256 ? `0x${localSha256}` : null} icon="C" variant="crypto" />
                        {phash && <HashDisplay label="Visual Perceptual Hash (phash)" hash={phash} icon="P" variant="perceptual" />}
                      </>
                    )}
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="card-hover-glow">
            <CardHeader><CardTitle><Info size={16} className="text-[#12AAFF]" /> Understanding Results</CardTitle></CardHeader>
            <CardBody className="text-xs flex flex-col gap-2.5">
              <div className="flex items-start gap-3"><Badge variant="success" className="flex-shrink-0 mt-0.5">100%</Badge><div><strong className="text-[var(--text)]">Exact Match</strong> — Cryptographic hashes are identical. Byte-for-byte match with the registered original.</div></div>
              <div className="flex items-start gap-3"><Badge variant="warning" className="flex-shrink-0 mt-0.5">80-99%</Badge><div><strong className="text-[var(--text)]">Similar Content</strong> — Perceptual signatures match closely. May be compressed, resized, or cropped.</div></div>
              <div className="flex items-start gap-3"><Badge variant="default" className="flex-shrink-0 mt-0.5">&lt;80%</Badge><div><strong className="text-[var(--text)]">No Match</strong> — No entries found within visual or cryptographic thresholds.</div></div>
            </CardBody>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-5">
          <AnimatePresence>
            {(blockchainRecord || loading) && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`card-hover-glow ${blockchainRecord ? 'border-[var(--success-border)]' : ''}`}>
                  <CardHeader className={blockchainRecord ? 'bg-[var(--success-bg)]' : ''}>
                    <CardTitle className={blockchainRecord ? 'text-[#00D395]' : ''}><Shield size={16} /> On-Chain Smart Contract Proof</CardTitle>
                    {blockchainRecord && <Badge variant="success">Verified Original</Badge>}
                  </CardHeader>
                  <CardBody>
                    {loading && !blockchainRecord ? (
                      <div className="flex flex-col gap-2"><div className="skeleton h-3.5 rounded w-70%" /><div className="skeleton h-3.5 rounded w-60%" /><div className="skeleton h-3.5 rounded w-50%" /></div>
                    ) : (
                      <div className="flex flex-col gap-2 text-xs">
                        <DataRow label="Registrant Wallet"><a href={`${ARBITRUM_SEPOLIA.explorer}/address/${blockchainRecord.creator}`} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold text-[#12AAFF] hover:opacity-80">{blockchainRecord.creator.slice(0, 10)}...{blockchainRecord.creator.slice(-6)}</a></DataRow>
                        <DataRow label="Proof Committed At" value={new Date(blockchainRecord.timestamp * 1000).toLocaleString()} />
                        <DataRow label="AI Tool Attribution" value={blockchainRecord.aiTool || 'None'} bold />
                        {blockchainRecord.ipfsCid && <DataRow label="Metadata (IPFS)"><a href={`https://gateway.pinata.cloud/ipfs/${blockchainRecord.ipfsCid}`} target="_blank" rel="noopener noreferrer" className="text-[#12AAFF] hover:opacity-80">View CID ↗</a></DataRow>}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <SpotlightCard>
            <Card className="card-hover-glow card-border-animate">
              <CardHeader>
                <CardTitle><Database size={16} className="text-[#12AAFF]" /> Database Similarity Results</CardTitle>
                {dbResults?.length > 0 && <Badge variant="arb">{dbResults.length} matches</Badge>}
              </CardHeader>
              <CardBody className="max-h-[520px] overflow-y-auto">
                {loading ? (
                  <div className="py-2">
                    {uploadProgress < 100 ? (
                      <>
                        <div className="flex justify-between text-xs font-semibold mb-1.5"><span className="text-[var(--text-2)]">Uploading...</span><span className="text-[#12AAFF]">{uploadProgress}%</span></div>
                        <Progress value={uploadProgress} />
                      </>
                    ) : (
                      <div className="flex flex-col items-center py-4">
                        <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                          <div className="loading-orb-outer absolute inset-0 rounded-full" style={{ border: '2.5px solid var(--border)', borderTopColor: '#12AAFF', borderRightColor: '#12AAFF' }} />
                          <div className="loading-orb-inner absolute inset-1.5 rounded-full" style={{ border: '2.5px solid var(--border)', borderBottomColor: '#00D395', borderLeftColor: '#00D395' }} />
                          <ArbitrumLogo size={20} animated />
                        </div>
                        <div className="font-semibold text-sm text-[var(--text)]">Searching similarity index...</div>
                        <div className="text-xs text-[var(--text-3)] mt-1">Comparing perceptual Hamming distances on the server.</div>
                      </div>
                    )}
                  </div>
                ) : <SearchResults results={dbResults} loading={loading} uploadedFile={file} />}
              </CardBody>
            </Card>
          </SpotlightCard>

          {error && <Alert variant="danger">{error}</Alert>}
        </div>
      </div>
    </section>
  )
}

function DataRow({ label, value, bold, children }) {
  return <div className="flex justify-between items-center"><span className="text-[var(--text-3)]">{label}</span>{children || <span className={bold ? 'font-semibold' : ''}>{value}</span>}</div>
}

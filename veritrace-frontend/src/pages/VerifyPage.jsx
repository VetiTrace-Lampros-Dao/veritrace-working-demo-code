import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { readContract, getContractEvents } from '@wagmi/core'
import { parseAbi } from 'viem'
import FileUpload from '../components/FileUpload'
import { HashDisplay } from '../components/ui/hash-display'
import SearchResults from '../components/SearchResults'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { toast } from 'sonner'
import { Progress } from '../components/ui/progress'
import { SpotlightCard } from '../components/aceternity/SpotlightCard'
import { ArbitrumLogo } from '../components/ArbitrumLogo'
import PageHero from '../components/PageHero'
import { useUpload } from '../context/UploadContext'
import { useIntegrityTone } from '../components/providers/ExperienceProvider'
import { config } from '../wagmiConfig'
import {
  HASH_ENGINE_API, CONTRACT_ADDRESS, CONTRACT_ABI, ARBITRUM_SEPOLIA, CORE_BACKEND_API,
} from '../config'
import { Search, Shield, Database, Info, CircleCheck as CheckCircle2, FileText, Type, ExternalLink } from 'lucide-react'

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
  const { setIntegrityTone } = useIntegrityTone()

  const [inputType, setInputType] = useState('media')
  const [textContent, setTextContent] = useState('')

  // Dynamically create a file from text input
  useEffect(() => {
    if (inputType === 'text') {
      if (textContent.trim()) {
        const textBlob = new Blob([textContent], { type: 'text/plain' })
        const newFile = new File([textBlob], 'article.txt', { type: 'text/plain' })
        setFile(newFile)
      } else {
        setFile(null)
      }
    }
  }, [textContent, inputType, setFile])

  useEffect(() => {
    const hasIntegrityAlert = error || dbResults?.some(result => result.isDeepfake || result.matchType === 'deepfake')
    setIntegrityTone(hasIntegrityAlert ? 'alert' : 'secure')
    return () => setIntegrityTone('secure')
  }, [error, dbResults, setIntegrityTone])

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

      if (onChainData && matches.filter(m => m.matchType === 'exact').length === 0) {
        matches.push({ matchType: 'exact', similarity: 100, assetId: `onchain-${sha256Hex.slice(0, 8)}`, sha256: `0x${sha256Hex}`, mediaType: hashData.media_type || 'unknown', registeredAt: new Date(onChainData.timestamp * 1000).toLocaleString(), creator: onChainData.creator, aiTool: onChainData.aiTool, ipfsCid: onChainData.ipfsCid })
      }

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
              const newMatch = { matchType: segmentData.is_deepfake ? 'deepfake' : 'similar', isDeepfake: segmentData.is_deepfake, isAudioDeepfake: segmentData.is_audio_deepfake, similarity: segmentData.similarity || 90, temporalIntegrity: segmentData.temporal_integrity, assetId: segmentData.record.Sha256Hash?.slice(0, 16), sha256: segmentData.record.Sha256Hash, mediaType: hashData.media_type || 'unknown', registeredAt: new Date(segmentData.record.Timestamp * 1000).toLocaleString(), creator: segmentData.record.CreatorAddress, aiTool: segmentData.record.AiTool, ipfsCid: segmentData.record.IpfsCid, mediaS3Url: segmentData.record.MediaS3Url, mediaIpfsUrl: segmentData.record.MediaIpfsUrl }
              if (existingIndex >= 0) { if (segmentData.is_deepfake || matches[existingIndex].matchType !== 'exact') matches[existingIndex] = { ...matches[existingIndex], ...newMatch } }
              else matches.push(newMatch)
            }
          }
        }
      } catch (dbErr) { console.warn('Backend similarity search failed:', dbErr.message) }

      setDbResults(matches)
      try { const count = Number(localStorage.getItem('vt_verifs_count') || 0); localStorage.setItem('vt_verifs_count', count + 1) } catch {}
      toast.success('Verification complete!')
    } catch (err) {
      setError(`Failed to perform verification check: ${err.message}`)
      toast.error(`Verification failed: ${err.message}`)
    }
    finally { setLoading(false) }
  }

  return (
    <section>
      <PageHero eyebrow="AUTHENTICITY INTELLIGENCE" title="See the evidence behind a file." description="Compare content against public records and layered similarity signals to identify originals, likely derivatives, and high-risk alterations." icon={Search} />
      <div className="max-w-[1280px] mx-auto px-5 pt-7">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-5">
        {/* LEFT */}
        <div className="flex flex-col gap-5">
          <SpotlightCard>
            <Card className="card-hover-glow">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span className="flex items-center gap-2"><Search size={16} className="text-[#12AAFF]" /> Forensic intake</span>
                </CardTitle>
              </CardHeader>
              <CardBody className="flex flex-col gap-4">
                <Tabs value={inputType} onValueChange={(val) => { setInputType(val); setFile(null); setLocalSha256(null); setPhash(null); setBlockchainRecord(null); setDbResults(null); setError(null) }} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl">
                    <TabsTrigger value="media" className="data-[state=active]:bg-[var(--surface)] rounded-lg py-1.5"><FileText size={16} className="mr-2" /> Media File</TabsTrigger>
                    <TabsTrigger value="text" className="data-[state=active]:bg-[var(--surface)] rounded-lg py-1.5"><Type size={16} className="mr-2" /> Text Article</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="media">
                    <FileUpload onFileSelected={handleFileSelected} label="Drop a file to inspect its provenance" />
                  </TabsContent>
                  
                  <TabsContent value="text" className="flex flex-col gap-2 mt-0">
                    <textarea className="w-full h-32 p-3 bg-[var(--bg-2)] border border-[var(--border)] rounded-xl text-sm focus:border-[#12AAFF] focus:outline-none resize-none" placeholder="Paste your article or text content here to check it against the registry..." value={textContent} onChange={(e) => setTextContent(e.target.value)} />
                    <div className="text-[10px] text-[var(--text-3)] text-right">{textContent.length} characters</div>
                    <Button onClick={() => handleFileSelected(file)} disabled={!textContent.trim()}>Run provenance check</Button>
                  </TabsContent>
                </Tabs>
              </CardBody>
            </Card>
          </SpotlightCard>

          <AnimatePresence>
            {(localSha256 || loading) && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="card-hover-glow">
                  <CardHeader><CardTitle>Evidence extracted</CardTitle></CardHeader>
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
            <CardHeader><CardTitle><Info size={16} className="text-[#12AAFF]" /> Read the evidence</CardTitle></CardHeader>
            <CardBody className="text-xs flex flex-col gap-2.5">
              <div className="flex items-start gap-3"><Badge variant="success" className="flex-shrink-0 mt-0.5">100%</Badge><div><strong className="text-[var(--text)]">Exact match</strong> — The cryptographic fingerprints are identical: this is the registered file, byte for byte.</div></div>
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
                    <CardTitle className={blockchainRecord ? 'text-[#00D395]' : ''}><Shield size={16} /> Immutable registry record</CardTitle>
                    {blockchainRecord && <Badge variant="success">Proof located</Badge>}
                  </CardHeader>
                  <CardBody>
                    {loading && !blockchainRecord ? (
                      <div className="flex flex-col gap-3 pt-2">
                        <Skeleton className="h-4 w-3/4 bg-[var(--bg-2)]" />
                        <Skeleton className="h-4 w-1/2 bg-[var(--bg-2)]" />
                        <Skeleton className="h-4 w-2/3 bg-[var(--bg-2)]" />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 text-xs">
                        <DataRow label="Registrant Wallet"><a href={`${ARBITRUM_SEPOLIA.explorer}/address/${blockchainRecord.creator}`} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold text-[#12AAFF] hover:opacity-80">{blockchainRecord.creator.slice(0, 10)}...{blockchainRecord.creator.slice(-6)}</a></DataRow>
                        <DataRow label="Proof Committed At" value={new Date(blockchainRecord.timestamp * 1000).toLocaleString()} />
                        <DataRow label="AI Tool Attribution" value={blockchainRecord.aiTool || 'None'} bold />
                        {blockchainRecord.ipfsCid && <DataRow label="Metadata (IPFS)"><a href={`https://gateway.pinata.cloud/ipfs/${blockchainRecord.ipfsCid}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1 bg-[var(--surface-3)] hover:bg-[var(--border)] text-[var(--text-2)] rounded-md text-[11px] font-bold border border-[var(--border)] transition-colors"><ExternalLink size={12} /> View JSON</a></DataRow>}
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
        </div>
      </div>
      </div>
    </section>
  )
}

function DataRow({ label, value, bold, children }) {
  return <div className="flex justify-between items-center"><span className="text-[var(--text-3)]">{label}</span>{children || <span className={bold ? 'font-semibold' : ''}>{value}</span>}</div>
}

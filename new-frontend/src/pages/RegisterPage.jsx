import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ethers } from 'ethers'
import { useAccount, useWriteContract, useConfig, useSwitchChain } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { parseAbi } from 'viem'
import FileUpload from '../components/FileUpload'
import { HashDisplay } from '../components/ui/hash-display'
import { StepIndicator } from '../components/ui/step-indicator'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Alert } from '../components/ui/alert'
import { Progress } from '../components/ui/progress'
import { Spinner } from '../components/ui/spinner'
import { Select } from '../components/ui/input'
import { SpotlightCard } from '../components/aceternity/SpotlightCard'
import { ArbitrumLogo } from '../components/ArbitrumLogo'
import { useUpload } from '../context/UploadContext'
import { downloadCertificate } from '../utils/generateCertificate'
import { Upload, FingerprintPattern as Fingerprint, Shield, CircleCheck as CheckCircle2, FilePlus, TriangleAlert as AlertTriangle, ExternalLink, Award, Bot, Webhook, Lock, Cpu, Database, Server } from 'lucide-react'
import {
  HASH_ENGINE_API, CORE_BACKEND_API, CONTRACT_ADDRESS, CONTRACT_ABI, ARBITRUM_SEPOLIA,
} from '../config'

const AI_MODELS = [
  'None (Authentic Content)', 'Adobe Firefly', 'Claude 3.5 Sonnet', 'DALL-E 3',
  'FLUX.1', 'Gemini 1.5 Pro', 'GPT-4o', 'Llama 3', 'Midjourney v6',
  'Stable Diffusion 3', 'Other (Custom Input)',
]

export default function RegisterPage() {
  const {
    regFile: file, setRegFile: setFile,
    regStep: step, setRegStep: setStep,
    regProcessing: processing, setRegProcessing: setProcessing,
    regUploadProgress: uploadProgress, setRegUploadProgress: setUploadProgress,
    regSigning: signing, setRegSigning: setSigning,
    regAiCategory: aiCategory, setRegAiCategory: setAiCategory,
    regAiTool: aiTool, setRegAiTool: setAiTool,
    regHashes: hashes, setRegHashes: setHashes,
    regTxResult: txResult, setRegTxResult: setTxResult,
    regError: error, setRegError: setError,
  } = useUpload()

  const { address, isConnected, chain } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { switchChainAsync } = useSwitchChain()
  const config = useConfig()

  const [allowAiTraining, setAllowAiTraining] = useState(true)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [showAllKeyframes, setShowAllKeyframes] = useState(false)

  let maxConf = hashes.aiConfidenceScore || 0
  if (hashes.keyframes) {
    hashes.keyframes.forEach(kf => { if (kf.ai_confidence_score > maxConf) maxConf = kf.ai_confidence_score })
  }
  const showAiRequirement = aiCategory === 'None (Authentic Content)' && maxConf > 0.75

  const handleFileSelected = async (f) => {
    setFile(f); setError(null); setTxResult(null); setUploadProgress(0)
    if (!f) {
      setStep(1)
      setHashes({ sha256: null, hashCount: null, assetId: null, mediaType: null })
      return
    }
    try {
      setProcessing(true)
      const data = await new Promise((resolve, reject) => {
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
      if (!data.sha256) throw new Error('Server response missing SHA-256 hash')
      setHashes({
        sha256: data.sha256, phash: data.phash,
        hashCount: data.keyframes ? data.keyframes.length : 0,
        assetId: `asset-${Date.now()}`, mediaType: data.media_type,
        aiConfidenceScore: data.ai_confidence_score,
        semanticHash: data.semantic_hash || [], faceHashes: data.face_hashes || [],
        audioHashes: data.audio_hashes || [], keyframes: data.keyframes || [],
      })
      setStep(2)
    } catch (err) { setError(`Failed to compute hashes: ${err.message}`) }
    finally { setProcessing(false) }
  }

  const handleRegister = async () => {
    setError(null)
    if (!isConnected) { setError('Wallet is not connected. Please connect your wallet in the navigation bar.'); return }
    try {
      setSigning(true)
      if (showAiRequirement) { setError(`Registration Blocked: AI analyzer detected ${Math.round(maxConf * 100)}% probability this media is AI-generated. Please select the correct AI model.`); setSigning(false); return }
      setStep(3)
      if (!chain || chain.id !== ARBITRUM_SEPOLIA.chainId) { try { await switchChainAsync({ chainId: ARBITRUM_SEPOLIA.chainId }) } catch { throw new Error('Please switch to Arbitrum Sepolia network in your wallet.') } }
      const cleanHash = hashes.sha256.startsWith('0x') ? hashes.sha256.slice(2) : hashes.sha256
      const sha256Bytes32 = '0x' + cleanHash
      try {
        const checkProvider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA.rpcUrl)
        const checkContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, checkProvider)
        const existing = await checkContract.verifyContent(sha256Bytes32)
        if (existing && Number(existing[1]) !== 0) throw new Error('This file has already been registered.')
      } catch (checkErr) { if (checkErr.message.includes('already been registered')) throw checkErr }
      const fileFormData = new FormData()
      fileFormData.append('file', file)
      const pinFileRes = await fetch(`${CORE_BACKEND_API}/api/v1/pin-file`, { method: 'POST', body: fileFormData })
      if (!pinFileRes.ok) throw new Error(`Failed to pin media: ${pinFileRes.statusText}`)
      const pinFileData = await pinFileRes.json()
      const mediaIpfsUrl = pinFileData.media_ipfs_url
      const mediaS3Url = pinFileData.media_s3_url
      const metadataPayload = {
        sha256: sha256Bytes32, representative_phash: hashes.phash ? Number(hashes.phash) : 0,
        media_ipfs_url: mediaIpfsUrl, media_s3_url: mediaS3Url,
        allow_ai_training: allowAiTraining, webhook_url: webhookUrl, parent_sha256: '',
        media_type: hashes.mediaType || 'image', semantic_hash: hashes.semanticHash || [],
        face_hashes: hashes.faceHashes || [], audio_hashes: hashes.audioHashes || [],
        keyframes: hashes.keyframes || [],
      }
      const pinMetaRes = await fetch(`${CORE_BACKEND_API}/api/v1/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadataPayload) })
      if (!pinMetaRes.ok) throw new Error(`Failed to pin metadata: ${pinMetaRes.statusText}`)
      const pinMetaData = await pinMetaRes.json()
      const ipfsCid = pinMetaData.ipfs_cid
      let safeMaxFee, safePriorityFee
      try {
        const feeProvider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA.rpcUrl)
        const feeData = await feeProvider.getFeeData()
        const mult = 200n
        safeMaxFee = feeData.maxFeePerGas ? (feeData.maxFeePerGas * mult) / 100n : undefined
        safePriorityFee = feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * mult) / 100n : undefined
      } catch {}
      const txHash = await writeContractAsync({
        chainId: ARBITRUM_SEPOLIA.chainId, address: CONTRACT_ADDRESS,
        abi: parseAbi(CONTRACT_ABI), functionName: 'registerContent',
        args: [sha256Bytes32, hashes.phash ? BigInt(hashes.phash) : 0n, ipfsCid || '', aiTool || ''],
        ...(safeMaxFee || safePriorityFee ? { maxFeePerGas: safeMaxFee, maxPriorityFeePerGas: safePriorityFee } : {}),
      })
      const receipt = await waitForTransactionReceipt(config, { hash: txHash })
      try { localStorage.setItem(`vt_media_${sha256Bytes32.toLowerCase()}`, JSON.stringify({ sha256: sha256Bytes32, media_ipfs_url: mediaIpfsUrl, media_s3_url: mediaS3Url, media_type: hashes.mediaType || 'image', ipfsCid, keyframes: hashes.keyframes || [] })) } catch {}
      setTxResult({ hash: receipt.transactionHash, blockNumber: Number(receipt.blockNumber), mediaIpfsUrl, mediaS3Url, ipfsCid, sha256: sha256Bytes32 })
      setStep(4)
    } catch (err) {
      let message = err.message
      if (message.includes('ContentAlreadyRegistered')) message = 'This content hash is already registered on the blockchain.'
      else if (message.includes('user rejected') || message.includes('User rejected')) message = 'Transaction was rejected in your wallet.'
      else if (message.includes('insufficient funds')) message = 'Insufficient ETH for gas. Get free testnet ETH from the Lampros DAO Faucet.'
      setError(message); setStep(2)
    } finally { setSigning(false) }
  }

  const resetFlow = () => {
    setFile(null); setStep(1)
    setHashes({ sha256: null, hashCount: null, assetId: null, mediaType: null })
    setTxResult(null); setError(null); setAiTool('')
  }

  return (
    <section className="max-w-[1280px] mx-auto px-5 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold mb-1 text-[var(--text)]">Register Content</h1>
        <p className="text-sm text-[var(--text-3)]">Upload a file to fingerprint and register its authenticity on-chain</p>
      </div>

      <StepIndicator steps={['Upload File', 'Generate Hashes', 'Sign & Register', 'Confirmed']} currentStep={step} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT */}
        <div className="flex flex-col gap-5">
          <SpotlightCard>
            <Card className="card-hover-glow">
              <CardHeader>
                <CardTitle><Upload size={16} className="text-[#12AAFF]" /> File Upload</CardTitle>
              </CardHeader>
              <CardBody><FileUpload onFileSelected={handleFileSelected} /></CardBody>
            </Card>
          </SpotlightCard>

          <AnimatePresence>
            {(processing || hashes.sha256) && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="card-hover-glow">
                  <CardHeader>
                    <CardTitle><Fingerprint size={16} className="text-[#12AAFF]" /> Content Fingerprints</CardTitle>
                    {processing && <Badge variant="arb">Computing...</Badge>}
                  </CardHeader>
                  <CardBody className="flex flex-col gap-3">
                    {processing ? (
                      <div className="p-3 rounded-xl bg-[var(--bg-2)] border border-[var(--border)]">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-3)] mb-1.5">SHA-256 CRYPTOGRAPHIC HASH</div>
                        <div className="skeleton h-9 rounded-lg w-full" />
                      </div>
                    ) : (
                      <>
                        <HashDisplay label="SHA-256 Cryptographic Hash" hash={hashes.sha256 ? (hashes.sha256.startsWith('0x') ? hashes.sha256 : `0x${hashes.sha256}`) : null} icon="C" variant="crypto" />
                        {hashes.phash && <HashDisplay label="Visual Perceptual Hash (phash)" hash={hashes.phash} icon="P" variant="perceptual" />}
                        <div className="flex flex-wrap gap-3 text-xs">
                          <Meta label="Asset ID" value={hashes.assetId} mono />
                          <Meta label="Type" value={hashes.mediaType} />
                          <Meta label="Hash Units" value={hashes.hashCount} />
                          {hashes.aiConfidenceScore !== undefined && hashes.aiConfidenceScore !== null && (
                            <Meta label="AI Score" value={`${Math.round(maxConf * 100)}%`} color={maxConf > 0.75 ? 'text-[#FF4D4D]' : maxConf > 0.3 ? 'text-[#FF9B00]' : 'text-[#00D395]'} bold />
                          )}
                        </div>
                        {hashes.keyframes?.length > 0 && (
                          <div className="border-t border-[var(--border)] pt-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-[var(--text-3)]">Extracted Keyframes ({hashes.keyframes.length})</span>
                              <button onClick={() => setShowAllKeyframes(!showAllKeyframes)} className="text-xs text-[#12AAFF] hover:opacity-80">{showAllKeyframes ? 'Show Less' : 'Show All'}</button>
                            </div>
                            <div className="max-h-[220px] overflow-y-auto p-2 rounded-lg bg-[var(--bg-2)] border border-[var(--border)] flex flex-col gap-1 font-mono text-xs">
                              {(showAllKeyframes ? hashes.keyframes : hashes.keyframes.slice(0, 2)).map((kf, i) => {
                                const offset = kf.offset ?? kf.Offset
                                const phash = kf.phash ?? kf.PHash
                                return (
                                  <div key={i} className="flex flex-col gap-0.5 pb-1 border-b border-[var(--border)] last:border-0">
                                    <div className="flex justify-between">
                                      <span className="text-[var(--text-3)]">⏱️ {offset}ms</span>
                                      <span className="text-[#12AAFF]">🔑 {phash}</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </CardBody>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-5">
          <SpotlightCard>
            <Card className="card-hover-glow card-border-animate">
              <CardHeader>
                <CardTitle><Shield size={16} className="text-[#12AAFF]" /> Blockchain Registration</CardTitle>
              </CardHeader>
              <CardBody>
                <AnimatePresence mode="wait">
                  {step < 2 && !processing && (
                    <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Alert variant="info">Upload a file first. We'll compute its SHA-256 fingerprint via the hash engine, then you can register it on Arbitrum Sepolia.</Alert>
                    </motion.div>
                  )}

                  {processing && (
                    <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4">
                      {uploadProgress < 100 ? (
                        <>
                          <div className="flex justify-between text-xs font-semibold mb-1.5">
                            <span className="text-[var(--text-2)]">Uploading Media File...</span>
                            <span className="text-[#12AAFF]">{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} />
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                            <div className="loading-orb-outer absolute inset-0 rounded-full" style={{ border: '2.5px solid var(--border)', borderTopColor: '#12AAFF', borderRightColor: '#12AAFF' }} />
                            <div className="loading-orb-inner absolute inset-1.5 rounded-full" style={{ border: '2.5px solid var(--border)', borderBottomColor: '#00D395', borderLeftColor: '#00D395' }} />
                            <ArbitrumLogo size={20} animated />
                          </div>
                          <div className="font-semibold text-sm text-[var(--text)]">Extracting & Hashing...</div>
                          <div className="text-xs text-[var(--text-3)] mt-1">Generating signatures. This may take up to a minute for larger videos.</div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {step === 2 && !processing && (
                    <motion.div key="ready" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                      <Alert variant="success">Fingerprints computed. Click below to sign a transaction and register on-chain.</Alert>

                      <div>
                        <label className="text-xs font-semibold text-[var(--text-3)] block mb-1.5 flex items-center gap-1"><Bot size={12} /> AI Generator Attribution</label>
                        <Select value={aiCategory} onChange={(e) => { const val = e.target.value; setAiCategory(val); if (val === 'None (Authentic Content)') setAiTool(''); else if (val !== 'Other (Custom Input)') setAiTool(val) }}>
                          {AI_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                        </Select>
                        {showAiRequirement && <div className="text-xs text-[#FF4D4D] mt-1.5 font-medium flex items-center gap-1"><AlertTriangle size={12} /> AI detected ({Math.round(maxConf * 100)}%). You must declare the AI model.</div>}
                        {aiCategory === 'Other (Custom Input)' && <input type="text" value={aiTool} onChange={(e) => setAiTool(e.target.value)} placeholder="Enter custom AI model name" className="w-full mt-2 px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[#12AAFF]" />}
                      </div>

                      <label className="flex items-center gap-2 text-xs cursor-pointer text-[var(--text-2)]"><input type="checkbox" checked={allowAiTraining} onChange={(e) => setAllowAiTraining(e.target.checked)} className="accent-[#12AAFF]" /> Allow AI models to use this content for training</label>

                      <div>
                        <label className="text-xs font-semibold text-[var(--text-3)] block mb-1.5 flex items-center gap-1"><Webhook size={12} /> Webhook URL (Optional)</label>
                        <input type="url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="e.g. Discord, Slack webhook" className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)] outline-none focus:border-[#12AAFF]" />
                      </div>

                      <div className="bg-[var(--bg-2)] rounded-xl p-4 border border-[var(--border)]">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-3)] mb-2 flex items-center gap-1.5"><ArbitrumLogo size={12} /> Transaction Preview</div>
                        <div className="flex flex-col gap-1.5 text-xs">
                          <TxRow label="Contract" value="VeriTraceRegistry" accent />
                          <TxRow label="Method" value="registerContent(bytes32, uint64, string, string)" />
                          <TxRow label="SHA-256" value={`0x${hashes.sha256?.slice(0, 12)}...`} mono />
                          <TxRow label="Network" value="Arbitrum Sepolia" />
                          <TxRow label="AI Tool" value={aiTool || '(none)'} />
                        </div>
                      </div>

                      <Button variant="primary" size="lg" className="w-full" onClick={handleRegister}><Shield size={18} /> Register on Blockchain</Button>
                    </motion.div>
                  )}

                  {step === 3 && signing && (
                    <motion.div key="signing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
                      <div className="relative w-16 h-16 flex items-center justify-center mb-3">
                        <div className="loading-orb-outer absolute inset-0 rounded-full" style={{ border: '2.5px solid var(--border)', borderTopColor: '#12AAFF', borderRightColor: '#12AAFF' }} />
                        <div className="loading-orb-inner absolute inset-1.5 rounded-full" style={{ border: '2.5px solid var(--border)', borderBottomColor: '#00D395', borderLeftColor: '#00D395' }} />
                        <ArbitrumLogo size={20} animated />
                      </div>
                      <div className="font-semibold text-sm text-[var(--text)]">Waiting for confirmation...</div>
                      <div className="text-xs text-[var(--text-3)] mt-1">Please confirm the transaction in your wallet</div>
                    </motion.div>
                  )}

                  {step === 4 && txResult && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }} className="w-14 h-14 rounded-full bg-[var(--success-bg)] text-[#00D395] flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 size={28} />
                      </motion.div>
                      <div className="font-bold text-lg mb-1 text-[var(--text)]">Successfully Registered!</div>
                      <div className="text-xs text-[var(--text-3)] mb-4">Your content has been anchored on Arbitrum Sepolia</div>

                      <div className="bg-[var(--bg-2)] rounded-xl p-4 border border-[var(--border)] text-left text-xs mb-4">
                        <TxRow label="Tx Hash"><a href={`${ARBITRUM_SEPOLIA.explorer}/tx/${txResult.hash}`} target="_blank" rel="noopener noreferrer" className="text-[#12AAFF] hover:opacity-80 font-mono">{txResult.hash.slice(0, 16)}...{txResult.hash.slice(-8)}</a></TxRow>
                        <TxRow label="Block" value={txResult.blockNumber?.toString()} />
                        <TxRow label="Status"><Badge variant="success">Confirmed</Badge></TxRow>
                        {txResult.ipfsCid && <TxRow label="Metadata (IPFS)"><a href={`https://gateway.pinata.cloud/ipfs/${txResult.ipfsCid}`} target="_blank" rel="noopener noreferrer" className="text-[#12AAFF] hover:opacity-80">View ↗</a></TxRow>}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button variant="success" size="sm" onClick={() => downloadCertificate(txResult, address, CORE_BACKEND_API)}><Award size={16} /> Download PDF Certificate</Button>
                        <div className="flex gap-2">
                          <a href={`${ARBITRUM_SEPOLIA.explorer}/tx/${txResult.hash}`} target="_blank" rel="noopener noreferrer" className="flex-1"><Button variant="outline" size="sm" className="w-full"><ExternalLink size={14} /> Arbiscan</Button></a>
                          <Button variant="outline" size="sm" className="flex-1" onClick={resetFlow}><FilePlus size={14} /> Register Another</Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {error && <div className="mt-3"><Alert variant="danger">{error}</Alert></div>}
              </CardBody>
            </Card>
          </SpotlightCard>

          <Card className="card-hover-glow">
            <CardHeader><CardTitle>What gets stored?</CardTitle></CardHeader>
            <CardBody className="text-xs leading-relaxed text-[var(--text-2)]">
              <div className="flex flex-col gap-3">
                <InfoRow label="On-Chain" color="#12AAFF" items={['SHA-256 hash (bytes32)', 'Wallet address (msg.sender)', 'Block timestamp', 'AI tool attribution']} />
                <InfoRow label="Hash Engine (BoltDB)" color="#4DC3FF" items={['SHA-256 hash', 'Perceptual hash units', 'File content (for verification)', 'Asset metadata']} />
                <InfoRow label="Backend (Postgres/Qdrant)" color="#00D395" items={['Event-sourced metadata', 'pHash vectors (64-dim)', 'Redis exact-match cache']} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  )
}

function Meta({ label, value, mono, color, bold }) {
  return <div><span className="text-[var(--text-3)]">{label}: </span><span className={`${mono ? 'font-mono text-[#12AAFF]' : ''} ${color || ''} ${bold ? 'font-bold' : ''}`}>{value}</span></div>
}

function TxRow({ label, value, accent, mono, children }) {
  return <div className="flex justify-between items-center mb-1"><span className="text-[var(--text-3)]">{label}</span>{children || <span className={`${accent ? 'text-[#12AAFF]' : ''} ${mono ? 'font-mono' : ''}`}>{value}</span>}</div>
}

function InfoRow({ label, items, color }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1 font-semibold text-[11px] uppercase tracking-wider" style={{ color }}>
        <span className="w-2 h-2 rounded-full bg-current opacity-60" />{label}
      </div>
      <ul className="pl-4 m-0 list-disc list-inside">{items.map((item, i) => <li key={i} className="text-[var(--text-2)]">{item}</li>)}</ul>
    </div>
  )
}

import React, { useState, useRef, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';
import { jsPDF } from 'jspdf';
import './App.css';

const CONTRACT_ADDRESS = "0x468edc5b2fe9d1c919f2377cbe0ccb16f32ead29";

const CORE_API_URL = import.meta.env.VITE_CORE_API_URL || "http://localhost:8080";
const HASH_API_URL = import.meta.env.VITE_HASH_API_URL || "http://localhost:8081";

const CONTRACT_ABI = [
  {
    "inputs": [
      {"name": "sha256hash", "type": "bytes32"},
      {"name": "phash", "type": "uint64"},
      {"name": "ipfs_cid", "type": "string"},
      {"name": "ai_tool", "type": "string"}
    ],
    "name": "registerContent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

function App() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const walletAddress = address;

  const [activeTab, setActiveTab] = useState("register");

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [isProcessing, setIsProcessing] = useState(false);
  const [allowAiTraining, setAllowAiTraining] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [parentSha256, setParentSha256] = useState("");
  const [lineage, setLineage] = useState(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [hashingResult, setHashingResult] = useState(null);

  const [registrationStep, setRegistrationStep] = useState(0);
  const [txHash, setTxHash] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [registeredMetadataUrl, setRegisteredMetadataUrl] = useState("");
  const [registeredMediaIpfsUrl, setRegisteredMediaIpfsUrl] = useState("");
  const [registeredMediaS3Url, setRegisteredMediaS3Url] = useState("");

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) processSelectedFile(files[0]);
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) processSelectedFile(files[0]);
  };

  const processSelectedFile = (file) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    
    let type = 'image';
    if (file.type.startsWith('video/')) {
      type = 'video';
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      type = 'document';
    }
    setMediaType(type);
    setHashingResult(null);
    setRegistrationStep(0);
    setTxHash("");
    setVerificationResult(null);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('file', file);

    fetch(`${HASH_API_URL}/api/v1/hash`, { method: 'POST', body: formData })
      .then(res => {
        if (!res.ok) return res.text().then(t => { throw new Error(t) });
        return res.json();
      })
      .then(data => {
        setHashingResult(data);
        setIsProcessing(false);
      })
      .catch(err => {
        alert("Processing failed: " + err.message);
        setIsProcessing(false);
        resetSandbox();
      });
  };

  const resetSandbox = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setMediaType("");
    setHashingResult(null);
    setRegistrationStep(0);
    setTxHash("");
    setVerificationResult(null);
    setAllowAiTraining(false);
    setWebhookUrl("");
    setRegisteredMetadataUrl("");
    setRegisteredMediaIpfsUrl("");
    setRegisteredMediaS3Url("");
  };

  const executeRegistration = async () => {
    if (!isConnected || !walletClient) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      setRegistrationStep(1);
      
      const fileFormData = new FormData();
      fileFormData.append('file', selectedFile);

      const fileUploadRes = await fetch(`${CORE_API_URL}/api/v1/pin-file`, {
        method: "POST",
        body: fileFormData
      });

      if (!fileUploadRes.ok) {
        const errorText = await fileUploadRes.text();
        throw new Error(`Failed to upload media file: ${errorText}`);
      }

      const fileUploadData = await fileUploadRes.json();
      const mediaIpfsUrl = fileUploadData.media_ipfs_url;
      const mediaS3Url = fileUploadData.media_s3_url;

      setRegistrationStep(2);
      
      const metadataPayload = {
        sha256: hashingResult.sha256,
        representative_phash: Number(hashingResult.phash),
        media_ipfs_url: mediaIpfsUrl,
        media_s3_url: mediaS3Url,
        allow_ai_training: allowAiTraining,
        webhook_url: webhookUrl,
        parent_sha256: parentSha256,
        media_type: mediaType,
        keyframes: (hashingResult.keyframes || []).map(kf => ({
          offset: Number(kf.offset),
          phash: Number(kf.phash)
        }))
      };

      const pinResponse = await fetch(`${CORE_API_URL}/api/v1/pin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(metadataPayload)
      });

      if (!pinResponse.ok) {
        const errorText = await pinResponse.text();
        throw new Error(`Failed to pin metadata to IPFS: ${errorText}`);
      }

      const pinData = await pinResponse.json();
      const ipfsCid = pinData.ipfs_cid;

      setRegistrationStep(3);

      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();

      const feeData = await provider.getFeeData();
      const gasOverrides = {};
      if (feeData.maxFeePerGas) {
        gasOverrides.maxFeePerGas = (feeData.maxFeePerGas * 150n) / 100n;
        gasOverrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 1000000n;
      } else if (feeData.gasPrice) {
        gasOverrides.gasPrice = (feeData.gasPrice * 150n) / 100n;
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const formattedSha256 = hashingResult.sha256;
      const phashVal = BigInt(hashingResult.phash);

      const tx = await contract.registerContent(formattedSha256, phashVal, ipfsCid, "DALL-E 3", gasOverrides);
      setTxHash(tx.hash);
      setRegistrationStep(4);

      await tx.wait();
      setRegisteredMetadataUrl(`https://gateway.pinata.cloud/ipfs/${ipfsCid}`);
      setRegisteredMediaIpfsUrl(mediaIpfsUrl);
      setRegisteredMediaS3Url(mediaS3Url);
      setRegistrationStep(5);
    } catch (err) {
      alert("Transaction failed: " + err.message);
      setRegistrationStep(0);
    }
  };


  const executeVerification = () => {
    if (!hashingResult) return;
    setVerifying(true);
    setVerificationResult(null);

    const isSegmented = (mediaType === 'document' || mediaType === 'video') && hashingResult.keyframes && hashingResult.keyframes.length > 0;

    fetch(`${CORE_API_URL}/api/v1/verify/exact?hash=${hashingResult.sha256}`)
      .then(res => res.json())
      .then(exactRes => {
        if (exactRes.match_found) {
          setVerificationResult({ ...exactRes, _resultType: 'exact' });
          setVerifying(false);
        } else if (isSegmented) {
          const segments = (hashingResult.keyframes || []).map(kf => ({
            offset: Number(kf.offset),
            phash: Number(kf.phash)
          }));
          fetch(`${CORE_API_URL}/api/v1/verify/segments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sha256: hashingResult.sha256,
              media_type: mediaType,
              segments
            })
          })
            .then(res => res.json())
            .then(segRes => { setVerificationResult({ ...segRes, _resultType: 'segment' }); setVerifying(false); })
            .catch(err => { alert('Segment verification error: ' + err.message); setVerifying(false); });
        } else {
          fetch(`${CORE_API_URL}/api/v1/verify/fuzzy?phash=${hashingResult.phash}`)
            .then(res => res.json())
            .then(fuzzyRes => { setVerificationResult({ ...fuzzyRes, _resultType: 'fuzzy' }); setVerifying(false); })
            .catch(err => { alert('Fuzzy search error: ' + err.message); setVerifying(false); });
        }
      })
      .catch(err => { alert('Exact verification error: ' + err.message); setVerifying(false); });
  };

  const downloadCertificate = (targetHash) => {
    if (!targetHash) return;
    
    fetch(`${CORE_API_URL}/api/v1/verify/certificate?hash=${targetHash}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert('Error generating certificate: ' + data.error);
          return;
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `veritrace-certificate-${targetHash.substring(0, 8)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(err => alert('Failed to download certificate: ' + err.message));
  };

  const generatePdfCertificate = (hash, creator, mediaS3, metadataIpfs, mediaIpfs, txHash) => {
    if (!hash) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, 297, 210, 'F');
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(3);
    doc.rect(10, 10, 277, 190, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(30, 58, 138);
    doc.text('VeriTrace Registration Certificate', 148.5, 40, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(75, 85, 99);
    doc.text('Certificate of Digital Provenance & Authenticity', 148.5, 50, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('This document certifies that the digital asset with SHA-256 hash:', 148.5, 75, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(hash, 148.5, 85, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text('has been immutably registered on the blockchain by the creator address:', 148.5, 100, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(creator || 'Unknown', 148.5, 110, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Registration Date: ${new Date().toLocaleDateString()}`, 148.5, 130, { align: 'center' });
    
    doc.setTextColor(37, 99, 235); // Blue links
    let yPos = 145;
    
    if (txHash) {
      doc.textWithLink('View Transaction on Arbiscan', 148.5, yPos, { url: `https://sepolia.arbiscan.io/tx/${txHash}`, align: 'center' });
      yPos += 10;
    }

    if (mediaS3) {
      doc.textWithLink('View Original Asset (S3 Storage)', 148.5, yPos, { url: mediaS3, align: 'center' });
      yPos += 10;
    }
    
    if (mediaIpfs && !mediaIpfs.includes("Mock")) {
      doc.textWithLink('View Immutable Content (IPFS)', 148.5, yPos, { url: mediaIpfs, align: 'center' });
      yPos += 10;
    }

    if (metadataIpfs && !metadataIpfs.includes("Mock")) {
      doc.textWithLink('View Blockchain Metadata (IPFS JSON)', 148.5, yPos, { url: metadataIpfs, align: 'center' });
    }

    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text('VeriTrace Protocol - Secured by Arbitrum & IPFS', 148.5, 195, { align: 'center' });

    doc.save(`VeriTrace-Certificate-${hash.substring(0,8)}.pdf`);
  };

  const renderHexHash = (val) => {
    try {
      return '0x' + BigInt(val).toString(16).toUpperCase().padStart(16, '0');
    } catch {
      return '0x' + val;
    }
  };

  return (
    <div className="app-container">
      <div className="bg-effects">
        <div className="radial-top-left"></div>
        <div className="radial-bottom-right"></div>
      </div>

      <div className="app-wrapper">
        <nav className="navbar">
          <div className="brand-section">
            <h1>VeriTrace</h1>
            <span className="badge">DASHBOARD</span>
          </div>

          <div className="wallet-section">
            <ConnectButton
              chainStatus="icon"
              showBalance={false}
              accountStatus="address"
            />
          </div>
        </nav>

        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); resetSandbox(); }}
          >
            Register Original Content
          </button>
          <button
            className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`}
            onClick={() => { setActiveTab('verify'); resetSandbox(); }}
          >
            Verify Media Origin
          </button>
        </div>

        <div className="dashboard-grid">
          <div className="glass-card">
            <div className="panel-header">
              <h2>{activeTab === 'register' ? 'Content Upload (Creator Sandbox)' : 'Target Upload (Fuzzy Verification)'}</h2>
            </div>

            {!selectedFile && (
              <div
                className="drop-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById('sandbox-file').click()}
              >
                <input
                  type="file"
                  id="sandbox-file"
                  className="hidden-input"
                  onChange={handleFileSelect}
                  accept="image/*,video/*,.pdf,.docx,.doc"
                />
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <h3>Drag &amp; drop media file</h3>
                <p>PNG, JPG, MP4, WebM, PDF, DOCX up to 50MB</p>
                <button type="button" className="btn btn-secondary">Select File</button>
              </div>
            )}

            {selectedFile && (
              <div className="preview-container">
                <div className="media-viewport">
                  {mediaType === 'video' ? (
                    <video src={previewUrl} controls autoPlay muted loop />
                  ) : mediaType === 'document' ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "200px", padding: "2rem", textAlign: "center" }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "64px", height: "64px", color: "#60a5fa" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                      <h4 style={{ marginTop: "1rem", color: "#f3f4f6" }}>{selectedFile.name}</h4>
                      <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <img src={previewUrl} alt="Preview" />
                  )}
                </div>
                <button className="btn btn-secondary" onClick={resetSandbox}>Clear File</button>
              </div>
            )}
          </div>

          <div className="glass-card">
            <div className="panel-header">
              <h2>Analysis &amp; Sandbox Actions</h2>
            </div>

            {isProcessing && (
              <div className="detail-row">
                <label>Processing File</label>
                <div>Running cryptographic SHA-256 and visual perceptual hashing algorithms...</div>
              </div>
            )}

            {!isProcessing && !hashingResult && (
              <div className="detail-row">
                <label>Awaiting Upload</label>
                <div>Please upload a media file on the left panel to begin analysis.</div>
              </div>
            )}

            {hashingResult && (
              <div className="hashing-details">
                <div className="detail-row">
                  <label>Media Type</label>
                  <div className="hash-wrapper">
                    <span className="media-badge">{hashingResult.media_type}</span>
                  </div>
                </div>

                <div className="detail-row">
                  <label>File SHA-256</label>
                  <div className="hash-wrapper">
                    <code>{hashingResult.sha256}</code>
                  </div>
                </div>

                <div className="detail-row">
                  <label>Representative pHash (Decimal)</label>
                  <div className="hash-wrapper">
                    <code>{hashingResult.phash}</code>
                  </div>
                </div>

                <div className="detail-row">
                  <label>Representative pHash (Hex)</label>
                  <div className="hash-wrapper">
                    <code>{renderHexHash(hashingResult.phash)}</code>
                  </div>
                </div>

                {hashingResult.keyframes && hashingResult.keyframes.length > 0 && (
                  <div className="timeline-section">
                    <label className="section-label">Temporal pHash Sequence (1 FPS)</label>
                    <div className="timeline-wrapper">
                      {hashingResult.keyframes.map((kf, i) => (
                        <div className="timeline-node" key={i}>
                          <span>Offset: {kf.offset}s</span>
                          <code>{renderHexHash(kf.phash)}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'register' && (
                  <>
                    <div className="step-indicator">
                      <h4>On-Chain Commit Status</h4>
                      <div className="step-list">
                        {[
                          "File fingerprinting completed",
                          "Packaging metadata payload for IPFS",
                          "Awaiting transaction signature in wallet",
                          "Broadcasting to Arbitrum Sepolia",
                          "Transaction Confirmed",
                        ].map((label, i) => (
                          <div
                            key={i}
                            className={`step-node ${registrationStep > i + 1 ? 'done' : ''} ${registrationStep === i + 1 ? 'active' : ''}`}
                          >
                            <div className="step-circle">{i + 1}</div>
                            <span>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {txHash && (
                      <div className="detail-row">
                        <label>Arbitrum Sepolia Transaction</label>
                        <div className="hash-wrapper">
                          <a
                            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#3b82f6", textDecoration: "underline", fontFamily: "monospace", fontSize: "0.85rem" }}
                          >
                            {txHash.substring(0, 16)}...{txHash.substring(50)}
                          </a>
                        </div>
                      </div>
                    )}

                    <div style={{ margin: "1.5rem 0" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", color: "#e5e7eb", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={allowAiTraining}
                          onChange={(e) => setAllowAiTraining(e.target.checked)}
                          style={{ width: "1rem", height: "1rem" }}
                        />
                        Allow AI Model Training (Earn USDC Royalties)
                      </label>

                      <div style={{ marginTop: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.9rem", color: "#e5e7eb" }}>Notification Webhook URL (Optional)</label>
                        <input 
                          type="url" 
                          placeholder="e.g., Discord or Zapier Webhook URL"
                          className="form-control"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #374151", backgroundColor: "#1f2937", color: "white" }}
                        />
                        <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.25rem" }}>We will POST to this URL if someone verifies a matching asset.</p>
                      </div>

                      {parentSha256 && (
                        <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid rgba(99,102,241,0.5)", background: "rgba(99,102,241,0.1)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <p style={{ fontSize: "0.85rem", fontWeight: "700", color: "#a5b4fc", marginBottom: "0.25rem" }}>
                                🔗 Registering as a Fork / Derivative
                              </p>
                              <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                                Parent: <code style={{ color: "#818cf8" }}>{parentSha256.substring(0, 18)}...</code>
                              </p>
                              <p style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.2rem" }}>This asset will be linked to its parent in the provenance chain.</p>
                            </div>
                            <button
                              onClick={() => setParentSha256("")}
                              style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1rem", padding: "0", lineHeight: 1 }}
                              title="Clear fork — register as original"
                            >✕</button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: "1rem" }}>
                      {!isConnected ? (
                        <div style={{ textAlign: 'center' }}>
                          <ConnectButton label="Connect Wallet to Register" />
                        </div>
                      ) : registrationStep > 0 && registrationStep < 5 ? (
                        <button className="btn btn-primary btn-disabled" disabled>Registering Content...</button>
                      ) : registrationStep === 5 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          <div className="registration-success-summary" style={{
                            padding: "1.25rem",
                            borderRadius: "12px",
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                            textAlign: "left"
                          }}>
                            <h4 style={{ color: "#34d399", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "20px", height: "20px" }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              Asset Registration Success!
                            </h4>
                            
                             <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.90rem" }}>
                              <div>
                                <span style={{ color: "#9ca3af", display: "block", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Metadata IPFS JSON URL</span>
                                {registeredMetadataUrl.includes("Mock") ? (
                                  <span style={{ color: "#9ca3af", fontStyle: "italic", cursor: "help", fontSize: "0.85rem" }} title="IPFS upload failed, running in local fallback mode. File is fully preserved in local S3.">
                                    Mock IPFS link (Local fallback active)
                                  </span>
                                ) : (
                                  <a href={registeredMetadataUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "underline", wordBreak: "break-all" }}>
                                    {registeredMetadataUrl}
                                  </a>
                                )}
                              </div>
                              <div>
                                <span style={{ color: "#9ca3af", display: "block", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Raw Media IPFS URL</span>
                                {registeredMediaIpfsUrl.includes("Mock") ? (
                                  <span style={{ color: "#9ca3af", fontStyle: "italic", cursor: "help", fontSize: "0.85rem" }} title="IPFS upload failed, running in local fallback mode. File is fully preserved in local S3.">
                                    Mock IPFS link (Local fallback active)
                                  </span>
                                ) : (
                                  <a href={registeredMediaIpfsUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "underline", wordBreak: "break-all" }}>
                                    {registeredMediaIpfsUrl}
                                  </a>
                                )}
                              </div>
                              <div>
                                <span style={{ color: "#9ca3af", display: "block", fontSize: "0.8rem", marginBottom: "0.25rem" }}>Raw Media S3 CDN URL</span>
                                <a href={registeredMediaS3Url} target="_blank" rel="noopener noreferrer" style={{ color: "#60a5fa", textDecoration: "underline", wordBreak: "break-all" }}>
                                  {registeredMediaS3Url}
                                </a>
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            className="btn btn-primary"
                            onClick={() => generatePdfCertificate(hashingResult.sha256, walletAddress, registeredMediaS3Url, registeredMetadataUrl, registeredMediaIpfsUrl, txHash)}
                            style={{ width: "100%", padding: "0.75rem", fontSize: "0.9rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" }}
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "18px", height: "18px" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            Download Registration Certificate (PDF)
                          </button>
                          
                          <button className="btn btn-secondary" onClick={() => setRegistrationStep(0)}>Register Another Content</button>
                        </div>
                      ) : (
                        <button className="btn btn-primary" onClick={executeRegistration}>
                          Commit Fingerprint to Arbitrum Sepolia
                        </button>
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'verify' && (
                  <>
                    <div style={{ marginTop: "1rem" }}>
                      {verifying ? (
                        <button className="btn btn-primary btn-disabled" disabled>Verifying...</button>
                      ) : (
                        <button className="btn btn-primary" onClick={executeVerification}>Perform Verification Query</button>
                      )}
                    </div>

                    {verificationResult && (
                      <div style={{ marginTop: "1.5rem" }}>
                        {verificationResult.match_found ? (
                          verificationResult.exact_match ? (
                            <div className="outcome-card outcome-original">
                              <div className="outcome-header">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                </svg>
                                <h3>VERIFIED ORIGINAL</h3>
                              </div>
                              <div className="outcome-body">
                                <div>Cryptographic match successfully verified. This file is authentic and original.</div>
                                
                                <div style={{
                                  margin: "1rem 0",
                                  padding: "0.75rem",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  fontSize: "0.85rem",
                                  fontWeight: "600",
                                  backgroundColor: verificationResult.record.AllowAiTraining ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                  border: `1px solid ${verificationResult.record.AllowAiTraining ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                                  color: verificationResult.record.AllowAiTraining ? "#34d399" : "#f87171"
                                }}>
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "16px", height: "16px" }}>
                                    {verificationResult.record.AllowAiTraining ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    )}
                                  </svg>
                                  <span>{verificationResult.record.AllowAiTraining ? "AI MODEL TRAINING AUTHORIZED (USDC Royalties Active)" : "AI MODEL TRAINING FORBIDDEN (No Scraping Allowed)"}</span>
                                </div>

                                <div className="outcome-meta-grid">
                                  <div className="meta-box">
                                    <span>Registrant Owner</span>
                                    <strong title={verificationResult.record.CreatorAddress}>
                                      {verificationResult.record.CreatorAddress.substring(0, 6)}...{verificationResult.record.CreatorAddress.substring(38)}
                                    </strong>
                                  </div>
                                  <div className="meta-box">
                                    <span>Similarity Match</span>
                                    <strong>{verificationResult.similarity.toFixed(2)}%</strong>
                                  </div>
                                </div>

                                <div style={{ marginTop: "1rem" }}>
                                  <button 
                                    className="btn btn-primary" 
                                    style={{ width: "100%", padding: "0.5rem", fontSize: "0.85rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" }}
                                    onClick={() => downloadCertificate(verificationResult.record.Sha256Hash)}
                                  >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "16px", height: "16px" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download Verification Certificate (JSON)
                                  </button>
                                </div>

                                <div className="original-media-preview" style={{ marginTop: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.25rem" }}>
                                  <h4 style={{ color: "#e5e7eb", marginBottom: "0.75rem", fontSize: "0.85rem", fontWeight: "600" }}>Original Registered File Preview</h4>
                                  <div className="media-viewport" style={{
                                    width: "100%",
                                    height: "180px",
                                    overflow: "hidden",
                                    borderRadius: "8px",
                                    backgroundColor: "rgba(0,0,0,0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid rgba(255,255,255,0.05)"
                                  }}>
                                    {verificationResult.record.MediaType === 'video' ? (
                                      <video src={verificationResult.record.MediaS3Url || verificationResult.record.MediaIpfsUrl} controls style={{ width: "100%", maxHeight: "180px" }} />
                                    ) : verificationResult.record.MediaType === 'document' ? (
                                      <div style={{ padding: "1.5rem", textAlign: "center" }}>
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "40px", height: "40px", color: "#60a5fa", margin: "0 auto" }}>
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                        <div style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "0.5rem" }}>Registered Document</div>
                                      </div>
                                    ) : (
                                      <img src={verificationResult.record.MediaS3Url || verificationResult.record.MediaIpfsUrl} alt="Original Registered" style={{ width: "100%", height: "100%", objectFit: "contain", maxHeight: "180px" }} />
                                    )}
                                  </div>
                                  <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                                    <a
                                      href={verificationResult.record.MediaS3Url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary"
                                      style={{ flex: 1, textAlign: "center", fontSize: "0.75rem", padding: "0.4rem 0.75rem", textDecoration: "none", display: "inline-block" }}
                                    >
                                      View Original (S3)
                                    </a>
                                    {verificationResult.record.MediaIpfsUrl.includes("Mock") ? (
                                      <button
                                        className="btn btn-secondary"
                                        style={{ flex: 1, fontSize: "0.75rem", padding: "0.4rem 0.75rem", opacity: 0.5, cursor: "not-allowed" }}
                                        disabled
                                        title="IPFS source is not available for this record (running in local fallback mode). Please check S3 Cache."
                                      >
                                        IPFS Source Offline
                                      </button>
                                    ) : (
                                      <a
                                        href={verificationResult.record.MediaIpfsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary"
                                        style={{ flex: 1, textAlign: "center", fontSize: "0.75rem", padding: "0.4rem 0.75rem", textDecoration: "none", display: "inline-block", borderColor: "#3b82f6" }}
                                      >
                                        Verify IPFS Source
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="outcome-card outcome-derivative">
                              <div className="outcome-header">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                                <h3>DEVIANT COPY DETECTED</h3>
                              </div>
                              <div className="outcome-body">
                                <div>Fuzzy search matched visual hashes of registered parents. This file is a derivative/copy of a protected asset.</div>
                                
                                <div style={{
                                  margin: "1rem 0",
                                  padding: "0.75rem",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                  fontSize: "0.85rem",
                                  fontWeight: "600",
                                  backgroundColor: verificationResult.record.AllowAiTraining ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                                  border: `1px solid ${verificationResult.record.AllowAiTraining ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                                  color: verificationResult.record.AllowAiTraining ? "#34d399" : "#f87171"
                                }}>
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "16px", height: "16px" }}>
                                    {verificationResult.record.AllowAiTraining ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    )}
                                  </svg>
                                  <span>{verificationResult.record.AllowAiTraining ? "AI MODEL TRAINING AUTHORIZED (USDC Royalties Active)" : "AI MODEL TRAINING FORBIDDEN (No Scraping Allowed)"}</span>
                                </div>

                                <div className="outcome-meta-grid">
                                  <div className="meta-box">
                                    <span>Original Parent</span>
                                    <strong title={verificationResult.record.Sha256Hash}>
                                      {verificationResult.record.Sha256Hash.substring(0, 10)}...{verificationResult.record.Sha256Hash.substring(60)}
                                    </strong>
                                  </div>
                                  <div className="meta-box">
                                    <span>Visual Similarity</span>
                                    <strong>{verificationResult.similarity.toFixed(2)}%</strong>
                                  </div>
                                  {verificationResult.timestamp_offset !== undefined && (
                                    <div className="meta-box">
                                      <span>Matched Offset</span>
                                      <strong>
                                        {verificationResult.media_type === 'document'
                                          ? `Page ${verificationResult.timestamp_offset}`
                                          : `${verificationResult.timestamp_offset} seconds`}
                                      </strong>
                                    </div>
                                  )}
                                  <div className="meta-box">
                                    <span>Attribution Engine</span>
                                    <strong>{verificationResult.record.AiTool || "N/A"}</strong>
                                  </div>
                                </div>

                                <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                  <button 
                                    className="btn btn-secondary" 
                                    style={{ width: "100%", padding: "0.5rem", fontSize: "0.85rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
                                    onClick={() => downloadCertificate(verificationResult.record.Sha256Hash)}
                                  >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "16px", height: "16px" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    Download Parent Certificate
                                  </button>

                                  <button
                                    className="btn btn-primary"
                                    style={{ width: "100%", padding: "0.5rem", fontSize: "0.85rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                                    onClick={() => {
                                      setParentSha256(verificationResult.record.Sha256Hash);
                                      setActiveTab('register');
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                  >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "16px", height: "16px" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                                    Register This as a Fork (Declare Derivative)
                                  </button>

                                  <button
                                    className="btn btn-secondary"
                                    style={{ width: "100%", padding: "0.5rem", fontSize: "0.85rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", borderColor: "#6366f1", color: "#a5b4fc" }}
                                    onClick={async () => {
                                      setLineageLoading(true);
                                      setLineage(null);
                                      try {
                                        const res = await fetch(`${CORE_API_URL}/api/v1/content/${verificationResult.record.Sha256Hash}/lineage`);
                                        const data = await res.json();
                                        setLineage(data);
                                      } catch(e) {
                                        setLineage({ error: e.message });
                                      } finally {
                                        setLineageLoading(false);
                                      }
                                    }}
                                  >
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "16px", height: "16px" }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                                    View Provenance Chain
                                  </button>
                                </div>

                                <div className="original-media-preview" style={{ marginTop: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1.25rem" }}>
                                  <h4 style={{ color: "#e5e7eb", marginBottom: "0.75rem", fontSize: "0.85rem", fontWeight: "600" }}>Original Registered Parent File Preview</h4>
                                  <div className="media-viewport" style={{
                                    width: "100%",
                                    height: "180px",
                                    overflow: "hidden",
                                    borderRadius: "8px",
                                    backgroundColor: "rgba(0,0,0,0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid rgba(255,255,255,0.05)"
                                  }}>
                                    {verificationResult.record.MediaType === 'video' ? (
                                      <video src={verificationResult.record.MediaS3Url || verificationResult.record.MediaIpfsUrl} controls style={{ width: "100%", maxHeight: "180px" }} />
                                    ) : verificationResult.record.MediaType === 'document' ? (
                                      <div style={{ padding: "1.5rem", textAlign: "center" }}>
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "40px", height: "40px", color: "#60a5fa", margin: "0 auto" }}>
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                        <div style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "0.5rem" }}>Registered Document</div>
                                      </div>
                                    ) : (
                                      <img src={verificationResult.record.MediaS3Url || verificationResult.record.MediaIpfsUrl} alt="Original Parent" style={{ width: "100%", height: "100%", objectFit: "contain", maxHeight: "180px" }} />
                                    )}
                                  </div>
                                  
                                  <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                                    <a
                                      href={verificationResult.record.MediaS3Url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary"
                                      style={{ flex: 1, textAlign: "center", fontSize: "0.75rem", padding: "0.4rem 0.75rem", textDecoration: "none", display: "inline-block" }}
                                    >
                                      View Original (S3)
                                    </a>
                                    {verificationResult.record.MediaIpfsUrl.includes("Mock") ? (
                                      <button
                                        className="btn btn-secondary"
                                        style={{ flex: 1, fontSize: "0.75rem", padding: "0.4rem 0.75rem", opacity: 0.5, cursor: "not-allowed" }}
                                        disabled
                                        title="IPFS source is not available for this record (running in local fallback mode). Please check S3 Cache."
                                      >
                                        IPFS Source Offline
                                      </button>
                                    ) : (
                                      <a
                                        href={verificationResult.record.MediaIpfsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary"
                                        style={{ flex: 1, textAlign: "center", fontSize: "0.75rem", padding: "0.4rem 0.75rem", textDecoration: "none", display: "inline-block", borderColor: "#3b82f6" }}
                                      >
                                        Verify IPFS Source
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="outcome-card outcome-unregistered">
                            <div className="outcome-header">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              <h3>UNREGISTERED CONTENT</h3>
                            </div>
                            <div className="outcome-body">
                              <div>No cryptographic or perceptual visual fingerprints matching this file were found in the database.</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {(lineageLoading || lineage) && (
                      <div style={{ marginTop: "1.5rem", borderRadius: "12px", border: "1px solid rgba(99, 102, 241, 0.4)", background: "rgba(99, 102, 241, 0.05)", padding: "1.25rem" }}>
                        <h4 style={{ color: "#a5b4fc", fontSize: "0.9rem", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ width: "18px", height: "18px" }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
                          </svg>
                          Provenance Chain
                          {lineage?.depth && <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "400" }}>({lineage.depth} node{lineage.depth !== 1 ? 's' : ''})</span>}
                        </h4>

                        {lineageLoading && (
                          <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
                            <div style={{ width: "24px", height: "24px", border: "3px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                          </div>
                        )}

                        {lineage?.error && (
                          <div style={{ color: "#f87171", fontSize: "0.8rem" }}>Error: {lineage.error}</div>
                        )}

                        {lineage?.lineage && lineage.lineage.map((node, idx) => (
                          <div key={idx} style={{ position: "relative" }}>
                            <div style={{
                              background: idx === 0 ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                              border: idx === 0 ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.08)",
                              borderRadius: "8px",
                              padding: "0.75rem 1rem",
                              marginBottom: idx < lineage.lineage.length - 1 ? "0.25rem" : "0"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                    <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.5rem", borderRadius: "999px", fontWeight: "700",
                                      background: idx === 0 ? "rgba(99,102,241,0.3)" : node.ParentSha256 ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)",
                                      color: idx === 0 ? "#a5b4fc" : node.ParentSha256 ? "#fbbf24" : "#34d399"
                                    }}>
                                      {idx === 0 ? "QUERIED" : node.ParentSha256 ? "FORK" : "ROOT ORIGINAL"}
                                    </span>
                                    <code style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                                      {node.Sha256Hash?.substring(0, 14)}...
                                    </code>
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                    Creator: <span style={{ color: "#9ca3af" }}>{node.CreatorAddress?.substring(0, 8)}...{node.CreatorAddress?.substring(38)}</span>
                                  </div>
                                  {node.ParentSha256 && (
                                    <div style={{ fontSize: "0.7rem", color: "#6366f1", marginTop: "0.2rem" }}>
                                      ↳ Fork of: <code>{node.ParentSha256.substring(0, 14)}...</code>
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "#6b7280", textAlign: "right", whiteSpace: "nowrap" }}>
                                  {node.MediaType}
                                </div>
                              </div>
                            </div>
                            {idx < lineage.lineage.length - 1 && (
                              <div style={{ display: "flex", justifyContent: "center", padding: "0.15rem 0" }}>
                                <svg fill="none" stroke="#4b5563" viewBox="0 0 24 24" style={{ width: "16px", height: "16px" }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

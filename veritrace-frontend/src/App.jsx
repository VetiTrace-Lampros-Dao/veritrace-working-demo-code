import React, { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = "0x468edc5b2fe9d1c919f2377cbe0ccb16f32ead29";

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

  const [activeTab, setActiveTab] = useState("register");

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hashingResult, setHashingResult] = useState(null);

  const [registrationStep, setRegistrationStep] = useState(0);
  const [txHash, setTxHash] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

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

    fetch('http://localhost:8081/api/v1/hash', { method: 'POST', body: formData })
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
  };

  const executeRegistration = async () => {
    if (!isConnected || !walletClient) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      setRegistrationStep(1);
      setRegistrationStep(2);
      
      const metadataPayload = {
        sha256: hashingResult.sha256,
        representative_phash: Number(hashingResult.phash),
        keyframes: (hashingResult.keyframes || []).map(kf => ({
          offset: Number(kf.offset),
          phash: Number(kf.phash)
        }))
      };

      const pinResponse = await fetch("http://localhost:8080/api/v1/pin", {
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

    fetch(`http://localhost:8080/api/v1/verify/exact?hash=${hashingResult.sha256}`)
      .then(res => res.json())
      .then(exactRes => {
        if (exactRes.match_found) {
          setVerificationResult(exactRes);
          setVerifying(false);
        } else {
          fetch(`http://localhost:8080/api/v1/verify/fuzzy?phash=${hashingResult.phash}`)
            .then(res => res.json())
            .then(fuzzyRes => { setVerificationResult(fuzzyRes); setVerifying(false); })
            .catch(err => { alert("Fuzzy search error: " + err.message); setVerifying(false); });
        }
      })
      .catch(err => { alert("Exact verification error: " + err.message); setVerifying(false); });
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

                    <div style={{ marginTop: "1rem" }}>
                      {!isConnected ? (
                        <div style={{ textAlign: 'center' }}>
                          <ConnectButton label="Connect Wallet to Register" />
                        </div>
                      ) : registrationStep > 0 && registrationStep < 5 ? (
                        <button className="btn btn-primary btn-disabled" disabled>Registering Content...</button>
                      ) : registrationStep === 5 ? (
                        <button className="btn btn-success" onClick={() => setRegistrationStep(0)}>Register Another Content</button>
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

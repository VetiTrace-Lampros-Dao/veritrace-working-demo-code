/**
 * UploadContext.jsx — Global React Context for Upload Hashing State Persistence
 * 
 * By moving the upload state, progress tracking, and hashes up to this 
 * context provider, uploads will not be aborted or cancelled when users
 * navigate between pages. When a user returns to a page, they will see
 * the current live upload state (progress or hashes).
 */
import { createContext, useContext, useState } from 'react'

const UploadContext = createContext(null)

export function UploadProvider({ children }) {
  // ─────────────────────────────────────────────────────────────
  // Registration Page Global State
  // ─────────────────────────────────────────────────────────────
  const [regFile, setRegFile] = useState(null)
  const [regStep, setRegStep] = useState(1)
  const [regProcessing, setRegProcessing] = useState(false)
  const [regUploadProgress, setRegUploadProgress] = useState(0)
  const [regSigning, setRegSigning] = useState(false)
  const [regAiCategory, setRegAiCategory] = useState('None (Authentic Content)')
  const [regAiTool, setRegAiTool] = useState('')
  const [regHashes, setRegHashes] = useState({
    sha256: null,
    phash: null,
    hashCount: null,
    assetId: null,
    mediaType: null,
  })
  const [regTxResult, setRegTxResult] = useState(null)
  const [regError, setRegError] = useState(null)

  // ─────────────────────────────────────────────────────────────
  // Verification Page Global State
  // ─────────────────────────────────────────────────────────────
  const [verFile, setVerFile] = useState(null)
  const [verLoading, setVerLoading] = useState(false)
  const [verUploadProgress, setVerUploadProgress] = useState(0)
  const [verError, setVerError] = useState(null)
  const [verLocalSha256, setVerLocalSha256] = useState(null)
  const [verPhash, setVerPhash] = useState(null)
  const [verBlockchainRecord, setVerBlockchainRecord] = useState(null)
  const [verDbResults, setVerDbResults] = useState(null)

  return (
    <UploadContext.Provider
      value={{
        // Reg states & actions
        regFile, setRegFile,
        regStep, setRegStep,
        regProcessing, setRegProcessing,
        regUploadProgress, setRegUploadProgress,
        regSigning, setRegSigning,
        regAiCategory, setRegAiCategory,
        regAiTool, setRegAiTool,
        regHashes, setRegHashes,
        regTxResult, setRegTxResult,
        regError, setRegError,

        // Verify states & actions
        verFile, setVerFile,
        verLoading, setVerLoading,
        verUploadProgress, setVerUploadProgress,
        verError, setVerError,
        verLocalSha256, setVerLocalSha256,
        verPhash, setVerPhash,
        verBlockchainRecord, setVerBlockchainRecord,
        verDbResults, setVerDbResults,
      }}
    >
      {children}
    </UploadContext.Provider>
  )
}

export function useUpload() {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider')
  }
  return context
}

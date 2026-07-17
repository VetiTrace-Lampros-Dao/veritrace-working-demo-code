/**
 * HashDisplay.jsx — Displays a labeled hash value with copy-to-clipboard
 * 
 * Used to show SHA-256 cryptographic hashes and perceptual hashes
 * in a styled monospace box with a one-click copy button that provides
 * visual feedback (checkmark) on successful copy.
 * 
 * Props:
 *   label    — descriptive label shown above the hash (e.g. "SHA-256 Cryptographic Hash")
 *   hash     — the hash string to display (or null for placeholder state)
 *   icon     — single character badge shown next to label (e.g. "C" for crypto, "P" for perceptual)
 *   variant  — "crypto" or "perceptual" to control the badge color theme
 */
import { useState } from 'react'

export default function HashDisplay({ label, hash, icon, variant }) {
  const [copied, setCopied] = useState(false)

  /**
   * handleCopy — Copies the hash string to clipboard.
   * Shows a checkmark for 2 seconds as visual feedback.
   */
  const handleCopy = async () => {
    if (!hash) return
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // ── Color schemes for the icon badge ──
  const variantColors = {
    crypto:     { bg: 'var(--color-accent-bg)', icon: 'var(--color-accent)' },
    perceptual: { bg: 'var(--color-success-bg)', icon: 'var(--color-success)' },
  }
  const colors = variantColors[variant] || variantColors.crypto

  return (
    <div className="hash-display animate-fade-in">
      {/* ── Label row with colored badge ── */}
      <div className="hash-label">
        {icon && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: colors.bg,
            color: colors.icon,
            fontSize: '0.6875rem',
            fontWeight: 700,
          }}>
            {icon}
          </span>
        )}
        {label}
      </div>

      {/* ── Hash value row ── */}
      {hash ? (
        <div className="hash-value">
          <span style={{ flex: 1, wordBreak: 'break-all' }}>{hash}</span>
          {/* Copy button — toggles between clipboard and checkmark icons */}
          <button className="copy-btn" onClick={handleCopy} title="Copy to clipboard">
            {copied ? (
              /* Green checkmark after copy */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00c9a7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              /* Clipboard icon */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </button>
        </div>
      ) : (
        /* Placeholder when no hash is computed yet */
        <div className="hash-value" style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Awaiting file upload...
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CopyButton({ text, className, size = 14 }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex-shrink-0 w-7 h-7 rounded-lg border border-[var(--border)] bg-[var(--bg-2)] flex items-center justify-center text-[var(--text-3)] transition-all hover:border-[#12AAFF] hover:text-[#12AAFF]',
        className
      )}
      title="Copy to clipboard"
    >
      {copied ? <Check size={size} className="text-[#00D395]" /> : <Copy size={size} />}
    </button>
  )
}

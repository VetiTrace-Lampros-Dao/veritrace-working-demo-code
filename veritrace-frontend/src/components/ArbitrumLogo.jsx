import { motion } from 'framer-motion'

/** ArbitrumLogo — official "A" mark with optional animated glow */
export function ArbitrumLogo({ size = 24, className, animated = false }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      animate={animated ? { filter: ['drop-shadow(0 0 4px #12AAFF60)', 'drop-shadow(0 0 10px #12AAFF90)', 'drop-shadow(0 0 4px #12AAFF60)'] } : undefined}
      transition={animated ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      <path d="M3.5 20.5L9.5 3.5H14.5L20.5 20.5H16.5L15.3 17H8.7L7.5 20.5H3.5ZM9.9 13.7H14.1L12 7.2L9.9 13.7Z" fill="#12AAFF" />
    </motion.svg>
  )
}

/** VeriTraceLogo — V-checkmark with digital pixel dispersion (matches brand image) */
export function VeriTraceLogo({ size = 32, className }) {
  // Unique ID per instance to avoid SVG gradient conflicts when multiple logos render
  const uid = `vt-${size}-${Math.random().toString(36).slice(2, 6)}`
  return (
    <div className={`flex items-center justify-center ${className || ''}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 2px 12px rgba(18,170,255,0.25))' }}
      >
        <defs>
          <linearGradient id={`${uid}-grad`} x1="85%" y1="5%" x2="15%" y2="95%">
            <stop offset="0%" stopColor="#7dd3fc" />
            <stop offset="35%" stopColor="#38bdf8" />
            <stop offset="65%" stopColor="#12AAFF" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* ── Left Leg of V (white / currentColor) ── */}
        <path d="M28 24 L44 24 L52 64 L56 76 L40 76 L36 64 Z" fill="currentColor" />

        {/* ── Right Leg / Checkmark (blue gradient, overlaps left leg) ── */}
        <path d="M36 56 L44 56 L56 76 L52 64 L88 24 L76 24 L48 60 Z" fill={`url(#${uid}-grad)`} />

        {/* ── Pixel Dispersion Trail — 3 size tiers for depth ── */}
        {/* Large particles (foreground) */}
        <rect x="82"  y="22" width="4" height="4" rx="0.6" fill="#38bdf8" opacity="0.95" />
        <rect x="88"  y="18" width="3.5" height="3.5" rx="0.5" fill="#12AAFF" opacity="0.9" />
        <rect x="84"  y="14" width="3.5" height="3.5" rx="0.5" fill="#7dd3fc" opacity="0.85" />
        <rect x="78"  y="17" width="3" height="3" rx="0.4" fill="#1d4ed8" opacity="0.8" />

        {/* Medium particles (mid-ground) */}
        <rect x="92"  y="22" width="2.8" height="2.8" rx="0.4" fill="#38bdf8" opacity="0.75" />
        <rect x="90"  y="14" width="2.5" height="2.5" rx="0.3" fill="#12AAFF" opacity="0.7" />
        <rect x="86"  y="10" width="2.5" height="2.5" rx="0.3" fill="#7dd3fc" opacity="0.7" />
        <rect x="80"  y="10" width="2.5" height="2.5" rx="0.3" fill="#1d4ed8" opacity="0.65" />
        <rect x="94"  y="16" width="2.2" height="2.2" rx="0.3" fill="#38bdf8" opacity="0.6" />

        {/* Small particles (background, fading) */}
        <rect x="96"  y="20" width="1.8" height="1.8" rx="0.2" fill="#7dd3fc" opacity="0.5" />
        <rect x="92"  y="10" width="1.6" height="1.6" rx="0.2" fill="#12AAFF" opacity="0.45" />
        <rect x="88"  y="7"  width="1.8" height="1.8" rx="0.2" fill="#38bdf8" opacity="0.4" />
        <rect x="84"  y="6"  width="1.4" height="1.4" rx="0.2" fill="#7dd3fc" opacity="0.35" />
        <rect x="96"  y="12" width="1.5" height="1.5" rx="0.2" fill="#1d4ed8" opacity="0.35" />
        <rect x="98"  y="16" width="1.2" height="1.2" rx="0.2" fill="#38bdf8" opacity="0.3" />
        <rect x="90"  y="5"  width="1.2" height="1.2" rx="0.2" fill="#12AAFF" opacity="0.25" />
      </svg>
    </div>
  )
}

/** AnimatedArbitrumBadge — pill badge with rotating ring + glow */
export function AnimatedArbitrumBadge({ text }) {
  return (
    <div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(18,170,255,0.1)', border: '1px solid rgba(18,170,255,0.3)' }}>
      {/* Animated rotating ring behind logo */}
      <div className="relative w-5 h-5 flex items-center justify-center flex-shrink-0">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1.5px solid rgba(18,170,255,0.5)', borderTopColor: '#12AAFF', borderRightColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <ArbitrumLogo size={12} animated />
      </div>
      <span style={{ color: '#12AAFF' }}>{text}</span>
    </div>
  )
}

/** AnimatedNetworkBadge — live dot with pulse for network status */
export function AnimatedNetworkBadge({ text }) {
  return (
    <div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(0,211,149,0.1)', border: '1px solid rgba(0,211,149,0.3)' }}>
      <div className="relative w-4 h-4 flex items-center justify-center flex-shrink-0">
        {/* Expanding ring pulse */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: 'rgba(0,211,149,0.3)' }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="w-2 h-2 rounded-full bg-[#00D395] shadow-[0_0_8px_#00D395] flex-shrink-0" />
      </div>
      <span style={{ color: '#00D395' }}>{text}</span>
    </div>
  )
}

/** ArbitrumOrbit — concentric orbit rings */
export function ArbitrumOrbit({ size = 200, className }) {
  return (
    <div className={`relative ${className || ''}`} style={{ width: size, height: size }}>
      <div className="absolute inset-0 arb-ring" />
      <div className="absolute inset-[15%] arb-ring" style={{ animationDirection: 'reverse', animationDuration: '15s' }} />
      {[0, 120, 240].map((angle, i) => (
        <motion.div key={i} className="absolute top-1/2 left-1/2" animate={{ rotate: 360 }} transition={{ duration: 20 + i * 5, repeat: Infinity, ease: 'linear' }}>
          <div style={{ transform: `rotate(${angle}deg) translateX(${size / 2 - 12}px) rotate(-${angle}deg)` }}>
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 20 + i * 5, repeat: Infinity, ease: 'linear' }}>
              <ArbitrumLogo size={20} animated />
            </motion.div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

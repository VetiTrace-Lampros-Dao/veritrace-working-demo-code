import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * AuroraBackground — Animated gradient aurora behind content
 */
export function AuroraBackground({ children, className }) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 aurora opacity-60" />
      <div className="absolute inset-0 grid-pattern grid-breathe" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/**
 * GlowCard — Card with animated glowing border
 */
export function GlowCard({ children, className, color = '#12AAFF' }) {
  return (
    <div className={cn('animated-border', className)}>
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}

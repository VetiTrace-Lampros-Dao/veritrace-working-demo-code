import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * BeamLine — Animated horizontal beam (data flowing left to right)
 */
export function BeamLine({ className, color = '#12AAFF', duration = 2.5, delay = 0 }) {
  return (
    <div className={cn('relative h-px w-full overflow-hidden', className)} style={{ background: 'var(--border)' }}>
      <motion.div
        className="absolute top-0 h-full"
        style={{
          width: '40%',
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 8px ${color}`,
        }}
        initial={{ left: '-40%' }}
        animate={{ left: '100%' }}
        transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

/**
 * AnimatedBeam — Vertical beam connecting nodes
 */
export function AnimatedBeam({ className, color = '#12AAFF', duration = 2 }) {
  return (
    <div className={cn('relative w-px flex-1 overflow-hidden', className)} style={{ background: 'var(--border)' }}>
      <motion.div
        className="absolute left-0 w-full"
        style={{
          height: '30%',
          background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 8px ${color}`,
        }}
        initial={{ top: '-30%' }}
        animate={{ top: '100%' }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

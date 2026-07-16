import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * BentoGrid — Aceternity-style bento grid with animated items
 */
export function BentoGrid({ children, className }) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4', className)}>
      {children}
    </div>
  )
}

export function BentoCard({ children, className, span = 'col-span-1', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay }}
      className={cn('glass-card rounded-2xl p-5', span, className)}
    >
      {children}
    </motion.div>
  )
}

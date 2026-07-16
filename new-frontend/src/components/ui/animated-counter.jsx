import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function AnimatedCounter({ value, duration = 1, suffix = '', className }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {typeof value === 'number' ? value.toLocaleString() : value}
      {suffix}
    </motion.span>
  )
}

import { TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Info, Circle as XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle }
const styles = {
  info: 'bg-[var(--arb-bg)] text-[#12AAFF] border-[var(--arb-border)]',
  success: 'bg-[var(--success-bg)] text-[#00D395] border-[var(--success-border)]',
  warning: 'bg-[rgba(255,155,0,0.08)] text-[#FF9B00] border-[rgba(255,155,0,0.25)]',
  danger: 'bg-[var(--danger-bg)] text-[#FF4D4D] border-[var(--danger-border)]',
}

export function Alert({ variant = 'info', children, className }) {
  const Icon = icons[variant] || Info
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }} className={cn('flex gap-3 p-3.5 rounded-xl border text-sm leading-relaxed', styles[variant], className)}>
      <Icon size={18} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </motion.div>
  )
}

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export function Card({ className, children, hover = false, ...props }) {
  const isInteractive = hover || className?.includes('card-hover-glow')
  return (
    <motion.div
      data-card-surface
      whileHover={isInteractive ? { y: -6, scale: 1.01 } : undefined}
      transition={isInteractive ? { type: 'spring', stiffness: 200, damping: 20 } : undefined}
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-colors duration-300',
        hover && 'hover:border-[var(--border-2)] hover:shadow-lg',
        className
      )}
      {...props}
    >
      {children}
      </motion.div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex items-center justify-between px-5 py-4 border-b border-[var(--border)]', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('card-title text-sm font-bold flex items-center gap-2 text-[var(--text)]', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardBody({ className, children, ...props }) {
  return <div className={cn('p-5', className)} {...props}>{children}</div>
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div className={cn('flex items-center px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-2)]', className)} {...props}>
      {children}
    </div>
  )
}

import { cn } from '@/lib/utils'

export function Progress({ value = 0, className }) {
  return (
    <div className={cn('w-full h-2 rounded-full bg-[var(--bg-3)] overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: 'linear-gradient(90deg, #12AAFF, #00D395)',
        }}
      />
    </div>
  )
}

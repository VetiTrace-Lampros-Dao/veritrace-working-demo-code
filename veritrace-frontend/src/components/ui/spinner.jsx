import { cn } from '@/lib/utils'

export function Spinner({ size = 24, className }) {
  return (
    <div
      className={cn('animate-spin rounded-full border-2 border-[var(--bg-3)]', className)}
      style={{
        width: size,
        height: size,
        borderTopColor: '#12AAFF',
      }}
    />
  )
}

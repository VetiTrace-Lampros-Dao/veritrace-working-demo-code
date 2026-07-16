import { cn } from '@/lib/utils'

export function EmptyState({ icon, title, description, children, className }) {
  return (
    <div className={cn('text-center py-12 px-4', className)}>
      <div className="w-14 h-14 rounded-full bg-[var(--bg-2)] flex items-center justify-center mx-auto mb-4 text-[var(--text-3)]">
        {icon}
      </div>
      <div className="font-semibold text-sm mb-1.5 text-[var(--text)]">{title}</div>
      <div className="text-xs text-[var(--text-3)] max-w-sm mx-auto leading-relaxed">{description}</div>
      {children}
    </div>
  )
}

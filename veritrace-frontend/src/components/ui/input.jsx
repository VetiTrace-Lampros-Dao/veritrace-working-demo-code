import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-4)] transition-all focus:border-[#12AAFF] focus:ring-2 focus:ring-[rgba(18,170,255,0.15)] outline-none', className)} {...props} />
))
Input.displayName = 'Input'

export const Select = forwardRef(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn('w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)] transition-all focus:border-[#12AAFF] outline-none cursor-pointer', className)} {...props}>
    {children}
  </select>
))
Select.displayName = 'Select'

export const Textarea = forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-4)] transition-all focus:border-[#12AAFF] outline-none resize-none', className)} {...props} />
))
Textarea.displayName = 'Textarea'

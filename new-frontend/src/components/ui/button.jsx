import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary: 'text-white shadow-md hover:shadow-lg',
        success: 'text-black font-bold shadow-md hover:shadow-lg',
        outline: 'border bg-transparent hover:bg-[var(--bg-2)]',
        ghost: 'bg-transparent hover:bg-[var(--bg-2)]',
        danger: 'text-white shadow-md hover:shadow-lg',
        glass: 'glass hover:shadow-md',
      },
      size: {
        sm: 'text-xs px-3 py-1.5',
        md: 'text-sm px-4 py-2.5',
        lg: 'text-base px-6 py-3',
        icon: 'p-2',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

const variantStyles = {
  primary: { background: 'linear-gradient(135deg, #12AAFF, #1B4ADD)' },
  success: { background: 'linear-gradient(135deg, #00D395, #00F5A8)' },
  outline: { borderColor: 'var(--border-2)', color: 'var(--text-2)' },
  ghost: { color: 'var(--text-2)' },
  danger: { background: 'linear-gradient(135deg, #FF4D4D, #FF6B6B)' },
  glass: { color: 'var(--text)' },
}

export const Button = forwardRef(({ className, variant, size, style, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    />
  )
})
Button.displayName = 'Button'

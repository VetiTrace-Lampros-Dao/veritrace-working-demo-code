import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * TextReveal — Word-by-word blur reveal animation
 */
export function TextReveal({ text, className, delay = 0, stagger = 0.06 }) {
  const words = text.split(' ')
  return (
    <span className={cn('word-reveal', className)}>
      {words.map((word, i) => (
        <span
          key={i}
          style={{ animationDelay: `${delay + i * stagger}s` }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </span>
      ))}
    </span>
  )
}

/**
 * AnimatedGradientText — Robinhood-style animated gradient text
 */
export function AnimatedGradientText({ children, className }) {
  return (
    <span className={cn('shimmer-text', className)}>
      {children}
    </span>
  )
}

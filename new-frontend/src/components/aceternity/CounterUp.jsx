import { motion, useInView } from 'framer-motion'
import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function CounterUp({ value, duration = 1.5, suffix = '', className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      className={cn(className)}
    >
      <motion.span
        initial={{ y: 8 }}
        animate={inView ? { y: 0 } : {}}
        transition={{ duration: 0.4 }}
      >
        {inView ? <CountTo value={value} duration={duration} /> : 0}
        {suffix}
      </motion.span>
    </motion.span>
  )
}

function CountTo({ value, duration }) {
  const ref = useRef(null)

  useEffect(() => {
    let raf
    let start
    const animate = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      if (ref.current) {
        ref.current.textContent = Math.floor(eased * value).toLocaleString()
      }
      if (progress < 1) raf = requestAnimationFrame(animate)
      else if (ref.current) ref.current.textContent = value.toLocaleString()
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span ref={ref}>0</span>
}

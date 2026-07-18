import { cn } from "@/lib/utils"
import { motion } from 'framer-motion'

function Skeleton({
  className,
  ...props
}) {
  return (
    <motion.div
      className={cn("skeleton rounded-md", className)}
      initial={{ opacity: .55 }}
      animate={{ opacity: [.5, 1, .5], backgroundPosition: ['200% 0', '-200% 0'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      {...props} />
  );
}

export { Skeleton }

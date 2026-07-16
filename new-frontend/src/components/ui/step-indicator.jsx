import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center flex-wrap gap-0 mb-8">
      {steps.map((step, i) => {
        const stepNum = i + 1
        const isCompleted = currentStep > stepNum
        const isActive = currentStep === stepNum
        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-2 px-2">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  backgroundColor: isCompleted ? 'rgba(0,211,149,0.15)' : isActive ? 'rgba(18,170,255,0.15)' : 'var(--bg-2)',
                  borderColor: isCompleted ? 'rgba(0,211,149,0.5)' : isActive ? 'rgba(18,170,255,0.5)' : 'var(--border)',
                }}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300',
                  isCompleted ? 'text-[#00D395]' : isActive ? 'text-[#12AAFF]' : 'text-[var(--text-4)]'
                )}
              >
                {isCompleted ? <Check size={14} /> : stepNum}
              </motion.div>
              <span className={cn(
                'text-xs font-semibold transition-colors duration-200',
                isCompleted ? 'text-[#00D395]' : isActive ? 'text-[#12AAFF]' : 'text-[var(--text-4)]'
              )}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('w-8 h-0.5 rounded-full transition-colors duration-300', isCompleted ? 'bg-[#00D395]/50' : 'bg-[var(--border)]')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

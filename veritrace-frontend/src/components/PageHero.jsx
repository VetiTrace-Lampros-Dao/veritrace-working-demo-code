import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PageHero({ eyebrow = 'VERITRACE PROTOCOL', title, description, icon: Icon, children, className }) {
  return (
    <section className={cn('page-hero', className)}>
      <div className="page-hero-lines" aria-hidden="true" />
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 py-9 md:py-12">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45 }}>
          <div className="page-eyebrow"><Sparkles size={12} /> {eyebrow}</div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div className="max-w-3xl">
              <h1 className="page-title">
                {Icon && <span className="page-title-icon"><Icon size={25} /></span>}
                {title}
              </h1>
              <p className="page-description">{description}</p>
            </div>
            {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

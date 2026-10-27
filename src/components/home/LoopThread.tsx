import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE_PREMIUM } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * The seam between the stage and the page below: three strands in the
 * role colours, drawn one after another as the seam scrolls into view — the
 * loop from the hero, unrolled into a line the rest of the page hangs from.
 */
export function LoopThread({
  className,
  ...rest
}: { className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const reduce = useReducedMotion() ?? false
  const strands = ['bg-role-teacher', 'bg-role-student', 'bg-role-parent']
  return (
    <div className={cn('flex h-1 w-full', className)} aria-hidden {...rest}>
      {strands.map((bg, i) => (
        <motion.span
          key={bg}
          className={cn('h-full flex-1 origin-[var(--o)] ltr:[--o:left] rtl:[--o:right]', bg)}
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '0px 0px -40px 0px' }}
          transition={{ duration: 0.7, delay: i * 0.35, ease: EASE_PREMIUM }}
        />
      ))}
    </div>
  )
}

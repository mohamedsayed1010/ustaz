import * as React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { LogoMark } from '@/components/brand/Logo'
import { EASE_DRAW, EASE_PREMIUM } from '@/lib/motion'
import { useEnteredView, useMotionSafe } from '@/hooks/use-motion'
import { cn } from '@/lib/utils'
import { LoopThread } from '@/components/home/LoopThread'

/**
 * Final call to action — convergence.
 *
 * The page opened on a loop of three roles that never stops turning. It closes
 * by gathering them: three strands in the role colours draw in from the edges
 * of the band and meet at the USTAZ mark. When the last one arrives the mark
 * locks — a single ring goes out from it — and the primary button takes one
 * slow sweep of light. Then everything holds still. Hovering the button
 * brightens the strands, tying the action back to the people it connects.
 *
 * One pass, no loops; under reduced motion the strands are simply drawn.
 */

/* 800×220 box, converging on (400, 212) — the top edge of the mark below. */
const STRANDS = [
  { role: 'teacher', d: 'M400 0 C 400 70, 400 140, 400 212', delay: 0 },
  { role: 'student', d: 'M0 70 C 180 70, 330 110, 400 212', delay: 0.25 },
  { role: 'parent', d: 'M800 70 C 620 70, 470 110, 400 212', delay: 0.5 },
] as const

const STRAND_COLOR = {
  teacher: 'hsl(var(--role-teacher))',
  student: 'hsl(var(--role-student))',
  parent: 'hsl(var(--role-parent))',
}

export function FinalCta() {
  const { locale, isRtl } = useI18n()
  const ar = locale === 'ar-EG'
  const { reduce } = useMotionSafe()
  const ref = React.useRef<HTMLDivElement>(null)
  const entered = useEnteredView(ref, '0px 0px -25% 0px')
  const [ctaHot, setCtaHot] = React.useState(false)

  const go = entered || reduce
  const arrive = 1.2 + 0.5 /* last strand's delay + its draw */

  return (
    <section className="stage relative overflow-hidden">
      <LoopThread />
      <div className="pb-section pt-10 sm:pt-14">
        <div ref={ref} className="container-page relative">
          <div className="mx-auto max-w-2xl text-center">
            {/* the strands — student enters from the reading start, parent from the end */}
            <svg
              viewBox="0 0 800 220"
              className={cn('mx-auto block h-auto w-full max-w-xl overflow-visible', isRtl && '-scale-x-100')}
              aria-hidden
            >
              {STRANDS.map((s) => (
                <g key={s.role}>
                  <path d={s.d} fill="none" stroke="hsl(var(--stage-line))" strokeWidth={1} />
                  <motion.path
                    d={s.d}
                    fill="none"
                    stroke={STRAND_COLOR[s.role]}
                    strokeLinecap="round"
                    initial={reduce ? false : { pathLength: 0 }}
                    animate={{
                      pathLength: go ? 1 : 0,
                      strokeWidth: ctaHot ? 3 : 2,
                      strokeOpacity: ctaHot ? 1 : 0.8,
                    }}
                    transition={{
                      pathLength: { duration: 1.2, delay: s.delay, ease: EASE_DRAW },
                      strokeWidth: { duration: 0.25 },
                      strokeOpacity: { duration: 0.25 },
                    }}
                  />
                </g>
              ))}
            </svg>

            {/* the mark the strands meet at */}
            <span className="relative mx-auto -mt-1 grid size-20 place-items-center rounded-2xl border border-stage-line bg-stage-raised">
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-2xl border-2 border-brand"
                initial={reduce ? false : { opacity: 0 }}
                animate={go ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.4, delay: reduce ? 0 : arrive }}
              />
              {!reduce && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl border border-brand"
                  initial={{ opacity: 0, scale: 1 }}
                  animate={go ? { opacity: [0, 0.7, 0], scale: [1, 1.6, 1.9] } : undefined}
                  transition={{ duration: 1.1, delay: arrive, ease: EASE_PREMIUM }}
                />
              )}
              <motion.span
                className="relative"
                initial={reduce ? false : { scale: 0.86 }}
                animate={go ? { scale: 1 } : undefined}
                transition={{ type: 'spring', stiffness: 320, damping: 16, delay: reduce ? 0 : arrive }}
              >
                <LogoMark className="size-11" />
              </motion.span>
            </span>

            <h2 className="mt-8 text-display-lg text-stage-foreground">
              {ar ? 'مساحة عملك جاهزة في أقل من نص ساعة.' : 'Your workspace is live in under half an hour.'}
            </h2>

            <p className="mt-5 text-body-lg text-stage-muted">
              {ar
                ? 'ابدأ مجانًا، ضيف مجموعاتك، وابعت لينك بروفايلك لطلابك. من غير كارت ائتمان ومن غير أي التزام.'
                : 'Start free, add your groups, and share your profile link with your students. No card, no commitment.'}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="xl"
                className="group relative overflow-hidden"
                onMouseEnter={() => setCtaHot(true)}
                onMouseLeave={() => setCtaHot(false)}
                onFocus={() => setCtaHot(true)}
                onBlur={() => setCtaHot(false)}
              >
                <Link to="/register">
                  {/* one sweep of light once the mark locks, then still */}
                  {!reduce && (
                    <motion.span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[hsl(var(--primary-foreground)/0.22)] to-transparent"
                      initial={{ left: '-40%' }}
                      animate={go ? { left: '110%' } : undefined}
                      transition={{ duration: 0.9, delay: arrive + 0.35, ease: EASE_PREMIUM }}
                    />
                  )}
                  <span className="relative">{ar ? 'ابدأ مجانًا' : 'Start free'}</span>
                  <ArrowRight className="relative size-5 flip-rtl transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="inverse">
                <Link to="/teachers">{ar ? 'اتفرّج على المدرّسين' : 'Browse teachers'}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

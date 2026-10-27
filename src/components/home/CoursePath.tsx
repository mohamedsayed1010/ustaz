import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Award, ListChecks, PlayCircle } from 'lucide-react'
import { coursesApi } from '@/api/endpoints/catalog'
import { qk } from '@/lib/query-client'
import { useI18n } from '@/i18n'
import { SectionHeading } from '@/components/common/SectionHeading'
import { RevealGroup, RevealItem } from '@/components/common/Reveal'
import { CourseCard } from '@/components/courses/CourseCard'
import { CardGridSkeleton } from '@/components/ui/skeleton'
import { EASE_DRAW, EASE_PREMIUM } from '@/lib/motion'
import { useEnteredView, useMotionSafe, useOnScreen, useStepSequence } from '@/hooks/use-motion'
import { cn } from '@/lib/utils'

/**
 * Courses — the path.
 *
 * Above the course cards, a route draws itself through the three things every
 * recorded course on USTAZ actually has: lessons arranged in sections, progress
 * saved lesson by lesson, and a completion certificate anyone can verify. The
 * pen stops at each milestone, the milestone switches on, and the pen moves on
 * — the shape of a course, told before you pick one. No grades, no outcomes,
 * no numbers that aren't in the data.
 *
 * The cards below are never held back by the path; they reveal on their own.
 */

/* A gentle wave across a 1000×80 box, crossing the midline at each milestone. */
const PATH = 'M0 40 C 55 8, 111 8, 166.6 40 S 278 72, 333.3 40 S 444 8, 500 40 S 611 72, 666.6 40 S 778 8, 833.3 40 S 944 72, 1000 40'
const STOPS = [1 / 6, 3 / 6, 5 / 6]

export function CoursesSection() {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'

  const courses = useQuery({
    queryKey: qk.courses.list({ PageSize: 6, Sort: 'featured' }),
    queryFn: () => coursesApi.list({ PageSize: 6, Sort: 'featured' }),
  })
  const items = courses.data?.items ?? []
  if (!courses.isPending && items.length === 0) return null

  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('nav.courses')}
          title={ar ? 'كورسات مسجّلة تذاكر منها في أي وقت' : 'Recorded courses you can study any time'}
          description={
            ar
              ? 'مراجعات نهائية، تأسيس، وحل مسائل — بمحتوى منظّم وشهادة إتمام.'
              : 'Revision, foundations, and problem solving — structured content with a completion certificate.'
          }
          action={{ label: t('common.viewAll'), href: '/courses' }}
        />

        <CourseRoute />

        {courses.isPending ? (
          <CardGridSkeleton count={3} className="mt-10" />
        ) : (
          <RevealGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((course) => (
              <RevealItem key={course.id} className="h-full" variants={dropFromPath}>
                <CourseCard course={course} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  )
}

/** Cards settle down off the route, rather than rising from below. */
const dropFromPath = {
  hidden: { opacity: 0, y: -14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_PREMIUM } },
}

function CourseRoute() {
  const { locale, isRtl } = useI18n()
  const ar = locale === 'ar-EG'
  const { reduce } = useMotionSafe()
  const ref = React.useRef<HTMLDivElement>(null)
  const entered = useEnteredView(ref)
  const onScreen = useOnScreen(ref)
  /* steps 0–2 reach each milestone; step 3 runs the pen off toward the cards */
  const pen = useStepSequence({ count: 4, interval: 1050, start: entered, visible: onScreen, reduce })

  const milestones = [
    {
      icon: PlayCircle,
      title: ar ? 'دروس مترتّبة في أقسام' : 'Lessons in sections',
      body: ar ? 'المدرّس بيرتّب الدروس، وإنت بتمشي عليها بالترتيب.' : 'The teacher orders the lessons; you work through them in turn.',
    },
    {
      icon: ListChecks,
      title: ar ? 'تقدّمك محفوظ درس بدرس' : 'Progress saved per lesson',
      body: ar ? 'كل درس بتخلّصه بيتعلّم عليه، فتكمّل من مكانك.' : 'Every lesson you finish is marked, so you pick up where you left off.',
    },
    {
      icon: Award,
      title: ar ? 'شهادة إتمام' : 'Completion certificate',
      body: ar ? 'شهادة باسمك، أي حد يقدر يتأكد منها من صفحة التحقق.' : 'Issued in your name, and anyone can check it on the verify page.',
    },
  ]

  const reach = pen.step < 0 ? 0 : pen.step >= 3 ? 1 : STOPS[pen.step]

  return (
    <div ref={ref} className="relative mt-12">
      {/* ------------------------------ wide: the wave ----------------------------- */}
      <div className="relative hidden h-20 md:block" aria-hidden>
        <svg
          viewBox="0 0 1000 80"
          preserveAspectRatio="none"
          className={cn('absolute inset-0 size-full overflow-visible', isRtl && '-scale-x-100')}
        >
          <path d={PATH} fill="none" stroke="hsl(var(--border))" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="2 6" />
          <motion.path
            d={PATH}
            fill="none"
            stroke="hsl(var(--brand))"
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: reduce ? 1 : reach }}
            transition={{ duration: 0.85, ease: EASE_DRAW }}
          />
        </svg>
        {STOPS.map((at, i) => (
          <Node key={i} at={at} lit={reduce || pen.step >= i} isRtl={isRtl} icon={milestones[i].icon} reduce={reduce} />
        ))}
      </div>

      {/* milestone copy — on wide screens it hangs under each node */}
      <ol className="relative grid gap-5 md:mt-4 md:grid-cols-3 md:gap-8">
        {/* narrow: a vertical rule draws down beside the milestones */}
        <motion.span
          aria-hidden
          className="absolute bottom-4 top-4 w-0.5 origin-top bg-brand [inset-inline-start:1.0625rem] md:hidden"
          initial={reduce ? false : { scaleY: 0 }}
          animate={{ scaleY: reduce ? 1 : Math.min(1, Math.max(0, pen.step + 1) / 3) }}
          transition={{ duration: 0.8, ease: EASE_DRAW }}
        />
        {milestones.map(({ icon: Icon, title, body }, i) => {
          const lit = reduce || pen.step >= i
          return (
            <li key={title} className="relative flex gap-4 md:block md:text-center">
              <span
                className={cn(
                  'relative z-10 grid size-[2.125rem] shrink-0 place-items-center rounded-full border transition-colors duration-500 md:hidden',
                  lit ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-background text-muted-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <div>
                <p
                  className={cn(
                    'text-body-sm font-semibold transition-colors duration-500',
                    lit ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {title}
                </p>
                <p className="mt-1 text-caption leading-relaxed text-muted-foreground md:mx-auto md:max-w-[17rem]">{body}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function Node({
  at,
  lit,
  isRtl,
  icon: Icon,
  reduce,
}: {
  at: number
  lit: boolean
  isRtl: boolean
  icon: React.ComponentType<{ className?: string }>
  reduce: boolean
}) {
  return (
    <span
      className="absolute top-1/2 -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2"
      style={isRtl ? { right: `${at * 100}%` } : { left: `${at * 100}%` }}
    >
      <motion.span
        className={cn(
          'grid size-11 place-items-center rounded-full border-2 transition-colors duration-500',
          lit ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-background text-muted-foreground',
        )}
        initial={false}
        animate={lit && !reduce ? { scale: [1, 1.14, 1] } : { scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_PREMIUM }}
      >
        <Icon className="size-5" />
      </motion.span>
    </span>
  )
}

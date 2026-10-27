import * as React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { SectionHeading } from '@/components/common/SectionHeading'
import {
  useHowItWorksParent,
  useHowItWorksStudent,
  useHowItWorksTeacher,
} from '@/data/content'
import { EASE_DRAW, EASE_PREMIUM, STORY } from '@/lib/motion'
import {
  useEnteredView,
  useMediaQuery,
  useMotionSafe,
  useOnScreen,
  useStepSequence,
} from '@/hooks/use-motion'
import { cn } from '@/lib/utils'

/**
 * How it works — the relay.
 *
 * The hero draws the loop as a closed circuit that keeps turning. Here the same
 * idea is told once, in order: a baton leaves the teacher, travels the track to
 * the student, then on to the parent. Each role switches on as the baton
 * arrives — its node ignites, a rail runs down its steps and the step numbers
 * take the role's colour one after another.
 *
 * Every step is readable from the first frame; the relay only adds colour and
 * order. On phones the columns stack, so each one lights when it scrolls in.
 */

type Role = 'teacher' | 'student' | 'parent'

const ROLE = {
  /* fg is whichever of white or charcoal clears 4.5:1 on that role's fill */
  teacher: { bg: 'bg-role-teacher', fg: 'text-[hsl(var(--brand-foreground))]', ring: 'ring-role-teacher/30', border: 'border-role-teacher' },
  student: { bg: 'bg-role-student', fg: 'text-white dark:text-[hsl(var(--brand-foreground))]', ring: 'ring-role-student/30', border: 'border-role-student' },
  parent: { bg: 'bg-role-parent', fg: 'text-white dark:text-[hsl(var(--brand-foreground))]', ring: 'ring-role-parent/30', border: 'border-role-parent' },
} as const

/** Node centres along the track, as a share of the row (reading direction). */
const STOPS = ['16.666%', '50%', '83.333%']

export function HowItWorks() {
  const { locale, isRtl } = useI18n()
  const ar = locale === 'ar-EG'
  const { reduce } = useMotionSafe()
  const wide = useMediaQuery('(min-width: 1024px)')

  const stageRef = React.useRef<HTMLDivElement>(null)
  const entered = useEnteredView(stageRef)
  const onScreen = useOnScreen(stageRef)
  const relay = useStepSequence({
    count: 3,
    interval: 1500,
    start: entered && wide,
    visible: onScreen,
    reduce,
  })

  const columns = [
    {
      role: 'teacher' as const,
      label: ar ? 'المدرّس' : 'The teacher',
      lead: ar ? 'يسجّل' : 'records',
      steps: useHowItWorksTeacher(),
      cta: { href: '/register', label: ar ? 'ابدأ كمدرّس' : 'Start as a teacher' },
    },
    {
      role: 'student' as const,
      label: ar ? 'الطالب' : 'The student',
      lead: ar ? 'يتعلّم' : 'learns',
      steps: useHowItWorksStudent(),
      cta: { href: '/teachers', label: ar ? 'دوّر على مدرّس' : 'Find a teacher' },
    },
    {
      role: 'parent' as const,
      label: ar ? 'ولي الأمر' : 'The parent',
      lead: ar ? 'يتابع' : 'follows',
      steps: useHowItWorksParent(),
      cta: { href: '/register', label: ar ? 'سجّل كولي أمر' : 'Join as a parent' },
    },
  ]

  const reached = relay.step
  const batonRole = columns[Math.max(0, reached)].role
  /* The baton rides the inline-start edge, so the track reads with the page. */
  const side = isRtl ? 'right' : 'left'

  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading
          eyebrow={ar ? 'إزاي بتشتغل' : 'How it works'}
          title={ar ? 'دايرة واحدة، تلات أطراف.' : 'One loop, three people.'}
          description={
            ar
              ? 'اللي المدرّس بيسجّله هو نفسه اللي الطالب بيشوفه وولي الأمر بيتابعه — من غير وسيط ومن غير ورق.'
              : 'What the teacher records is exactly what the student sees and the parent follows — no middleman, no paper.'
          }
        />

        <div ref={stageRef} className="relative mt-14">
          {/* ------------------------------ the track ----------------------------- */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[1.0625rem] hidden h-px lg:block">
            <span className="absolute inset-y-0 bg-border" style={{ insetInlineStart: STOPS[0], insetInlineEnd: STOPS[0] }} />
            {[0, 1].map((seg) => (
              <motion.span
                key={seg}
                className={cn(
                  'absolute inset-y-0 h-[2px] ltr:origin-left rtl:origin-right',
                  'ltr:bg-gradient-to-r rtl:bg-gradient-to-l',
                  seg === 0 ? 'from-role-teacher to-role-student' : 'from-role-student to-role-parent',
                )}
                style={{ insetInlineStart: STOPS[seg], width: '33.333%' }}
                initial={false}
                animate={{ scaleX: reached > seg ? 1 : 0 }}
                transition={reduce ? { duration: 0 } : { duration: STORY.draw, ease: EASE_DRAW }}
              />
            ))}

            {/* the baton — what the teacher saved, on its way */}
            {wide && reached >= 0 && !reduce && (
              <motion.span
                className="absolute top-0"
                initial={{ [side]: STOPS[0], opacity: 0 }}
                animate={{ [side]: STOPS[reached], opacity: relay.done ? 0 : 1 }}
                transition={{
                  [side]: { duration: STORY.draw, ease: EASE_DRAW },
                  opacity: { duration: 0.4, delay: relay.done ? STORY.draw + 0.2 : 0 },
                }}
              >
                {/* positioning lives on the parent; the dot centres itself on the stop */}
                <span
                  className={cn(
                    'block size-2.5 -translate-y-1/2 rounded-full ring-4 transition-colors duration-500 ltr:-translate-x-1/2 rtl:translate-x-1/2',
                    ROLE[batonRole].bg,
                    ROLE[batonRole].ring,
                  )}
                />
              </motion.span>
            )}
          </div>

          <div className="grid gap-12 lg:grid-cols-3 lg:gap-8">
            {columns.map((col, i) => (
              <RelayColumn
                key={col.role}
                index={i}
                {...col}
                wide={wide}
                reduce={reduce}
                litByRelay={reached >= i}
                /* on the wide track a node waits for the baton to arrive */
                arrivalDelay={wide && i > 0 && !reduce ? STORY.draw * 0.85 : 0}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function RelayColumn({
  role,
  label,
  lead,
  steps,
  cta,
  wide,
  reduce,
  litByRelay,
  arrivalDelay,
}: {
  index: number
  role: Role
  label: string
  lead: string
  steps: { id: string; number: string; title: string; description: string }[]
  cta: { href: string; label: string }
  wide: boolean
  reduce: boolean
  litByRelay: boolean
  arrivalDelay: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const enteredSelf = useEnteredView(ref, '0px 0px -25% 0px')
  const lit = reduce || (wide ? litByRelay : enteredSelf)
  const c = ROLE[role]

  return (
    <div ref={ref} className="group/col relative flex flex-col lg:items-center lg:text-center">
      {/* node */}
      <span className="relative z-10 grid size-[2.125rem] place-items-center rounded-full border border-border bg-background">
        <motion.span
          aria-hidden
          className={cn('absolute inset-0 rounded-full border-2', c.border)}
          initial={false}
          animate={lit ? { opacity: [0, 0.9, 0], scale: [0.8, 1.9, 2.2] } : { opacity: 0, scale: 0.8 }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, delay: arrivalDelay, ease: EASE_PREMIUM }}
        />
        <motion.span
          className={cn('relative size-3 rounded-full', c.bg)}
          initial={false}
          animate={{ scale: lit ? 1 : 0.55, opacity: lit ? 1 : 0.45 }}
          transition={reduce ? { duration: 0 } : { duration: STORY.ignite, delay: arrivalDelay, ease: EASE_PREMIUM }}
        />
      </span>

      <div className="mt-4 flex items-baseline gap-2 lg:justify-center">
        <h3 className="font-display text-heading-sm text-foreground">{label}</h3>
        <span className={cn('text-body-sm transition-colors duration-500', lit ? 'text-foreground' : 'text-muted-foreground')}>
          — {lead}
        </span>
      </div>

      {/* steps, with a rail that runs down them as the role switches on */}
      <div className="relative mt-6 flex-1 lg:w-full">
        <span aria-hidden className="absolute bottom-3 top-3 w-px bg-border [inset-inline-start:1.5rem]" />
        <motion.span
          aria-hidden
          className={cn('absolute top-3 w-[2px] origin-top [inset-inline-start:calc(1.5rem-0.5px)]', c.bg)}
          style={{ bottom: '0.75rem' }}
          initial={false}
          animate={{ scaleY: lit ? 1 : 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 0.35 * steps.length, delay: arrivalDelay + 0.15, ease: EASE_DRAW }
          }
        />
        <ol className="relative space-y-2">
          {steps.map((step, s) => (
            <li
              key={step.id}
              className="group grid grid-cols-[3rem_1fr] gap-2 rounded-lg border border-transparent py-3 pe-3 text-start transition-colors duration-200 hover:border-border hover:bg-card"
            >
              <span className="flex justify-center">
                <span
                  className={cn(
                    'tnum relative z-10 grid size-6 place-items-center rounded-full border font-mono text-[0.6875rem] font-medium transition-[background-color,border-color,color] duration-300',
                    lit
                      ? cn(c.bg, c.fg, 'border-transparent')
                      : 'border-border bg-background text-muted-foreground',
                  )}
                  style={{
                    transitionDelay: lit && !reduce ? `${arrivalDelay + 0.2 + s * 0.35}s` : '0s',
                  }}
                >
                  {step.number}
                </span>
              </span>
              <span>
                <span className="block text-body-sm font-semibold text-foreground">{step.title}</span>
                <span className="mt-1 block text-caption leading-relaxed text-muted-foreground">
                  {step.description}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 lg:self-center">
        <Link
          to={cta.href}
          className="group/cta inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {cta.label}
          <ArrowRight className="size-4 flip-rtl transition-transform duration-200 group-hover/cta:translate-x-0.5 rtl:group-hover/cta:-translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}

import * as React from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BookOpen, GraduationCap, Users } from 'lucide-react'
import type { SubjectDto } from '@/api/schema'
import { useI18n } from '@/i18n'
import { useSubjects } from '@/hooks/use-taxonomy'
import { useEnteredView, useMotionSafe } from '@/hooks/use-motion'
import { SectionHeading } from '@/components/common/SectionHeading'
import { SubjectIcon } from '@/components/illustrations/SubjectIcon'
import { Button } from '@/components/ui/button'
import { subjectByKey } from '@/data/taxonomy'
import { subjectKeyFor } from '@/lib/identity'
import { EASE_DRAW, EASE_PREMIUM } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Subjects — the lens.
 *
 * A directory on one side, a lens on the other. Pointing at a subject (hover
 * or keyboard focus) retunes the lens: its tint shifts to the subject's hue,
 * the icon turns in, the ring around it redraws, and the live counts from the
 * API swap in. The directory itself is a list of ordinary links, so it works
 * without the lens — which is exactly what phones get.
 *
 * Entrance: rows are unveiled from the reading edge in reading order, like a
 * page being uncovered, and the lens draws its ring once the list is in.
 */

function hueOf(subject?: SubjectDto) {
  return subject ? subjectByKey(subjectKeyFor(subject)).hue : 25
}

export function SubjectsSection() {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const subjects = useSubjects()
  const { reduce } = useMotionSafe()
  const listRef = React.useRef<HTMLDivElement>(null)
  const entered = useEnteredView(listRef)
  const uid = React.useId()

  const list = subjects.subjects
  /* Open on the subject with the most teachers — the most useful first look. */
  const initial = React.useMemo(
    () => [...list].sort((a, b) => (b.teachersCount ?? 0) - (a.teachersCount ?? 0))[0],
    [list],
  )
  const [activeId, setActiveId] = React.useState<string | undefined>()
  const active = list.find((s) => s.id === activeId) ?? initial

  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('common.subject')}
          title={ar ? 'ابدأ من المادة اللي محتاجها' : 'Start from the subject you need'}
          description={
            ar
              ? 'كل مادة فيها مدرّسين متخصصين في كل مرحلة، بمواعيد وأسعار واضحة من أول لحظة.'
              : 'Every subject has specialist teachers for each stage, with clear times and prices upfront.'
          }
          action={{ label: t('nav.teachers'), href: '/teachers' }}
        />

        {subjects.isPending ? (
          <div className="mt-10 h-48 animate-pulse rounded-lg bg-muted" />
        ) : (
          <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
            {/* ----------------------------- directory ---------------------------- */}
            <div
              ref={listRef}
              className="grid gap-1.5 sm:grid-cols-2"
              onMouseLeave={() => setActiveId(undefined)}
            >
              {list.map((subject, i) => (
                <SubjectRow
                  key={subject.id}
                  subject={subject}
                  index={i}
                  entered={entered}
                  reduce={reduce}
                  active={subject.id === active?.id}
                  indicatorId={`${uid}-indicator`}
                  onActivate={() => setActiveId(subject.id)}
                />
              ))}
            </div>

            {/* ------------------------------- lens ------------------------------- */}
            {active && (
              <Lens subject={active} entered={entered} reduce={reduce} />
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function SubjectRow({
  subject,
  index,
  entered,
  reduce,
  active,
  indicatorId,
  onActivate,
}: {
  subject: SubjectDto
  index: number
  entered: boolean
  reduce: boolean
  active: boolean
  indicatorId: string
  onActivate: () => void
}) {
  const { t, isRtl, formatNumber } = useI18n()
  const subjects = useSubjects()
  const key = subjectKeyFor(subject)
  const hue = subjectByKey(key).hue

  /* Unveil from the reading edge: clip the far side, then open it. */
  const hidden = isRtl ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)'
  /* Open past the box so focus rings and the selection shadow aren't clipped. */
  const shown = 'inset(-20% -4% -20% -4%)'
  const delay = Math.min(index * 0.05, 0.6)

  return (
    <motion.div
      className="relative"
      style={{ '--sh': hue } as React.CSSProperties}
      initial={reduce ? false : { clipPath: hidden }}
      animate={entered || reduce ? { clipPath: shown } : { clipPath: hidden }}
      transition={{ duration: 0.6, delay, ease: EASE_DRAW }}
    >
      {/* the selection follows the pointer between rows (wide screens only) */}
      {active && (
        <motion.span
          layoutId={indicatorId}
          aria-hidden
          className="absolute inset-0 hidden rounded-lg border border-[hsl(var(--sh)_55%_50%/0.35)] bg-card shadow-soft lg:block"
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
        />
      )}
      <Link
        to={`/teachers?subject=${subject.slug ?? subject.id}`}
        onMouseEnter={onActivate}
        onFocus={onActivate}
        className="group relative flex items-center gap-3.5 rounded-lg px-4 py-3 transition-colors duration-200 hover:bg-[hsl(var(--sh)_60%_50%/0.05)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hover:bg-transparent"
      >
        <motion.span
          className="grid size-9 shrink-0 place-items-center rounded-md bg-[hsl(var(--sh)_45%_50%/0.12)] text-[hsl(var(--sh)_50%_32%)] dark:text-[hsl(var(--sh)_60%_72%)]"
          initial={reduce ? false : { scale: 0.6, rotate: isRtl ? 18 : -18 }}
          animate={entered || reduce ? { scale: 1, rotate: 0 } : undefined}
          transition={{ duration: 0.55, delay: delay + 0.2, ease: EASE_PREMIUM }}
        >
          <SubjectIcon subject={key} className="size-[1.0625rem]" />
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-semibold text-foreground">
            {subjects.label(subject)}
          </span>
          <span className="tnum block text-caption text-muted-foreground">
            {formatNumber(subject.teachersCount ?? 0)} {t('common.teacher')}
            {(subject.groupsCount ?? 0) > 0 &&
              ` · ${formatNumber(subject.groupsCount ?? 0)} ${t('common.groups')}`}
          </span>
        </span>
        <ArrowRight
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-[opacity,transform] duration-200 flip-rtl',
            active ? 'opacity-100 lg:text-[hsl(var(--sh)_55%_45%)]' : 'opacity-0 group-hover:opacity-100',
          )}
        />
      </Link>
    </motion.div>
  )
}

function Lens({ subject, entered, reduce }: { subject: SubjectDto; entered: boolean; reduce: boolean }) {
  const { t, locale, formatNumber } = useI18n()
  const ar = locale === 'ar-EG'
  const subjects = useSubjects()
  const key = subjectKeyFor(subject)
  const hue = hueOf(subject)
  const name = subjects.label(subject)

  const figures = [
    { icon: GraduationCap, value: subject.teachersCount ?? 0, label: t('common.teachers') },
    { icon: Users, value: subject.groupsCount ?? 0, label: t('common.groups') },
    { icon: BookOpen, value: subject.coursesCount ?? 0, label: t('common.courses') },
  ]

  /* The ring is a rounded square traced around the icon tile. */
  const ring = 'M60 6 H96 A18 18 0 0 1 114 24 V96 A18 18 0 0 1 96 114 H24 A18 18 0 0 1 6 96 V24 A18 18 0 0 1 24 6 Z'

  return (
    <motion.aside
      aria-label={ar ? `تفاصيل مادة ${name}` : `${name} at a glance`}
      className="sticky top-24 hidden overflow-hidden rounded-xl border border-border bg-card p-6 lg:block"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={entered || reduce ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay: 0.35, ease: EASE_PREMIUM }}
    >
      {/* the tint retunes to the subject's hue */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-40"
        initial={false}
        animate={{
          background: `linear-gradient(to bottom, hsl(${hue} 70% 55% / 0.12), hsl(${hue} 70% 55% / 0))`,
        }}
        transition={{ duration: reduce ? 0 : 0.5 }}
      />

      <div className="relative">
        <div className="relative size-[7.5rem]">
          <svg viewBox="0 0 120 120" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <path d={ring} fill="none" stroke="hsl(var(--border))" strokeWidth={1} />
            <motion.path
              key={subject.id}
              d={ring}
              fill="none"
              stroke={`hsl(${hue} 65% 50%)`}
              strokeWidth={2}
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: entered || reduce ? 1 : 0 }}
              transition={{ duration: 0.9, delay: entered ? 0.05 : 0, ease: EASE_DRAW }}
            />
          </svg>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={subject.id}
              className="absolute inset-[14px] grid place-items-center rounded-[14px] bg-[hsl(var(--lh)_55%_50%/0.12)] text-[hsl(var(--lh)_55%_34%)] dark:text-[hsl(var(--lh)_60%_72%)]"
              style={{ '--lh': hue } as React.CSSProperties}
              initial={reduce ? false : { opacity: 0, scale: 0.7, rotate: -14 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, rotate: 10 }}
              transition={{ duration: 0.45, ease: EASE_PREMIUM }}
            >
              <SubjectIcon subject={key} className="size-10" />
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="mt-6 h-[3.75rem] overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={subject.id}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: EASE_PREMIUM }}
            >
              <p className="data-label">{t('common.subject')}</p>
              <p className="mt-1 truncate font-display text-heading-lg text-foreground">{name}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <dl className="mt-5 grid grid-cols-3 divide-x divide-border border-y border-border rtl:divide-x-reverse">
          {figures.map(({ icon: Icon, value, label }, i) => (
            <div key={label} className="px-3 py-3.5 first:ps-0">
              <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
                <Icon className="size-3.5" aria-hidden />
                <span className="truncate">{label}</span>
              </dt>
              <dd className="relative mt-1 h-8 overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={`${subject.id}-${value}`}
                    className="tnum absolute inset-0 font-display text-[1.625rem] font-semibold leading-8 text-foreground"
                    initial={reduce ? false : { y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '-100%' }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: EASE_PREMIUM }}
                  >
                    {formatNumber(value)}
                  </motion.span>
                </AnimatePresence>
              </dd>
            </div>
          ))}
        </dl>

        <Button asChild className="mt-6 w-full justify-between">
          <Link to={`/teachers?subject=${subject.slug ?? subject.id}`}>
            <span className="truncate">{ar ? `مدرّسين ${name}` : `${name} teachers`}</span>
            <ArrowRight className="flip-rtl" />
          </Link>
        </Button>
      </div>
    </motion.aside>
  )
}

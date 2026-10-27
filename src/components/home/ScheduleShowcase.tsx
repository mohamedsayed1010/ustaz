import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ArrowRight, BellRing, CalendarClock, CalendarDays, LayoutList, MapPin, Video } from 'lucide-react'
import type { ScheduleSlotDto } from '@/api/schema'
import { scheduleApi } from '@/api/endpoints/catalog'
import { qk } from '@/lib/query-client'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { RowSkeleton } from '@/components/ui/skeleton'
import { SubjectTile } from '@/components/illustrations/SubjectIcon'
import { useSlotView } from '@/components/schedule/SlotCard'
import { subjectByKey } from '@/data/taxonomy'
import { apiDayLabel } from '@/lib/schedule'
import { EASE_PREMIUM, STORY } from '@/lib/motion'
import { useEnteredView, useMotionSafe, useOnScreen, useStepSequence } from '@/hooks/use-motion'
import { cn } from '@/lib/utils'

/**
 * Upcoming classes — a working preview of the schedule.
 *
 * The three promises on the left are controls, not bullets. Each one puts the
 * preview on the right into the state it describes, using the real upcoming
 * classes from the API:
 *
 *   1. Week view and list view — the rows lift off the list and settle into
 *      their day columns (a shared-layout morph), then can fold back.
 *   2. The online link — each class with a meeting link lights its join chip.
 *   3. The reminder — a reminder for the next class slides in over the list.
 *
 * When the section scrolls in, the preview walks through the three once and
 * stops. Clicking any promise takes over immediately.
 */

const WEEK: NonNullable<ScheduleSlotDto['dayOfWeek']>[] = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
]

export function UpcomingClasses() {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { reduce } = useMotionSafe()

  const slots = useQuery({
    queryKey: qk.schedule.upcoming,
    queryFn: () => scheduleApi.upcoming(4),
  })
  const items = slots.data ?? []

  const stageRef = React.useRef<HTMLDivElement>(null)
  const entered = useEnteredView(stageRef)
  const onScreen = useOnScreen(stageRef)
  const demo = useStepSequence({
    count: 3,
    interval: STORY.hold + 400,
    start: entered && items.length > 0,
    visible: onScreen,
    reduce,
    /* With reduced motion the preview rests on the plain list with its links. */
    restingStep: 1,
  })

  if (!slots.isPending && items.length === 0) return null

  const features = [
    {
      icon: CalendarDays,
      label: ar
        ? 'عرض أسبوعي وعرض قائمة، وفلترة بالمادة والمدرّس'
        : 'Week view and list view, filtered by subject and teacher',
    },
    {
      icon: Video,
      label: ar ? 'لينك الحصة الأونلاين جاهز في ميعادها' : 'The online session link is ready at its time',
    },
    {
      icon: BellRing,
      label: ar ? 'تنبيه قبل كل حصة بوقت كافي' : 'A reminder before every class',
    },
  ]

  const step = demo.step
  const view: 'list' | 'week' = step === 0 ? 'week' : 'list'

  return (
    /* A navy section: the promises sit on navy, the preview is a real product
       window with the ordinary theme restored inside it (.surface-tokens). */
    <section className="stage section-y">
      <div className="container-page">
        <div ref={stageRef} className="grid gap-10 lg:grid-cols-[0.85fr,1.15fr] lg:gap-14">
          <div>
            <span className="eyebrow">
              <CalendarClock className="size-3.5" />
              {ar ? 'الجدول' : 'Schedule'}
            </span>
            <h2 className="mt-5 text-display-lg text-foreground">
              {ar ? 'كل حصصك من كل المدرّسين في جدول واحد.' : 'Every class, from every teacher, in one schedule.'}
            </h2>
            <p className="mt-4 text-body-lg text-muted-foreground">
              {ar
                ? 'مش محتاج تفتح ٣ جروبات واتساب عشان تعرف عندك إيه بكرة. الجدول بيجمّع مجموعاتك كلها وبينبّهك قبل كل حصة.'
                : 'No more digging through three WhatsApp groups to find out what you have tomorrow.'}
            </p>

            {/* the promises — each one drives the preview */}
            <ul className="mt-7 space-y-1.5" aria-label={ar ? 'جرّب مميزات الجدول' : 'Try the schedule features'}>
              {features.map(({ icon: Icon, label }, i) => {
                const on = step === i
                return (
                  <li key={label}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => demo.select(i)}
                      className={cn(
                        'relative flex w-full items-start gap-3 overflow-hidden rounded-lg border px-3.5 py-3 text-start text-body-sm transition-colors duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        on
                          /* selected: a raised panel with an orange edge — the solid orange stays with the CTA */
                          ? 'border-primary/60 bg-card font-semibold text-foreground'
                          : 'border-transparent text-muted-foreground hover:bg-card hover:text-foreground',
                      )}
                    >
                      <Icon className={cn('mt-0.5 size-4 shrink-0', on ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                      <span className="flex-1">{label}</span>
                      {/* while the preview plays itself, the active promise shows its clock */}
                      {on && !demo.manual && !demo.done && !reduce && (
                        <motion.span
                          aria-hidden
                          key={`clock-${i}`}
                          className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/70 ltr:origin-left rtl:origin-right"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: (STORY.hold + 400) / 1000, ease: 'linear' }}
                        />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <Button asChild size="lg" className="mt-8">
              <Link to="/schedule">
                {ar ? 'افتح الجدول' : 'Open the schedule'}
                <ArrowRight className="size-4 flip-rtl" />
              </Link>
            </Button>
          </div>

          {slots.isPending ? (
            <RowSkeleton count={4} />
          ) : (
            <PreviewPanel items={items} view={view} step={step} reduce={reduce} entered={entered} />
          )}
        </div>
      </div>
    </section>
  )
}

function PreviewPanel({
  items,
  view,
  step,
  reduce,
  entered,
}: {
  items: ScheduleSlotDto[]
  view: 'list' | 'week'
  step: number
  reduce: boolean
  entered: boolean
}) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const layout = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 30 }

  return (
    <motion.div
      className="surface-tokens relative self-start overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-[0_24px_60px_-20px_hsl(var(--band-shadow)/0.6)]"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={entered || reduce ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, ease: EASE_PREMIUM }}
    >
      {/* window bar, with the view switch reflecting the current state */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-body-sm font-semibold text-foreground">
          <CalendarClock className="size-4 text-primary" aria-hidden />
          {ar ? 'جدولك' : 'Your schedule'}
        </p>
        <div aria-hidden className="relative inline-flex rounded-md bg-muted p-0.5 text-caption font-semibold">
          {(['list', 'week'] as const).map((v) => (
            <span key={v} className="relative flex items-center gap-1 px-2.5 py-1">
              {view === v && (
                <motion.span
                  layoutId="schedule-view-pill"
                  className="absolute inset-0 rounded-[5px] bg-card shadow-soft"
                  transition={layout}
                />
              )}
              <span className={cn('relative flex items-center gap-1', view === v ? 'text-foreground' : 'text-muted-foreground')}>
                {v === 'list' ? <LayoutList className="size-3.5" /> : <CalendarDays className="size-3.5" />}
                {v === 'list' ? (ar ? 'قائمة' : 'List') : ar ? 'أسبوع' : 'Week'}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="relative min-h-[21rem] p-3 sm:p-4">
        <LayoutGroup id="schedule-preview">
          {view === 'list' ? (
            <ul className="space-y-2">
              {items.map((slot) => (
                <ListRow key={slot.id} slot={slot} highlightLink={step === 1} transition={layout} />
              ))}
            </ul>
          ) : (
            <WeekBoard items={items} transition={layout} />
          )}
        </LayoutGroup>

        {/* the reminder for the next class */}
        <AnimatePresence>
          {step === 2 && items[0] && <Reminder slot={items[0]} reduce={reduce} />}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function ListRow({
  slot,
  highlightLink,
  transition,
}: {
  slot: ScheduleSlotDto
  highlightLink: boolean
  transition: object
}) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const view = useSlotView(slot)

  return (
    <motion.li layoutId={`slot-${slot.id}`} transition={transition} className="rounded-lg border border-border bg-background">
      <Link
        to={`/groups/${slot.groupId}`}
        className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <SubjectTile subject={view.subjectKey} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-semibold text-foreground">{slot.groupName}</span>
          <span className="tnum block truncate text-caption text-muted-foreground">
            {[view.nextLabel ?? view.dayName, view.timeRange].filter(Boolean).join(' · ')}
          </span>
        </span>
        {view.isOnline ? (
          <span
            className={cn(
              'relative inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 text-[0.6875rem] font-semibold transition-colors duration-300',
              highlightLink ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {highlightLink && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-sm ring-2 ring-primary"
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 0, scale: 1.35 }}
                transition={{ duration: 0.9, ease: EASE_PREMIUM }}
              />
            )}
            <Video className="size-3" aria-hidden />
            {ar ? 'لينك الحصة' : 'Join link'}
          </span>
        ) : (
          slot.location && (
            <span className="hidden shrink-0 items-center gap-1 rounded-sm bg-muted px-2 py-1 text-[0.6875rem] font-semibold text-muted-foreground sm:inline-flex">
              <MapPin className="size-3" aria-hidden />
              <span className="max-w-[7rem] truncate">{slot.location}</span>
            </span>
          )
        )}
      </Link>
    </motion.li>
  )
}

function WeekBoard({ items, transition }: { items: ScheduleSlotDto[]; transition: object }) {
  const { locale } = useI18n()
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEK.map((day) => {
        const daySlots = items.filter((s) => s.dayOfWeek === day)
        return (
          <div key={day} className="flex min-h-[18.5rem] flex-col gap-1.5 rounded-md bg-muted/50 p-1">
            <p className="py-1 text-center text-[0.6875rem] font-semibold text-muted-foreground">
              {apiDayLabel(day, locale, 'short')}
            </p>
            {daySlots.map((slot) => (
              <WeekChip key={slot.id} slot={slot} transition={transition} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function WeekChip({ slot, transition }: { slot: ScheduleSlotDto; transition: object }) {
  const { formatTime } = useI18n()
  const view = useSlotView(slot)
  const hue = subjectByKey(view.subjectKey).hue
  return (
    <motion.div
      layoutId={`slot-${slot.id}`}
      transition={transition}
      className="rounded-[5px] border-s-2 bg-card px-1 py-1.5 text-center shadow-xs"
      style={{ borderInlineStartColor: `hsl(${hue} 60% 50%)` }}
      title={`${slot.groupName ?? ''} · ${view.timeRange}`}
    >
      <p className="tnum truncate text-[0.625rem] font-semibold text-foreground">
        {slot.startTime ? formatTime(slot.startTime) : ''}
      </p>
      <p className="truncate text-[0.5625rem] text-muted-foreground">{view.subjectName}</p>
    </motion.div>
  )
}

function Reminder({ slot, reduce }: { slot: ScheduleSlotDto; reduce: boolean }) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const view = useSlotView(slot)
  return (
    <motion.div
      role="status"
      className="absolute inset-x-3 top-3 z-10 flex items-start gap-3 rounded-lg border border-border bg-popover p-3.5 shadow-lift sm:inset-x-4 sm:top-4"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: EASE_PREMIUM }}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
        <motion.span
          animate={reduce ? undefined : { rotate: [0, -14, 12, -8, 0] }}
          transition={{ duration: 0.7, delay: 0.35 }}
        >
          <BellRing className="size-4" aria-hidden />
        </motion.span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-caption font-semibold text-primary">
          {ar ? 'تذكير بالحصة الجاية' : 'Next class reminder'}
        </span>
        <span className="mt-0.5 block truncate text-body-sm font-semibold text-foreground">{slot.groupName}</span>
        <span className="tnum block truncate text-caption text-muted-foreground">
          {[view.nextLabel ?? view.dayName, view.timeRange].filter(Boolean).join(' · ')}
        </span>
      </span>
    </motion.div>
  )
}

import * as React from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AppRole } from '@/hooks/use-auth'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * The console kit — the handful of shapes every dashboard is composed from.
 *
 *   Panel        a hairline-bordered region with a quiet header row
 *   MetricStrip  a row of figures sharing one frame, divided by hairlines
 *   Meter        a labelled bar whose colour follows a threshold
 *   ListRow      one line of a list: leading mark, two lines of text, trailing
 *   RoleMark     the role colour dot — the thread through all three consoles
 *
 * They are deliberately plain. The page decides the composition; the kit only
 * guarantees that the same kind of information always looks the same.
 */

/* --------------------------------- Panel ---------------------------------- */

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  flush = false,
  as: Tag = 'section',
  id,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  /** Body sits edge to edge — for lists and tables that draw their own rules. */
  flush?: boolean
  as?: 'section' | 'div' | 'article'
  id?: string
}) {
  const headingId = React.useId()
  return (
    <Tag
      id={id}
      aria-labelledby={title ? headingId : undefined}
      className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}
    >
      {(title || action) && (
        <header className="flex min-h-[3.25rem] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-5 py-3">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="font-display text-[0.9375rem] font-semibold text-foreground">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-caption text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={cn(!flush && 'p-5', bodyClassName)}>{children}</div>
    </Tag>
  )
}

/** "See all →" link used in panel headers. */
export function PanelLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { isRtl } = useI18n()
  const Chevron = isRtl ? ChevronLeft : ChevronRight
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 rounded-sm text-caption font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
      <Chevron className="size-3.5" aria-hidden />
    </Link>
  )
}

/* ------------------------------ Metric strip ------------------------------ */

export interface Metric {
  label: string
  value: React.ReactNode
  /** One short line under the figure. */
  hint?: React.ReactNode
  /** Colours the figure when it is a signal, not just a count. */
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'accent'
  /** Optional 0–100 bar under the figure. */
  meter?: number
  href?: string
}

const TONE_TEXT: Record<NonNullable<Metric['tone']>, string> = {
  default: 'text-foreground',
  good: 'text-success-strong',
  warn: 'text-warning-strong',
  bad: 'text-destructive-strong',
  accent: 'text-accent-strong',
}

export function MetricStrip({
  items,
  className,
  columns,
}: {
  items: Metric[]
  className?: string
  /** Desktop column count; defaults to the number of items (max 4). */
  columns?: 2 | 3 | 4
}) {
  const cols = columns ?? (Math.min(items.length, 4) as 2 | 3 | 4)
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border',
        cols === 3 && 'lg:grid-cols-3',
        cols === 4 && 'lg:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => {
        const body = (
          <>
            <dt className="data-label">{item.label}</dt>
            <dd className={cn('tnum mt-2.5 font-display text-metric', TONE_TEXT[item.tone ?? 'default'])}>
              {item.value}
            </dd>
            {item.meter !== undefined && (
              <Meter value={item.meter} className="mt-3" tone={(item.tone ?? 'default') === 'default' ? 'ink' : 'auto'} />
            )}
            {item.hint && <dd className="mt-2 text-caption text-muted-foreground">{item.hint}</dd>}
          </>
        )
        return item.href ? (
          <Link
            key={item.label}
            to={item.href}
            className="group bg-card p-4 transition-colors hover:bg-muted/40 sm:p-5"
          >
            {body}
          </Link>
        ) : (
          <div key={item.label} className="bg-card p-4 sm:p-5">
            {body}
          </div>
        )
      })}
      {/* Odd counts on the 2-up phone grid leave a hole; fill it with card. */}
      {items.length % 2 === 1 && <div className="bg-card lg:hidden" aria-hidden />}
    </dl>
  )
}

/* ---------------------------------- Meter --------------------------------- */

/** Thresholds shared by every attendance / completion / grade figure. */
export function toneFor(value: number): 'good' | 'warn' | 'bad' {
  return value >= 75 ? 'good' : value >= 50 ? 'warn' : 'bad'
}

const METER_FILL = {
  good: 'bg-success',
  warn: 'bg-warning',
  bad: 'bg-destructive',
  ink: 'bg-foreground',
  accent: 'bg-accent',
} as const

export function Meter({
  value,
  label,
  showValue = false,
  tone = 'auto',
  className,
  size = 'sm',
}: {
  value: number
  label?: string
  showValue?: boolean
  /** `auto` colours by threshold; the rest pin a colour. */
  tone?: 'auto' | keyof typeof METER_FILL
  className?: string
  size?: 'sm' | 'md'
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const fill = METER_FILL[tone === 'auto' ? toneFor(v) : tone]
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-caption">
          {label && <span className="truncate text-muted-foreground">{label}</span>}
          {showValue && <span className="tnum font-semibold text-foreground">{v}%</span>}
        </div>
      )}
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label={label}
        className={cn(
          'w-full overflow-hidden rounded-full bg-foreground/[0.08]',
          size === 'sm' ? 'h-1' : 'h-1.5',
        )}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-700 ease-premium', fill)}
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  )
}

/* --------------------------------- ListRow -------------------------------- */

export function ListRow({
  to,
  leading,
  title,
  meta,
  trailing,
  className,
  onClick,
}: {
  to?: string
  leading?: React.ReactNode
  title: React.ReactNode
  meta?: React.ReactNode
  trailing?: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const content = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-semibold text-foreground">{title}</span>
        {meta && <span className="mt-0.5 block truncate text-caption text-muted-foreground">{meta}</span>}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-2">{trailing}</span>}
    </>
  )
  const cls = cn(
    'flex items-center gap-3.5 px-5 py-3.5',
    (to || onClick) && 'transition-colors hover:bg-muted/50 focus-visible:bg-muted/50',
    className,
  )
  if (to)
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cn(cls, 'w-full text-start')}>
        {content}
      </button>
    )
  return <div className={cls}>{content}</div>
}

/** A list of rows with hairlines between them. */
export function RowList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('divide-y divide-border', className)}>{children}</div>
}

/** Date block used as a ListRow leading mark: weekday over day number. */
export function DateTile({ date, className }: { date: Date; className?: string }) {
  const { locale } = useI18n()
  const loc = locale === 'ar-EG' ? 'ar-EG' : 'en-GB'
  return (
    <span
      className={cn(
        'flex size-10 flex-col items-center justify-center rounded-md border border-border bg-background leading-none',
        className,
      )}
    >
      <span className="text-[0.625rem] font-semibold text-muted-foreground">
        {new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(date)}
      </span>
      <span className="tnum mt-1 font-display text-body-sm font-semibold text-foreground">
        {new Intl.DateTimeFormat(loc, { day: 'numeric' }).format(date)}
      </span>
    </span>
  )
}

/** Small tinted square that holds an icon. */
export function IconMark({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'student' | 'parent' | 'teacher'
  className?: string
}) {
  const tones = {
    neutral: 'bg-foreground/[0.06] text-foreground',
    accent: 'bg-accent-soft text-accent-strong',
    good: 'bg-success/12 text-success-strong',
    warn: 'bg-warning/15 text-warning-strong',
    bad: 'bg-destructive/10 text-destructive-strong',
    student: 'bg-role-student/10 text-role-student',
    parent: 'bg-role-parent/10 text-role-parent',
    /* the vivid role orange is too light for an icon on its own tint */
    teacher: 'bg-role-teacher/10 text-primary',
  } as const
  return (
    <span
      className={cn(
        'grid size-9 shrink-0 place-items-center rounded-md [&_svg]:size-[1.0625rem]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* -------------------------------- RoleMark -------------------------------- */

const ROLE_DOT: Record<AppRole, string> = {
  teacher: 'bg-role-teacher',
  assistant: 'bg-role-teacher',
  student: 'bg-role-student',
  parent: 'bg-role-parent',
  admin: 'bg-role-admin',
}

export function RoleDot({ role, className }: { role: AppRole; className?: string }) {
  return <span className={cn('role-dot', ROLE_DOT[role], className)} aria-hidden />
}

export function RoleMark({
  role,
  label,
  className,
}: {
  role: AppRole
  label: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-caption font-semibold', className)}>
      <RoleDot role={role} />
      {label}
    </span>
  )
}

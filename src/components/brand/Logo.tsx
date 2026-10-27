import { cn } from '@/lib/utils'

/**
 * USTAZ — أستاذ
 *
 * The mark is three connected nodes on a midnight-navy tile:
 *   · the apex, set in soft orange — the teacher, the brand's warm voice
 *   · two paper nodes at the base — the student and the parent
 *   · the two strokes that join them — the learning loop between all three
 *
 * Read together the strokes draw a drafting compass and the letter A / أ, so
 * one mark carries both the Arabic and the Latin wordmark.
 */

export type LogoTone = 'auto' | 'onLight' | 'onDark' | 'mono'

interface LogoMarkProps {
  className?: string
  tone?: LogoTone
  /** Renders a flat (unfilled) tile for use on already-dark surfaces. */
  plate?: boolean
}

/* The tile reads --logo-plate (midnight navy; one step lighter on navy bands and
   in dark mode, so it never dissolves into its ground). White strokes hold 13:1+. */
const PLATE = 'hsl(var(--logo-plate, 221 51% 16%))'
const PAPER = '#FFFFFF'
const SIGNAL = '#F28C45'

export function LogoMark({ className, tone = 'auto', plate = true }: LogoMarkProps) {
  const mono = tone === 'mono'
  const stroke = mono ? 'currentColor' : PAPER

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('size-10 shrink-0', className)}
      role="img"
      aria-label="أستاذ"
      fill="none"
    >
      {plate && (
        <rect
          x={mono ? 1.25 : 0}
          y={mono ? 1.25 : 0}
          width={mono ? 61.5 : 64}
          height={mono ? 61.5 : 64}
          rx="15"
          style={{ fill: mono ? 'none' : PLATE }}
          stroke={mono ? 'currentColor' : 'none'}
          strokeWidth={mono ? 2.5 : 0}
        />
      )}
      <path d="M32 19 19 45M32 19l13 26" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="19" cy="45" r="5" fill={stroke} />
      <circle cx="45" cy="45" r="5" fill={stroke} />
      <circle
        cx="32"
        cy="18"
        r="6.5"
        fill={mono ? 'currentColor' : SIGNAL}
        stroke={mono ? 'none' : PAPER}
        strokeWidth={mono ? 0 : 2.5}
      />
    </svg>
  )
}

interface LogoProps {
  /** `full` = mark + wordmark, `mark` = tile only, `wordmark` = type only. */
  variant?: 'full' | 'mark' | 'wordmark'
  /** Which script leads the wordmark. */
  script?: 'ar' | 'en' | 'both'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  tone?: LogoTone
  className?: string
}

const SIZES = {
  sm: { mark: 'size-7', ar: 'text-[1.0625rem]', en: 'text-[0.5rem]', gap: 'gap-2' },
  md: { mark: 'size-9', ar: 'text-[1.3rem]', en: 'text-[0.5625rem]', gap: 'gap-2.5' },
  lg: { mark: 'size-11', ar: 'text-[1.6rem]', en: 'text-[0.6875rem]', gap: 'gap-3' },
  xl: { mark: 'size-14', ar: 'text-[2.1rem]', en: 'text-[0.8125rem]', gap: 'gap-3.5' },
} as const

export function Logo({
  variant = 'full',
  script = 'both',
  size = 'md',
  tone = 'auto',
  className,
}: LogoProps) {
  const s = SIZES[size]

  const textColor =
    tone === 'onDark'
      ? 'text-white'
      : tone === 'mono'
        ? 'text-current'
        : 'text-foreground'

  const subColor =
    tone === 'onDark'
      ? 'text-white/55'
      : tone === 'mono'
        ? 'text-current opacity-60'
        : 'text-muted-foreground'

  if (variant === 'mark') return <LogoMark className={cn(s.mark, className)} tone={tone} />

  const wordmark = (
    <span className="flex flex-col justify-center leading-none">
      {(script === 'ar' || script === 'both') && (
        <span
          className={cn('font-display font-semibold', s.ar, textColor)}
          style={{ lineHeight: 1.1 }}
        >
          أستاذ
        </span>
      )}
      {(script === 'en' || script === 'both') && (
        <span
          className={cn(
            'mt-0.5 font-mono font-medium uppercase tracking-[0.38em]',
            s.en,
            script === 'both' ? subColor : textColor,
          )}
          dir="ltr"
        >
          Ustaz
        </span>
      )}
    </span>
  )

  if (variant === 'wordmark') return <span className={className}>{wordmark}</span>

  return (
    <span className={cn('inline-flex items-center', s.gap, className)}>
      <LogoMark className={s.mark} tone={tone} />
      {wordmark}
    </span>
  )
}

/** Loading splash mark. Used by the route-level Suspense fallback. */
export function LogoPulse({ className }: { className?: string }) {
  return (
    <div className={cn('relative grid place-items-center', className)}>
      <span className="absolute inset-0 animate-pulse-ring rounded-[1.1rem] bg-primary/25" aria-hidden />
      <LogoMark className="relative size-12" />
    </div>
  )
}

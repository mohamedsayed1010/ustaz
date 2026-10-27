import { useId, useState } from 'react'
import type { CoverPattern, SubjectKey } from '@/types'
import { subjectByKey } from '@/data/taxonomy'
import { cn } from '@/lib/utils'

/**
 * Generated cover artwork.
 *
 * Every teacher cover, group hero and course thumbnail in the product is drawn
 * from one family of six flowing line systems, tinted by the subject's hue.
 * Colours come from theme tokens (--cover-*, --primary), so a cover is a pale
 * wash in light mode and a quiet charcoal in dark mode. Nothing is tiled:
 * every system is a handful of continuous strokes. No stock photography, no
 * external image requests, no broken image boxes.
 */

interface CoverArtProps {
  pattern: CoverPattern
  subject?: SubjectKey
  className?: string
  /** Dials the artwork back behind text. */
  intensity?: 'soft' | 'normal' | 'bold'
}

export function CoverArt({ pattern, subject, className, intensity = 'normal' }: CoverArtProps) {
  const uid = useId().replace(/:/g, '')
  const hue = subject ? subjectByKey(subject).hue : 226

  const base = 'hsl(var(--cover-h) var(--cover-s) var(--cover-l))'
  const line = 'hsl(var(--cover-h) 60% var(--cover-line))'
  const signal = 'hsl(var(--primary))'
  const o = intensity === 'soft' ? 0.22 : intensity === 'bold' ? 0.5 : 0.36

  return (
    <svg
      viewBox="0 0 400 200"
      preserveAspectRatio="xMidYMid slice"
      className={cn('size-full', className)}
      style={{ '--cover-h': hue } as React.CSSProperties}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={base} stopOpacity="0" />
          <stop offset="1" stopColor={base} stopOpacity="0.75" />
        </linearGradient>
      </defs>

      <rect width="400" height="200" fill={base} />

      {/* waves — a current of parallel lines, one carrying the signal */}
      {pattern === 'waves' && (
        <g fill="none">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <path
              key={i}
              d={`M-10 ${40 + i * 20} C 110 ${20 + i * 20}, 220 ${70 + i * 20}, 410 ${34 + i * 20}`}
              stroke={i === 2 ? signal : line}
              strokeWidth={i === 2 ? 1.8 : 0.9}
              strokeOpacity={i === 2 ? 0.9 : o}
            />
          ))}
        </g>
      )}

      {/* orbit — rings around a single node */}
      {pattern === 'orbit' && (
        <g fill="none">
          {[28, 52, 76, 100, 124].map((r) => (
            <circle key={r} cx="312" cy="70" r={r} stroke={line} strokeWidth="0.9" strokeOpacity={o} />
          ))}
          <circle cx="312" cy="70" r="9" fill={signal} />
          <circle cx="260" cy="70" r="3" fill={line} fillOpacity="0.8" />
        </g>
      )}

      {/* bloom — rays through a circle */}
      {pattern === 'bloom' && (
        <g transform="translate(310 74)" fill="none">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line
              key={i}
              x1="-90"
              y1="0"
              x2="90"
              y2="0"
              stroke={line}
              strokeWidth="0.9"
              strokeOpacity={o}
              transform={`rotate(${i * 30})`}
            />
          ))}
          <circle r="54" stroke={line} strokeWidth="0.9" strokeOpacity={o} />
          <circle r="8" fill={signal} />
        </g>
      )}

      {/* arcs (was "grid") — quarter circles opening from one corner */}
      {pattern === 'grid' && (
        <g fill="none">
          {[60, 100, 140, 180, 220, 260].map((r, i) => (
            <path
              key={r}
              d={`M${400 - r} 200 A ${r} ${r} 0 0 1 400 ${200 - r}`}
              stroke={i === 2 ? signal : line}
              strokeWidth={i === 2 ? 1.8 : 0.9}
              strokeOpacity={i === 2 ? 0.9 : o}
            />
          ))}
        </g>
      )}

      {/* ribbon (was "arabesque") — two strands crossing at one node */}
      {pattern === 'arabesque' && (
        <g fill="none">
          {[0, 1, 2].map((i) => (
            <g key={i} strokeOpacity={o} stroke={line} strokeWidth="0.9">
              <path d={`M-10 ${150 - i * 14} C 120 ${150 - i * 14}, 200 ${30 + i * 10}, 410 ${40 + i * 12}`} />
              <path d={`M-10 ${40 + i * 14} C 140 ${40 + i * 14}, 220 ${170 - i * 10}, 410 ${160 - i * 12}`} />
            </g>
          ))}
          <circle cx="196" cy="98" r="7" fill={signal} />
        </g>
      )}

      {/* contour (was "strata") — nested curves, like a height map */}
      {pattern === 'strata' && (
        <g fill="none">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ellipse
              key={i}
              cx={300 - i * 6}
              cy={88 + i * 4}
              rx={30 + i * 26}
              ry={18 + i * 15}
              stroke={i === 0 ? signal : line}
              strokeWidth={i === 0 ? 1.8 : 0.9}
              strokeOpacity={i === 0 ? 0.9 : o}
              transform={`rotate(-12 ${300 - i * 6} ${88 + i * 4})`}
            />
          ))}
        </g>
      )}

      <rect y="110" width="400" height="90" fill={`url(#fade-${uid})`} />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/*                                Section rule                                */
/* -------------------------------------------------------------------------- */

/** Section rule: a hairline led by a short orange segment. */
export function SectionRule({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center', className)} aria-hidden>
      <span className="h-0.5 w-8 bg-primary" />
      <span className="h-px flex-1 bg-current opacity-15" />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                          Real image with art fallback                      */
/* -------------------------------------------------------------------------- */

/**
 * Shows an uploaded cover when the API has one and falls back to the generated
 * artwork otherwise — so a missing upload is never an empty grey band.
 */
export function CoverImage({
  src,
  pattern,
  subject,
  intensity = 'normal',
  className,
  alt = '',
}: {
  src?: string
  pattern: CoverPattern
  subject?: SubjectKey
  intensity?: 'soft' | 'normal' | 'bold'
  className?: string
  alt?: string
}) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn('size-full object-cover', className)}
      />
    )
  }

  return <CoverArt pattern={pattern} subject={subject} intensity={intensity} className={className} />
}

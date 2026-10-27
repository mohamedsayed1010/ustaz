import { MapPin, Monitor, Video } from 'lucide-react'
import type { ScheduleSlotDto } from '@/api/schema'
import { useSlotView } from '@/components/schedule/SlotCard'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

/**
 * A day-ordered timeline of classes. The first entry is "next up" and carries
 * the signal colour; the rest hang off the same rail. Used by all three
 * consoles, so a parent reading their child's afternoon sees exactly the
 * shape the student and the teacher see.
 */
export function Agenda({
  slots,
  showTeacher = true,
  className,
}: {
  slots: ScheduleSlotDto[]
  showTeacher?: boolean
  className?: string
}) {
  return (
    <ol className={cn('relative', className)}>
      {slots.map((slot, i) => (
        <AgendaItem
          key={slot.id ?? i}
          slot={slot}
          first={i === 0}
          last={i === slots.length - 1}
          showTeacher={showTeacher}
        />
      ))}
    </ol>
  )
}

function AgendaItem({
  slot,
  first,
  last,
  showTeacher,
}: {
  slot: ScheduleSlotDto
  first: boolean
  last: boolean
  showTeacher: boolean
}) {
  const { locale, formatTime } = useI18n()
  const view = useSlotView(slot)
  const place =
    slot.location || (view.isOnline ? (locale === 'ar-EG' ? 'أونلاين' : 'Online') : null)

  return (
    <li className="relative flex gap-4 px-5 py-3.5">
      {/* time column */}
      <div className="w-14 shrink-0 pt-0.5 text-end">
        <p className="tnum text-body-sm font-semibold text-foreground">
          {slot.startTime ? formatTime(slot.startTime) : '—'}
        </p>
        {slot.endTime && (
          <p className="tnum text-[0.6875rem] text-muted-foreground">{formatTime(slot.endTime)}</p>
        )}
      </div>

      {/* rail */}
      <div className="relative flex w-3 shrink-0 justify-center" aria-hidden>
        {!first && <span className="absolute top-[-0.875rem] h-[1.4rem] w-px bg-border" />}
        <span
          className={cn(
            'relative z-10 mt-1.5 size-2.5 rounded-full border-2',
            first || view.isLive ? 'border-accent bg-accent' : 'border-input bg-card',
          )}
        />
        {!last && <span className="absolute bottom-[-0.875rem] top-4 w-px bg-border" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-body-sm font-semibold text-foreground">{slot.groupName}</p>
          {view.isLive ? (
            <span className="shrink-0 text-[0.6875rem] font-semibold text-accent-strong">
              {locale === 'ar-EG' ? 'دلوقتي' : 'Now'}
            </span>
          ) : (
            view.nextLabel && (
              <span className="shrink-0 text-[0.6875rem] font-medium text-muted-foreground">
                {view.nextLabel}
              </span>
            )
          )}
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
          {[showTeacher ? slot.teacherName : null, view.subjectName].filter(Boolean).join(' · ')}
        </p>
        {(place || slot.meetingUrl) && (
          <p className="mt-1 flex items-center gap-1.5 text-caption text-muted-foreground">
            {view.isOnline ? (
              <Monitor className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <MapPin className="size-3.5 shrink-0" aria-hidden />
            )}
            <span className="truncate">{place}</span>
            {slot.meetingUrl && (
              <a
                href={slot.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ms-auto inline-flex shrink-0 items-center gap-1 font-semibold text-accent-strong hover:underline"
              >
                <Video className="size-3.5" aria-hidden />
                {locale === 'ar-EG' ? 'ادخل' : 'Join'}
              </a>
            )}
          </p>
        )}
      </div>
    </li>
  )
}

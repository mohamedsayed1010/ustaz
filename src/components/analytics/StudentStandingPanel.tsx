import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AnalyticsPeriod } from '@/api/endpoints/common'
import type { StudentAnalyticsDto, StudentSubjectStandingDto } from '@/api/schema'
import { useI18n } from '@/i18n'
import { DashboardSection } from '@/components/dashboard/DashboardHeader'
import { MetricStrip, toneFor } from '@/components/dashboard/kit'
import { FilterChip } from '@/components/common/controls'
import { QueryError } from '@/components/common/QueryBoundary'
import { EmptyState } from '@/components/common/states'
import { StatSkeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

const PERIODS: { value: AnalyticsPeriod; ar: string; en: string }[] = [
  { value: 'Last30Days', ar: '٣٠ يوم', en: '30 days' },
  { value: 'Last90Days', ar: '٩٠ يوم', en: '90 days' },
  { value: 'Last12Months', ar: 'سنة', en: '12 months' },
]

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v)}%`)

/**
 * A student's academic standing for a window — the same StudentAnalyticsDto the
 * student reads about themselves (GET /student/analytics) and a guardian reads
 * about a linked child (GET /parent/children/{id}/analytics).
 */
export function StudentStandingPanel({
  queryKey,
  load,
  title,
}: {
  /** Base key; the selected period is appended. */
  queryKey: readonly unknown[]
  load: (period: AnalyticsPeriod) => Promise<StudentAnalyticsDto>
  title?: string
}) {
  const { locale, formatNumber } = useI18n()
  const ar = locale === 'ar-EG'
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('Last90Days')

  const analytics = useQuery({
    queryKey: [...queryKey, period],
    queryFn: () => load(period),
  })
  const a = analytics.data

  const hasAnyMark = !!a && [a.overallScore, a.examAverage, a.homeworkAverage, a.attendancePercentage].some(
    (v) => v !== null && v !== undefined,
  )

  return (
    <DashboardSection
      title={title ?? (ar ? 'المستوى الدراسي' : 'Academic standing')}
      action={
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <FilterChip
              key={p.value}
              label={ar ? p.ar : p.en}
              active={period === p.value}
              onClick={() => setPeriod(p.value)}
            />
          ))}
        </div>
      }
    >
      {analytics.isPending ? (
        <StatSkeleton count={4} />
      ) : analytics.isError ? (
        <QueryError error={analytics.error} onRetry={() => analytics.refetch()} compact />
      ) : !hasAnyMark ? (
        <EmptyState
          spot="exams"
          compact
          title={ar ? 'لسه مفيش درجات في الفترة دي' : 'No marks in this period yet'}
          description={
            ar
              ? 'المستوى بيظهر بعد أول امتحان أو واجب أو حصة.'
              : 'Standing appears after the first exam, homework or class.'
          }
        />
      ) : (
        <div className="space-y-4">
          <MetricStrip
            items={[
              { label: ar ? 'المستوى العام' : 'Overall', value: pct(a!.overallScore), tone: tone(a!.overallScore), meter: a!.overallScore ?? undefined },
              { label: ar ? 'الامتحانات' : 'Exams', value: pct(a!.examAverage), tone: tone(a!.examAverage) },
              { label: ar ? 'الواجبات' : 'Homework', value: pct(a!.homeworkAverage), tone: tone(a!.homeworkAverage) },
              { label: ar ? 'الحضور' : 'Attendance', value: pct(a!.attendancePercentage), tone: tone(a!.attendancePercentage) },
            ]}
          />
          <MetricStrip
            items={[
              {
                label: ar ? 'أيام متتالية' : 'Learning streak',
                value: formatNumber(a!.engagement?.learningStreakDays ?? 0),
                hint: ar
                  ? `الأطول ${formatNumber(a!.engagement?.longestStreakDays ?? 0)} يوم`
                  : `Longest ${a!.engagement?.longestStreakDays ?? 0} days`,
              },
              {
                label: ar ? 'أيام نشاط' : 'Active days',
                value: formatNumber(a!.engagement?.activeDaysInWindow ?? 0),
              },
              {
                label: ar ? 'إنجاز الكورسات' : 'Course completion',
                value: pct(a!.courseCompletion),
              },
              {
                label: ar ? 'واجبات متأخرة' : 'Overdue homework',
                value: formatNumber(a!.workload?.overdueHomework ?? 0),
                tone: (a!.workload?.overdueHomework ?? 0) > 0 ? 'warn' : 'default',
              },
            ]}
          />
          {((a!.strongSubjects ?? []).length > 0 || (a!.weakSubjects ?? []).length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              <SubjectList title={ar ? 'أقوى المواد' : 'Strongest subjects'} rows={a!.strongSubjects ?? []} />
              <SubjectList title={ar ? 'محتاجة مجهود' : 'Needs attention'} rows={a!.weakSubjects ?? []} />
            </div>
          )}
        </div>
      )}
    </DashboardSection>
  )
}

function tone(v: number | null | undefined) {
  return v === null || v === undefined ? 'default' : toneFor(v)
}

function SubjectList({ title, rows }: { title: string; rows: StudentSubjectStandingDto[] }) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  return (
    <Card className="p-4">
      <h3 className="mb-2 font-display text-body font-semibold text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">—</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((s) => (
            <li key={s.subjectId} className="flex items-center justify-between gap-3 py-2 text-body-sm">
              <span className="text-foreground">{ar ? s.subjectNameAr : s.subjectNameEn}</span>
              <span className="tnum text-muted-foreground">{pct(s.averagePercentage)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

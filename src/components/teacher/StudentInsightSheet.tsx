import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { teacherActivityApi, teacherAnalyticsApi, teacherAttendanceApi, teacherExamsApi } from '@/api/endpoints/teacher'
import { qk } from '@/lib/query-client'
import { useI18n } from '@/i18n'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { QueryError } from '@/components/common/QueryBoundary'
import { EmptyState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { RowSkeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { describeActivity } from '@/components/activity/ActivityTimeline'
import { cn } from '@/lib/utils'

type Section = 'standing' | 'grades' | 'attendance' | 'activity'

/**
 * One student, as the teacher sees them: standing and risk reasons, grades,
 * attendance history and activity. Read-only, and each section loads only
 * when it is opened. Deliberately static — this is a console surface.
 */
export function StudentInsightSheet({
  studentId,
  studentName,
  open,
  onOpenChange,
}: {
  studentId: string | null
  studentName?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const [section, setSection] = React.useState<Section>('standing')

  React.useEffect(() => {
    if (open) setSection('standing')
  }, [open, studentId])

  const tabs: { id: Section; label: string }[] = [
    { id: 'standing', label: ar ? 'المستوى' : 'Standing' },
    { id: 'grades', label: ar ? 'الدرجات' : 'Grades' },
    { id: 'attendance', label: ar ? 'الحضور' : 'Attendance' },
    { id: 'activity', label: ar ? 'النشاط' : 'Activity' },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="flex w-full max-w-xl flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border p-5 text-start">
          <SheetTitle className="truncate">{studentName}</SheetTitle>
          <SheetDescription>{ar ? 'ملف الطالب في مساحة عملك' : 'This student in your workspace'}</SheetDescription>
          <div role="tablist" aria-label={ar ? 'أقسام الملف' : 'Profile sections'} className="mt-3 inline-flex h-9 gap-0.5 self-start rounded-md bg-foreground/[0.06] p-[3px]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={section === tab.id}
                onClick={() => setSection(tab.id)}
                className={cn(
                  'rounded-[5px] px-3 text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  section === tab.id ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5" role="tabpanel">
          {studentId && open && section === 'standing' && <Standing studentId={studentId} />}
          {studentId && open && section === 'grades' && <Grades studentId={studentId} />}
          {studentId && open && section === 'attendance' && <Attendance studentId={studentId} />}
          {studentId && open && section === 'activity' && <Activity studentId={studentId} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-caption text-muted-foreground">{label}</p>
      <p className="tnum mt-1 font-display text-heading-sm text-foreground">{value}</p>
    </div>
  )
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v)}%`)

function Standing({ studentId }: { studentId: string }) {
  const { locale, formatNumber } = useI18n()
  const ar = locale === 'ar-EG'
  const risk = useQuery({
    queryKey: ['teacher', 'analytics', 'at-risk', 'student', studentId],
    queryFn: () => teacherAnalyticsApi.atRiskStudent(studentId),
  })
  const analytics = useQuery({
    queryKey: ['teacher', 'analytics', 'student', studentId, 'Last90Days'],
    queryFn: () => teacherAnalyticsApi.studentAnalytics(studentId, { Period: 'Last90Days' }),
  })

  if (risk.isPending || analytics.isPending) return <RowSkeleton count={4} />

  const r = risk.data
  const a = analytics.data
  const tone = r?.riskLevel === 'High' ? 'destructive' : r?.riskLevel === 'Medium' ? 'warning' : r?.riskLevel === 'Low' ? 'info' : 'success'

  return (
    <div className="space-y-6">
      {risk.isError ? (
        <QueryError error={risk.error} onRetry={() => risk.refetch()} />
      ) : (
        r && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-body font-semibold text-foreground">{ar ? 'درجة الخطر' : 'Risk'}</h3>
              <Badge variant={tone} size="sm">
                {r.riskLevelName ?? r.riskLevel}
              </Badge>
            </div>
            {(r.reasons ?? []).length > 0 && (
              <ul className="space-y-1.5 text-body-sm text-muted-foreground">
                {(r.reasons ?? []).map((reason) => (
                  <li key={reason.code} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    {ar ? reason.messageAr : reason.messageEn}
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <Metric label={ar ? 'الحضور' : 'Attendance'} value={pct(r.attendanceRate)} />
              <Metric label={ar ? 'تسليم الواجبات' : 'Homework done'} value={pct(r.homeworkCompletionRate)} />
              <Metric label={ar ? 'متوسط الامتحانات' : 'Exam average'} value={pct(r.averageExamPercentage)} />
              <Metric
                label={ar ? 'آخر نشاط' : 'Last active'}
                value={
                  r.lastActivityAt
                    ? ar
                      ? `من ${formatNumber(r.daysSinceLastActivity ?? 0)} يوم`
                      : `${r.daysSinceLastActivity} days ago`
                    : '—'
                }
              />
            </div>
          </section>
        )
      )}

      {analytics.isError ? (
        <QueryError error={analytics.error} onRetry={() => analytics.refetch()} />
      ) : (
        a && (
          <section className="space-y-3">
            <h3 className="font-display text-body font-semibold text-foreground">
              {ar ? 'آخر ٩٠ يوم' : 'Last 90 days'}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Metric label={ar ? 'المستوى العام' : 'Overall'} value={pct(a.overallScore)} />
              <Metric label={ar ? 'الامتحانات' : 'Exams'} value={pct(a.examAverage)} />
              <Metric label={ar ? 'الواجبات' : 'Homework'} value={pct(a.homeworkAverage)} />
              <Metric label={ar ? 'الحضور' : 'Attendance'} value={pct(a.attendancePercentage)} />
            </div>
            {(a.subjectBreakdown ?? []).length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {(a.subjectBreakdown ?? []).map((s) => (
                  <li key={s.subjectId} className="flex items-center justify-between gap-3 p-3 text-body-sm">
                    <span className="text-foreground">{ar ? s.subjectNameAr : s.subjectNameEn}</span>
                    <span className="tnum text-muted-foreground">{pct(s.averagePercentage)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      )}
    </div>
  )
}

function Grades({ studentId }: { studentId: string }) {
  const { locale, formatNumber, formatDate } = useI18n()
  const ar = locale === 'ar-EG'
  const grades = useQuery({
    queryKey: ['teacher', 'exams', 'student-grades', studentId],
    queryFn: () => teacherExamsApi.studentGrades(studentId),
  })
  if (grades.isPending) return <RowSkeleton count={4} />
  if (grades.isError) return <QueryError error={grades.error} onRetry={() => grades.refetch()} />
  const g = grades.data
  const results = g?.results ?? []
  if (!results.length) return <EmptyState spot="exams" title={ar ? 'لسه مفيش درجات' : 'No grades yet'} compact />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <Metric label={ar ? 'امتحانات' : 'Exams'} value={formatNumber(g?.examsTaken ?? 0)} />
        <Metric label={ar ? 'نجح في' : 'Passed'} value={formatNumber(g?.examsPassed ?? 0)} />
        <Metric label={ar ? 'المتوسط' : 'Average'} value={pct(g?.averagePercentage)} />
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {results.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 p-3">
            <span className="min-w-0">
              <span className="block truncate text-body-sm font-semibold text-foreground">{r.examTitle}</span>
              <span className="tnum block text-caption text-muted-foreground">
                {r.examDate ? formatDate(r.examDate, 'd MMM yyyy') : ''}
              </span>
            </span>
            <span className="tnum shrink-0 text-body-sm text-foreground">
              {r.isAbsent ? (ar ? 'غياب' : 'Absent') : `${formatNumber(r.score ?? 0)} / ${formatNumber(r.maximumScore ?? 0)}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Attendance({ studentId }: { studentId: string }) {
  const { locale, formatDate } = useI18n()
  const ar = locale === 'ar-EG'
  const records = useQuery({
    queryKey: ['teacher', 'attendance', 'student', studentId],
    queryFn: () => teacherAttendanceApi.byStudent(studentId, { PageSize: 30 }),
  })
  if (records.isPending) return <RowSkeleton count={5} />
  if (records.isError) return <QueryError error={records.error} onRetry={() => records.refetch()} />
  const items = records.data?.items ?? []
  if (!items.length) return <EmptyState spot="calendar" title={ar ? 'لسه مفيش حضور متسجّل' : 'No attendance recorded yet'} compact />

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {items.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 p-3">
          <span className="min-w-0">
            <span className="tnum block text-body-sm font-semibold text-foreground">
              {r.sessionDate ? formatDate(r.sessionDate, 'EEEE d MMM') : ''}
            </span>
            <span className="block truncate text-caption text-muted-foreground">{r.groupName}</span>
          </span>
          <StatusBadge status={r.status} fallbackLabel={r.statusName} />
        </li>
      ))}
    </ul>
  )
}

function Activity({ studentId }: { studentId: string }) {
  const { locale, formatNumber, formatTimeAgo } = useI18n()
  const ar = locale === 'ar-EG'
  const events = useQuery({
    queryKey: qk.teacher.studentActivity(studentId, { PageSize: 30 }),
    queryFn: () => teacherActivityApi.forStudent(studentId, { PageSize: 30 }),
  })
  if (events.isPending) return <RowSkeleton count={5} />
  if (events.isError) return <QueryError error={events.error} onRetry={() => events.refetch()} />
  const items = events.data?.items ?? []
  if (!items.length) return <EmptyState spot="inbox" title={ar ? 'لسه مفيش نشاط' : 'No activity yet'} compact />

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {items.map((e) => {
        const d = describeActivity(e, ar, formatNumber)
        return (
          <li key={e.id} className="p-3 text-body-sm">
            <p className="text-foreground">
              {d.phrase}
              {d.subject && <span className="font-semibold"> · {d.subject}</span>}
              {d.detail && <span className="tnum text-muted-foreground"> · {d.detail}</span>}
            </p>
            <p className="tnum mt-0.5 text-caption text-muted-foreground">{e.occurredAt ? formatTimeAgo(e.occurredAt) : ''}</p>
          </li>
        )
      })}
    </ul>
  )
}

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ClipboardCheck, FileText, Megaphone, UserPlus } from 'lucide-react'
import { parentApi } from '@/api/endpoints/parent'
import type { ChildOverviewDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { usePageTitle } from '@/hooks/use-page-title'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/i18n'
import { avatarTraitsFor, imageUrl } from '@/lib/identity'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import {
  DateTile,
  IconMark,
  ListRow,
  Meter,
  MetricStrip,
  Panel,
  PanelLink,
  RoleDot,
  RowList,
} from '@/components/dashboard/kit'
import { Agenda } from '@/components/dashboard/Agenda'
import { StatSkeleton, RowSkeleton } from '@/components/ui/skeleton'
import { QueryError } from '@/components/common/QueryBoundary'
import { EmptyState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/illustrations/PersonAvatar'

/**
 * Parent console — a report, not a control panel. It answers three questions
 * in order: does anything need me, how is each child doing, and what did the
 * teachers record this week. Every figure here is the same one the teacher
 * entered and the student sees; the parent reads it, they don't re-key it.
 */
export default function ParentDashboardPage() {
  const { t, locale, formatNumber, formatCurrency, formatDate, formatTimeAgo } = useI18n()
  const { user } = useAuth()
  const ar = locale === 'ar-EG'
  usePageTitle(t('dashboard.overview'))

  const dashboard = useQuery({
    queryKey: qk.parent.dashboard,
    queryFn: parentApi.dashboard,
  })
  const announcements = useQuery({
    queryKey: qk.parent.announcements({ PageSize: 3 }),
    queryFn: () => parentApi.announcements({ PageSize: 3 }),
  })

  const data = dashboard.data
  const children = data?.children ?? []
  const today = new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const absences = data?.absenceAlertsCount ?? 0
  const pendingHw = data?.pendingHomeworkCount ?? 0
  const exams = data?.upcomingExamsCount ?? 0
  const owed = data?.outstandingPayments ?? 0

  return (
    <>
      <DashboardHeader
        eyebrow={today}
        title={t('dashboard.welcome', { name: user?.firstName || user?.displayName || '' })}
        description={
          ar
            ? 'أسبوع أولادك كما سجّله مدرّسينهم: الحضور، الدرجات، الواجبات، والمدفوعات.'
            : "Your children's week as their teachers recorded it: attendance, grades, homework and payments."
        }
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/parent/children">
              <UserPlus />
              {t('parent.linkChild')}
            </Link>
          </Button>
        }
      />

      {/* ------------------------- What needs you ------------------------- */}
      {dashboard.isPending ? (
        <StatSkeleton count={4} />
      ) : dashboard.isError ? (
        <QueryError error={dashboard.error} onRetry={() => dashboard.refetch()} />
      ) : (
        <MetricStrip
          items={[
            {
              label: ar ? 'تنبيهات غياب' : 'Absence alerts',
              value: formatNumber(absences),
              tone: absences > 0 ? 'bad' : 'default',
              hint: absences > 0 ? (ar ? 'محتاجة متابعة' : 'Worth a follow-up') : ar ? 'الحضور منتظم' : 'Attendance on track',
            },
            {
              label: ar ? 'واجبات مستحقة' : 'Homework due',
              value: formatNumber(pendingHw),
              tone: pendingHw > 0 ? 'warn' : 'default',
              hint: ar ? 'لكل الأبناء' : 'Across all children',
            },
            {
              label: ar ? 'امتحانات قريبة' : 'Upcoming exams',
              value: formatNumber(exams),
              hint: ar ? 'الأسبوعين الجايين' : 'Next two weeks',
            },
            {
              label: ar ? 'مدفوعات مستحقة' : 'Outstanding',
              value: formatCurrency(owed),
              tone: owed > 0 ? 'bad' : 'default',
              hint: owed > 0 ? (ar ? 'تُدفع للمدرّس مباشرة' : 'Paid to the teacher directly') : ar ? 'مفيش مستحقات' : 'Nothing owed',
            },
          ]}
        />
      )}

      {/* ---------------------------- Children ---------------------------- */}
      <Panel
        className="mt-6"
        title={t('parent.children')}
        description={
          children.length > 0
            ? ar
              ? `${formatNumber(children.length)} مربوطين بحسابك`
              : `${formatNumber(children.length)} linked to your account`
            : undefined
        }
        action={<PanelLink to="/parent/children">{t('common.viewAll')}</PanelLink>}
        flush
      >
        {dashboard.isPending ? (
          <div className="p-5">
            <RowSkeleton count={2} />
          </div>
        ) : children.length === 0 ? (
          <div className="p-5">
            <EmptyState
              spot="teachers"
              title={t('parent.noChildren')}
              description={t('parent.noChildrenHint')}
              action={{ label: t('parent.linkChild'), href: '/parent/children' }}
            />
          </div>
        ) : (
          <RowList>
            {children.map((child) => (
              <ChildRow key={child.studentId} child={child} />
            ))}
          </RowList>
        )}
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="space-y-6">
          <Panel
            title={ar ? 'آخر الدرجات' : 'Recent grades'}
            description={ar ? 'زي ما رصدها المدرّس' : 'As recorded by the teacher'}
            flush
          >
            {dashboard.isPending ? (
              <div className="p-5">
                <RowSkeleton count={3} />
              </div>
            ) : (data?.recentGrades ?? []).length === 0 ? (
              <p className="px-5 py-6 text-center text-caption text-muted-foreground">
                {ar ? 'مفيش درجات جديدة.' : 'No new grades.'}
              </p>
            ) : (
              <RowList>
                {data!.recentGrades!.map((result) => {
                  const pct =
                    result.percentage ??
                    ((result.score ?? 0) / Math.max(1, result.maximumScore ?? 1)) * 100
                  return (
                    <div
                      key={result.id}
                      className="grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-body-sm font-semibold text-foreground">{result.examTitle}</p>
                        <p className="truncate text-caption text-muted-foreground">
                          {result.studentName}
                          {result.groupName ? ` · ${result.groupName}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Meter value={pct} className="flex-1" />
                        <span className="tnum shrink-0 text-body-sm font-semibold text-foreground">
                          {formatNumber(result.score ?? 0)}/{formatNumber(result.maximumScore ?? 0)}
                        </span>
                      </div>
                      <Badge
                        variant={result.isPassed ? 'success' : 'destructive'}
                        size="sm"
                        className="justify-self-start sm:justify-self-end"
                      >
                        {result.isPassed ? t('exams.passed') : t('exams.failed')}
                      </Badge>
                    </div>
                  )
                })}
              </RowList>
            )}
          </Panel>

          <Panel title={ar ? 'آخر حالات الغياب' : 'Recent absences'} flush>
            {dashboard.isPending ? (
              <div className="p-5">
                <RowSkeleton count={2} />
              </div>
            ) : (data?.recentAbsences ?? []).length === 0 ? (
              <p className="px-5 py-6 text-center text-caption text-muted-foreground">
                {ar ? 'مفيش غياب — الحضور منتظم.' : 'No absences — attendance is on track.'}
              </p>
            ) : (
              <RowList>
                {data!.recentAbsences!.map((record) => (
                  <ListRow
                    key={record.id}
                    leading={record.sessionDate ? <DateTile date={new Date(record.sessionDate)} /> : undefined}
                    title={record.studentName}
                    meta={
                      <span className="tnum">
                        {record.groupName}
                        {record.sessionDate ? ` · ${formatDate(record.sessionDate, 'd MMM')}` : ''}
                      </span>
                    }
                    trailing={<StatusBadge status={record.status} fallbackLabel={record.statusName} />}
                  />
                ))}
              </RowList>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            title={ar ? 'حصص النهارده' : "Today's classes"}
            action={<PanelLink to="/parent/calendar">{ar ? 'التقويم' : 'Calendar'}</PanelLink>}
            flush
            bodyClassName="py-1.5"
          >
            {dashboard.isPending ? (
              <div className="p-5">
                <RowSkeleton count={2} />
              </div>
            ) : (data?.todaysSchedule ?? []).length === 0 ? (
              <p className="px-5 py-6 text-center text-caption text-muted-foreground">
                {ar ? 'مفيش حصص النهارده.' : 'No classes today.'}
              </p>
            ) : (
              <Agenda slots={data!.todaysSchedule!} />
            )}
          </Panel>

          <Panel
            title={ar ? 'من المدرّسين' : 'From the teachers'}
            action={<PanelLink to="/parent/announcements">{t('common.viewAll')}</PanelLink>}
            flush
          >
            {announcements.isPending ? (
              <div className="p-5">
                <RowSkeleton count={2} />
              </div>
            ) : (announcements.data?.items ?? []).length === 0 ? (
              <p className="px-5 py-6 text-center text-caption text-muted-foreground">
                {ar ? 'مفيش إعلانات جديدة.' : 'No new announcements.'}
              </p>
            ) : (
              <RowList>
                {announcements.data!.items.map((a) => (
                  <Link
                    key={a.id}
                    to="/parent/announcements"
                    className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <IconMark tone="teacher">
                      <Megaphone />
                    </IconMark>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-sm font-semibold text-foreground">{a.title}</span>
                      <span className="line-clamp-2-rtl text-caption text-muted-foreground">{a.body}</span>
                      <span className="mt-1 block text-[0.6875rem] text-muted-foreground">
                        {[a.tenantName ?? a.groupName, a.publishedAt ?? a.createdAt ? formatTimeAgo((a.publishedAt ?? a.createdAt)!) : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </Link>
                ))}
              </RowList>
            )}
          </Panel>

          {(data?.upcomingClasses ?? []).length > 0 && (
            <Panel title={t('dashboard.upcomingClasses')} flush bodyClassName="py-1.5">
              <Agenda slots={data!.upcomingClasses!.slice(0, 4)} />
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}

/** One child, one line: who, how they're doing, what's open. */
function ChildRow({ child }: { child: ChildOverviewDto }) {
  const { t, locale, formatNumber, isRtl } = useI18n()
  const ar = locale === 'ar-EG'
  const Chevron = isRtl ? ChevronLeft : ChevronRight

  return (
    <Link
      to={`/parent/children/${child.studentId}`}
      className="group grid items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
    >
      <span className="flex min-w-0 items-center gap-3.5">
        <span className="relative shrink-0">
          <Avatar
            traits={avatarTraitsFor(child.studentId ?? '')}
            seed={child.studentId ?? ''}
            name={child.displayName ?? ''}
            src={imageUrl(child.profileImageUrl)}
            size="md"
          />
          <RoleDot role="student" className="absolute -bottom-0.5 -end-0.5 size-2.5 ring-2 ring-card" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body font-semibold text-foreground group-hover:text-accent-strong">
            {child.displayName}
          </span>
          <span className="block truncate text-caption text-muted-foreground">
            {[
              child.gradeName,
              `${formatNumber(child.activeGroupsCount ?? 0)} ${t('common.groups')}`,
              `${formatNumber(child.activeCoursesCount ?? 0)} ${t('common.courses')}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
      </span>

      <Meter label={t('dashboard.attendance')} value={child.attendanceRate ?? 0} showValue size="md" />
      <Meter label={t('dashboard.grades')} value={child.averageGradePercentage ?? 0} showValue size="md" />

      <span className="flex items-center justify-between gap-2 md:justify-end">
        <span className="flex flex-wrap gap-1.5">
          {(child.pendingHomeworkCount ?? 0) > 0 && (
            <Badge variant="warning" size="sm" className="tnum">
              <ClipboardCheck />
              {formatNumber(child.pendingHomeworkCount ?? 0)} {ar ? 'واجب' : 'homework'}
            </Badge>
          )}
          {(child.upcomingExamsCount ?? 0) > 0 && (
            <Badge variant="info" size="sm" className="tnum">
              <FileText />
              {formatNumber(child.upcomingExamsCount ?? 0)} {ar ? 'امتحان' : 'exams'}
            </Badge>
          )}
        </span>
        <Chevron className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </span>
    </Link>
  )
}

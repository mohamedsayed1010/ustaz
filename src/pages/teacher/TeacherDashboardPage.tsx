import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookOpen,
  CalendarPlus,
  ClipboardCheck,
  FileText,
  Megaphone,
  MessageSquare,
  UserPlus,
} from 'lucide-react'
import { teacherAnalyticsApi, teacherInquiriesApi } from '@/api/endpoints/teacher'
import { InquiryStatusMenu } from '@/components/teacher/InquiryStatusMenu'
import type { AtRiskStudentDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { usePageTitle } from '@/hooks/use-page-title'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/i18n'
import { avatarTraitsFor } from '@/lib/identity'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import {
  IconMark,
  ListRow,
  Meter,
  MetricStrip,
  Panel,
  PanelLink,
  RowList,
} from '@/components/dashboard/kit'
import { Agenda } from '@/components/dashboard/Agenda'
import { VerificationPanel } from '@/components/teacher/VerificationPanel'
import { StatSkeleton, RowSkeleton } from '@/components/ui/skeleton'
import { QueryError } from '@/components/common/QueryBoundary'
import { EmptyState } from '@/components/common/states'
import { RevenueAreaChart } from '@/components/dashboard/charts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/illustrations/PersonAvatar'

/**
 * Teacher console — an operations view. The order follows a teaching day:
 * what's on the timetable, who is slipping, how the business is doing, and
 * who is asking to join. Everything links through to the screen that acts on it.
 */
export default function TeacherDashboardPage() {
  const { t, locale, formatNumber, formatCurrency, formatTimeAgo } = useI18n()
  const { user } = useAuth()
  const ar = locale === 'ar-EG'
  usePageTitle(t('dashboard.overview'))

  const dashboard = useQuery({
    queryKey: qk.teacher.dashboard,
    queryFn: teacherAnalyticsApi.dashboard,
  })

  const [revenue, atRisk, inquiries] = useQueries({
    queries: [
      { queryKey: qk.teacher.revenue(6), queryFn: () => teacherAnalyticsApi.revenue(6) },
      {
        queryKey: qk.teacher.atRisk({ Take: 5 }),
        queryFn: () => teacherAnalyticsApi.atRisk({ Take: 5, MinimumLevel: 'Medium' }),
      },
      {
        queryKey: qk.teacher.inquiries({ Status: 'New', PageSize: 5 }),
        queryFn: () => teacherInquiriesApi.list({ Status: 'New', PageSize: 5 }),
      },
    ],
  })

  const data = dashboard.data
  const revenueSeries = (revenue.data ?? []).map((point) => ({
    label: point.label ?? '',
    value: point.totalRevenue ?? 0,
    secondary: point.courseRevenue ?? 0,
  }))
  const today = new Intl.DateTimeFormat(ar ? 'ar-EG' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  return (
    <>
      <DashboardHeader
        eyebrow={today}
        title={t('dashboard.welcome', { name: user?.firstName || user?.displayName || '' })}
        description={ar ? 'جدولك، طلابك، وشغلك — في صفحة واحدة.' : 'Your timetable, your students, your practice — on one page.'}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/teacher/announcements">
                <Megaphone />
                {t('dashboard.announcements')}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/teacher/groups?new=1">
                <CalendarPlus />
                {ar ? 'مجموعة جديدة' : 'New group'}
              </Link>
            </Button>
          </>
        }
      />

      <VerificationPanel className="mb-6" hideWhenVerified />

      {dashboard.isPending ? (
        <StatSkeleton count={4} />
      ) : dashboard.isError ? (
        <QueryError error={dashboard.error} onRetry={() => dashboard.refetch()} />
      ) : (
        <MetricStrip
          items={[
            {
              label: t('dashboard.totalStudents'),
              value: formatNumber(data?.totalStudents ?? 0),
              hint:
                (data?.newInquiriesCount ?? 0) > 0
                  ? ar
                    ? `${formatNumber(data!.newInquiriesCount!)} طلب انضمام جديد`
                    : `${formatNumber(data!.newInquiriesCount!)} new inquiries`
                  : undefined,
              href: '/teacher/students',
            },
            {
              label: t('dashboard.monthlyRevenue'),
              value: formatCurrency(data?.monthlyRevenue ?? 0),
              hint: `${t('common.total')}: ${formatCurrency(data?.totalRevenue ?? 0)}`,
              href: '/teacher/payments',
            },
            {
              label: t('dashboard.activeGroups'),
              value: formatNumber(data?.activeGroupsCount ?? 0),
              hint:
                (data?.draftGroupsCount ?? 0) > 0
                  ? `${formatNumber(data!.draftGroupsCount!)} ${t('common.draft')}`
                  : `${formatNumber(data?.publishedCoursesCount ?? 0)} ${t('common.courses')}`,
              href: '/teacher/groups',
            },
            {
              label: t('dashboard.averageRating'),
              value: (data?.averageRating ?? 0).toFixed(1),
              hint: `${formatNumber(data?.reviewCount ?? 0)} ${t('common.reviews')}`,
              href: '/teacher/reviews',
            },
          ]}
        />
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22.5rem]">
        {/* ------------------------------ Main ------------------------------ */}
        <div className="space-y-6">
          <Panel
            title={t('dashboard.revenue')}
            description={ar ? 'آخر ٦ شهور — المجموعات والكورسات' : 'Last 6 months — groups and courses'}
            action={<PanelLink to="/teacher/analytics">{t('dashboard.analytics')}</PanelLink>}
          >
            {revenue.isPending ? (
              <div className="h-[260px] animate-pulse rounded-md bg-muted" />
            ) : revenue.isError ? (
              <QueryError error={revenue.error} onRetry={() => revenue.refetch()} compact />
            ) : revenueSeries.every((p) => p.value === 0) ? (
              <EmptyState
                spot="payments"
                compact
                className="border-0"
                title={ar ? 'لسه مفيش إيرادات' : 'No revenue yet'}
                description={
                  ar
                    ? 'أول ما طالب يشترك في مجموعة أو كورس هتشوف الأرقام هنا.'
                    : 'Numbers appear here as soon as a student enrolls.'
                }
              />
            ) : (
              <RevenueAreaChart data={revenueSeries} />
            )}
          </Panel>

          <Panel
            title={t('dashboard.atRiskStudents')}
            description={
              ar
                ? 'طلاب الحضور أو الواجبات أو الدرجات عندهم بتقلّ — وولي أمرهم بيشوف نفس الأرقام.'
                : 'Attendance, homework or grades are slipping — and their parents see the same figures.'
            }
            action={<PanelLink to="/teacher/students">{t('common.viewAll')}</PanelLink>}
            flush
          >
            {atRisk.isPending ? (
              <div className="p-5">
                <RowSkeleton count={3} />
              </div>
            ) : atRisk.isError ? (
              <div className="p-5">
                <QueryError error={atRisk.error} onRetry={() => atRisk.refetch()} compact />
              </div>
            ) : (atRisk.data ?? []).length === 0 ? (
              <div className="p-5">
                <EmptyState
                  spot="success"
                  compact
                  title={ar ? 'مفيش طلاب محتاجين متابعة' : 'No students need attention'}
                  description={
                    ar
                      ? 'كل طلابك منتظمين في الحضور والواجبات.'
                      : 'Everyone is keeping up with attendance and homework.'
                  }
                />
              </div>
            ) : (
              <RowList>
                {(atRisk.data ?? []).map((student) => (
                  <AtRiskRow key={student.studentId} student={student} />
                ))}
              </RowList>
            )}
          </Panel>
        </div>

        {/* ------------------------------ Aside ----------------------------- */}
        <div className="space-y-6">
          <Panel
            title={t('dashboard.upcomingClasses')}
            action={<PanelLink to="/teacher/schedule">{t('nav.schedule')}</PanelLink>}
            flush
            bodyClassName="py-1.5"
          >
            {dashboard.isPending ? (
              <div className="p-5">
                <RowSkeleton count={3} />
              </div>
            ) : (data?.upcomingClasses ?? []).length === 0 ? (
              <div className="p-5">
                <EmptyState
                  spot="calendar"
                  compact
                  title={t('dashboard.noUpcomingClasses')}
                  action={{ label: t('nav.schedule'), href: '/teacher/schedule' }}
                />
              </div>
            ) : (
              <Agenda slots={data!.upcomingClasses!.slice(0, 5)} showTeacher={false} />
            )}
          </Panel>

          <Panel
            title={ar ? 'المجموعات حسب الإشغال' : 'Groups by seats filled'}
            action={<PanelLink to="/teacher/groups">{t('common.viewAll')}</PanelLink>}
            flush
          >
            {dashboard.isPending ? (
              <div className="p-5">
                <RowSkeleton count={3} />
              </div>
            ) : (data?.topGroups ?? []).length === 0 ? (
              <div className="p-5">
                <EmptyState
                  spot="groups"
                  compact
                  title={ar ? 'لسه مفيش مجموعات' : 'No groups yet'}
                  action={{ label: t('common.create'), href: '/teacher/groups' }}
                />
              </div>
            ) : (
              <RowList>
                {data!.topGroups!.slice(0, 4).map((group) => (
                  <div key={group.groupId} className="px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link
                        to="/teacher/groups"
                        className="min-w-0 truncate text-body-sm font-semibold text-foreground hover:text-accent-strong"
                      >
                        {group.name}
                      </Link>
                      <span className="tnum shrink-0 text-caption text-muted-foreground">
                        {formatCurrency(group.monthlyRevenue ?? 0)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Meter value={group.fillRatePercentage ?? 0} tone="ink" className="flex-1" />
                      <span className="tnum shrink-0 text-[0.6875rem] font-medium text-muted-foreground">
                        {formatNumber(group.enrolledStudentsCount ?? 0)}/{formatNumber(group.capacity ?? 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </RowList>
            )}
          </Panel>

          <Panel
            title={t('dashboard.newInquiries')}
            action={
              (inquiries.data?.items ?? []).length > 0 ? (
                <Badge variant="accent" size="sm" className="tnum">
                  {formatNumber(inquiries.data?.totalCount ?? inquiries.data!.items.length)}
                </Badge>
              ) : undefined
            }
            flush
          >
            {inquiries.isPending ? (
              <div className="p-5">
                <RowSkeleton count={2} />
              </div>
            ) : (inquiries.data?.items ?? []).length === 0 ? (
              <p className="px-5 py-6 text-center text-caption text-muted-foreground">
                {ar ? 'مفيش طلبات جديدة.' : 'No new inquiries.'}
              </p>
            ) : (
              <RowList>
                {inquiries.data!.items.map((inquiry) => (
                  <div key={inquiry.id} className="flex items-start gap-3 px-5 py-3.5">
                    <IconMark tone="student">
                      <UserPlus />
                    </IconMark>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-body-sm font-semibold text-foreground">{inquiry.name}</p>
                        {inquiry.createdAt && (
                          <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
                            {formatTimeAgo(inquiry.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-2-rtl text-caption text-muted-foreground">{inquiry.message}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {inquiry.phoneNumber && (
                          <a
                            href={inquiry.whatsAppLink ?? `tel:${inquiry.phoneNumber}`}
                            target={inquiry.whatsAppLink ? '_blank' : undefined}
                            rel="noopener noreferrer"
                            dir="ltr"
                            className="tnum font-latin text-caption font-semibold text-primary underline-offset-4 hover:underline"
                          >
                            {inquiry.phoneNumber}
                          </a>
                        )}
                        <InquiryStatusMenu inquiry={inquiry} />
                      </div>
                    </div>
                  </div>
                ))}
              </RowList>
            )}
          </Panel>

          <Panel title={t('dashboard.quickActions')} flush>
            <RowList>
              {[
                { href: '/teacher/attendance', icon: ClipboardCheck, label: t('dashboard.attendance') },
                { href: '/teacher/homework', icon: BookOpen, label: t('dashboard.homework') },
                { href: '/teacher/exams', icon: FileText, label: t('dashboard.exams') },
                { href: '/teacher/messages', icon: MessageSquare, label: t('nav.messages') },
              ].map((action) => (
                <ListRow
                  key={action.href}
                  to={action.href}
                  className="py-3"
                  leading={
                    <IconMark>
                      <action.icon />
                    </IconMark>
                  }
                  title={action.label}
                />
              ))}
            </RowList>
          </Panel>
        </div>
      </div>
    </>
  )
}

function AtRiskRow({ student }: { student: AtRiskStudentDto }) {
  const { t, locale } = useI18n()
  const high = student.riskLevel === 'High'

  return (
    <div className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] md:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar
          traits={avatarTraitsFor(student.studentId ?? '')}
          seed={student.studentId ?? ''}
          name={student.studentName ?? ''}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-body-sm font-semibold text-foreground">{student.studentName}</p>
            <Badge variant={high ? 'destructive' : 'warning'} size="sm">
              {student.riskLevelName ?? student.riskLevel}
            </Badge>
          </div>
          <ul className="mt-1 space-y-0.5">
            {(student.reasons ?? []).slice(0, 2).map((reason) => (
              <li key={reason.code} className="flex items-start gap-1.5 text-caption text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden />
                {locale === 'ar-EG' ? reason.messageAr : reason.messageEn}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Meter label={t('dashboard.attendance')} value={student.attendanceRate ?? 0} showValue />
        <Meter label={t('dashboard.homework')} value={student.homeworkCompletionRate ?? 0} showValue />
        <Meter label={t('dashboard.grades')} value={student.averageExamPercentage ?? 0} showValue />
      </div>
    </div>
  )
}

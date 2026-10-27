import { Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MapPin,
  Monitor,
  Video,
  Wallet,
} from 'lucide-react'
import { studentApi } from '@/api/endpoints/student'
import type { ScheduleSlotDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { usePageTitle } from '@/hooks/use-page-title'
import { useAuth } from '@/hooks/use-auth'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { subjectKeyFor } from '@/lib/identity'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import {
  DateTile,
  IconMark,
  ListRow,
  Meter,
  MetricStrip,
  Panel,
  PanelLink,
  RowList,
} from '@/components/dashboard/kit'
import { Agenda } from '@/components/dashboard/Agenda'
import { useSlotView } from '@/components/schedule/SlotCard'
import { StatSkeleton, RowSkeleton } from '@/components/ui/skeleton'
import { QueryError } from '@/components/common/QueryBoundary'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SubjectTile } from '@/components/illustrations/SubjectIcon'

/**
 * Student console — a "today" view. The first thing a student sees is the
 * next class and what is due before it; counters and history come after. The
 * same homework, grades and attendance feed the parent's console, so what a
 * student closes here is what their parent sees resolved there.
 */
export default function StudentDashboardPage() {
  const { t, locale, formatNumber, formatCurrency, formatTimeAgo } = useI18n()
  const { user } = useAuth()
  const ar = locale === 'ar-EG'
  usePageTitle(t('dashboard.overview'))

  const dashboard = useQuery({
    queryKey: qk.student.dashboard,
    queryFn: studentApi.dashboard,
  })

  const [progress, activity, homework, exams] = useQueries({
    queries: [
      { queryKey: qk.student.progress, queryFn: studentApi.progress },
      { queryKey: qk.student.activity, queryFn: () => studentApi.recentActivity(8) },
      {
        queryKey: qk.student.homework({ PageSize: 5, Status: 'Pending' }),
        queryFn: () => studentApi.homework({ PageSize: 5 }),
      },
      {
        queryKey: qk.student.exams({ PageSize: 4, Upcoming: true }),
        queryFn: () => studentApi.exams({ PageSize: 4, Upcoming: true }),
      },
    ],
  })

  const data = dashboard.data
  const firstName = user?.firstName || user?.displayName || ''
  const loc = ar ? 'ar-EG' : 'en-GB'
  const today = new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(),
  )
  const upcoming = data?.upcomingClasses ?? []
  const nextClass = upcoming[0]

  /* One "due" list: homework and exams together, soonest first. */
  const due = [
    ...(homework.data?.items ?? []).map((h) => ({
      kind: 'homework' as const,
      id: h.id ?? '',
      title: h.title ?? '',
      context: h.groupName ?? '',
      at: h.dueAt ? new Date(h.dueAt) : null,
      href: `/student/homework/${h.id}`,
    })),
    ...(exams.data?.items ?? []).map((e) => ({
      kind: 'exam' as const,
      id: e.id ?? '',
      title: e.title ?? '',
      context: (ar ? e.subjectNameAr : e.subjectNameEn) ?? e.subjectNameAr ?? '',
      at: e.examDate ? new Date(e.examDate) : null,
      href: `/student/exams/${e.id}`,
    })),
  ]
    .sort((a, b) => (a.at?.getTime() ?? Infinity) - (b.at?.getTime() ?? Infinity))
    .slice(0, 5)
  const dueLoading = homework.isPending || exams.isPending

  return (
    <>
      <DashboardHeader
        eyebrow={today}
        title={t('dashboard.welcome', { name: firstName })}
        description={ar ? 'ده اللي جاي عليك — ابدأ من فوق.' : "Here's what's ahead — start from the top."}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/student/schedule">
                <CalendarDays />
                {t('nav.schedule')}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/courses">
                <BookOpen />
                {ar ? 'تصفّح الكورسات' : 'Browse courses'}
              </Link>
            </Button>
          </>
        }
      />

      {/* ------------------------- Next up + due soon ------------------------ */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <NextClass slot={nextClass} loading={dashboard.isPending} />

        <Panel
          title={ar ? 'مطلوب منك قريب' : 'Due soon'}
          description={ar ? 'واجبات وامتحانات بالترتيب' : 'Homework and exams, soonest first'}
          action={<PanelLink to="/student/homework">{t('common.viewAll')}</PanelLink>}
          flush
        >
          {dueLoading ? (
            <div className="p-5">
              <RowSkeleton count={3} />
            </div>
          ) : due.length === 0 ? (
            <div className="p-5">
              <EmptyState
                spot="homework"
                compact
                className="border-0"
                title={ar ? 'مفيش حاجة مستحقة' : 'Nothing due'}
                description={ar ? 'كل حاجة متسلّمة. شغل حلو!' : 'All caught up. Nice work!'}
              />
            </div>
          ) : (
            <RowList>
              {due.map((item) => (
                <ListRow
                  key={`${item.kind}-${item.id}`}
                  to={item.href}
                  leading={item.at ? <DateTile date={item.at} /> : <IconMark><FileText /></IconMark>}
                  title={item.title}
                  meta={
                    <span className="flex items-center gap-1.5">
                      {item.kind === 'exam' ? (
                        <FileText className="size-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ClipboardCheck className="size-3.5 shrink-0" aria-hidden />
                      )}
                      <span className="truncate">
                        {item.kind === 'exam' ? t('dashboard.exams') : t('dashboard.homework')}
                        {item.context ? ` · ${item.context}` : ''}
                      </span>
                    </span>
                  }
                  trailing={<DueLabel at={item.at} />}
                />
              ))}
            </RowList>
          )}
        </Panel>
      </div>

      {/* ------------------------------ Figures ------------------------------ */}
      <div className="mt-6">
        {dashboard.isPending ? (
          <StatSkeleton count={4} />
        ) : dashboard.isError ? (
          <QueryError error={dashboard.error} onRetry={() => dashboard.refetch()} />
        ) : (
          <MetricStrip
            items={[
              {
                label: t('dashboard.progress'),
                value: `${Math.round(data?.averageCourseProgress ?? 0)}%`,
                meter: data?.averageCourseProgress ?? 0,
                hint: ar ? 'متوسط تقدّمك في الكورسات' : 'Average across your courses',
              },
              {
                label: t('dashboard.myCourses'),
                value: formatNumber(data?.activeCoursesCount ?? 0),
                hint: ar
                  ? `${formatNumber(data?.completedCoursesCount ?? 0)} مكتمل`
                  : `${formatNumber(data?.completedCoursesCount ?? 0)} completed`,
                href: '/student/courses',
              },
              {
                label: t('dashboard.myGroups'),
                value: formatNumber(data?.activeGroupsCount ?? 0),
                hint: ar ? 'مجموعات نشطة' : 'Active groups',
                href: '/student/schedule',
              },
              {
                label: t('dashboard.payments'),
                value: formatCurrency(data?.totalSpent ?? 0),
                hint: ar ? 'إجمالي المدفوع' : 'Paid to date',
                href: '/student/payments',
              },
            ]}
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="space-y-6">
          {/* --------------------- Continue learning --------------------- */}
          <Panel
            title={t('dashboard.continueLearning')}
            action={<PanelLink to="/student/courses">{t('common.viewAll')}</PanelLink>}
            flush
          >
            {progress.isPending ? (
              <div className="p-5">
                <RowSkeleton count={3} />
              </div>
            ) : progress.isError ? (
              <div className="p-5">
                <QueryError error={progress.error} onRetry={() => progress.refetch()} compact />
              </div>
            ) : (progress.data ?? []).length === 0 ? (
              <div className="p-5">
                <EmptyState
                  spot="courses"
                  compact
                  title={ar ? 'لسه مبدأتش أي كورس' : 'No courses started yet'}
                  description={
                    ar ? 'اشترك في كورس وابدأ تتعلّم من أي مكان.' : 'Enroll in a course and start learning anywhere.'
                  }
                  action={{ label: t('nav.courses'), href: '/courses' }}
                />
              </div>
            ) : (
              <RowList>
                {(progress.data ?? []).slice(0, 4).map((course) => {
                  const pct = Math.round(course.progressPercentage ?? 0)
                  const done = Math.round((pct / 100) * (course.lessonsCount ?? 0))
                  return (
                    <Link
                      key={course.courseId}
                      to={`/student/courses/${course.courseId}`}
                      className="group grid gap-3 px-5 py-4 transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-center"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-body-sm font-semibold text-foreground group-hover:text-accent-strong">
                          {course.courseTitle}
                        </span>
                        <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                          {[
                            course.teacher?.displayName,
                            t('courses.progressLabel', {
                              done: formatNumber(done),
                              total: formatNumber(course.lessonsCount ?? 0),
                            }),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <Meter value={pct} tone="accent" size="md" className="flex-1" />
                        <span className="tnum w-9 shrink-0 text-end text-caption font-semibold text-foreground">
                          {pct}%
                        </span>
                      </span>
                    </Link>
                  )
                })}
              </RowList>
            )}
          </Panel>

          {/* ------------------------ Active groups ------------------------ */}
          {(data?.activeGroups?.length ?? 0) > 0 && (
            <Panel title={t('dashboard.myGroups')} flush>
              <RowList>
                {data!.activeGroups!.slice(0, 4).map((group) => (
                  <ListRow
                    key={group.id}
                    to={`/groups/${group.id}`}
                    leading={
                      <SubjectTile
                        subject={subjectKeyFor({ nameAr: group.subject?.nameAr, nameEn: group.subject?.nameEn })}
                        size="sm"
                      />
                    }
                    title={group.name}
                    meta={[group.teacher?.displayName, group.teachingModeName].filter(Boolean).join(' · ')}
                    trailing={
                      group.schedules?.length ? (
                        <span className="hidden text-caption text-muted-foreground sm:inline">
                          {group.schedules.map((s) => s.dayName).filter(Boolean).join('، ')}
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </RowList>
            </Panel>
          )}
        </div>

        {/* ------------------------------ Aside ------------------------------ */}
        <div className="space-y-6">
          <Panel
            title={t('dashboard.upcomingClasses')}
            action={<PanelLink to="/student/calendar">{ar ? 'التقويم' : 'Calendar'}</PanelLink>}
            flush
            bodyClassName="py-1.5"
          >
            {dashboard.isPending ? (
              <div className="p-5">
                <RowSkeleton count={3} />
              </div>
            ) : upcoming.length <= 1 ? (
              <p className="px-5 py-6 text-center text-caption text-muted-foreground">
                {upcoming.length === 0
                  ? t('dashboard.noUpcomingClasses')
                  : ar
                    ? 'مفيش حصص تانية الأسبوع ده.'
                    : 'No other classes this week.'}
              </p>
            ) : (
              <Agenda slots={upcoming.slice(1, 6)} />
            )}
          </Panel>

          <Panel title={t('dashboard.recentActivity')} flush>
            {activity.isPending ? (
              <div className="p-5">
                <RowSkeleton count={3} />
              </div>
            ) : (activity.data ?? []).length === 0 ? (
              <p className="px-5 py-6 text-center text-caption text-muted-foreground">
                {ar ? 'لسه مفيش نشاط.' : 'No activity yet.'}
              </p>
            ) : (
              <ol className="px-5 py-2">
                {(activity.data ?? []).slice(0, 6).map((item, i, all) => (
                  <li key={`${item.referenceId ?? item.title}-${i}`} className="relative flex gap-3 py-2.5">
                    <span className="relative flex w-2.5 shrink-0 justify-center" aria-hidden>
                      <span className="mt-1.5 size-2 rounded-full bg-role-student" />
                      {i < all.length - 1 && <span className="absolute bottom-[-0.75rem] top-4 w-px bg-border" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-body-sm font-medium text-foreground">{item.title}</span>
                      <span className="block text-caption text-muted-foreground">
                        {[item.description, item.occurredAt ? formatTimeAgo(item.occurredAt) : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title={ar ? 'سجلّك' : 'Your record'} flush>
            <RowList>
              {[
                { href: '/student/grades', icon: GraduationCap, label: t('dashboard.grades') },
                { href: '/student/attendance', icon: CalendarCheck, label: t('dashboard.attendance') },
                { href: '/student/certificates', icon: Award, label: t('dashboard.certificates') },
                { href: '/student/payments', icon: Wallet, label: t('dashboard.payments') },
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

/** "Today", "in 3 days", or "overdue" — the one word that sets priority. */
function DueLabel({ at }: { at: Date | null }) {
  const { locale } = useI18n()
  if (!at) return null
  const ar = locale === 'ar-EG'
  const days = Math.ceil((at.getTime() - Date.now()) / 86_400_000)
  const label =
    days < 0
      ? ar
        ? 'متأخر'
        : 'Overdue'
      : days === 0
        ? ar
          ? 'النهارده'
          : 'Today'
        : days === 1
          ? ar
            ? 'بكرة'
            : 'Tomorrow'
          : ar
            ? `بعد ${days} أيام`
            : `In ${days} days`
  return (
    <Badge variant={days < 0 ? 'destructive' : days <= 1 ? 'accent' : 'default'} size="sm" className="tnum">
      {label}
    </Badge>
  )
}

/** The hero of the student console: the very next class, in full. */
function NextClass({ slot, loading }: { slot?: ScheduleSlotDto; loading: boolean }) {
  const { locale, formatTime, isRtl } = useI18n()
  const ar = locale === 'ar-EG'
  const Arrow = isRtl ? ArrowLeft : ArrowRight

  if (loading) return <div className="h-full min-h-[14rem] animate-pulse rounded-lg bg-muted" />

  if (!slot)
    return (
      <div className="flex min-h-[14rem] flex-col justify-between rounded-lg bg-spotlight p-6 text-spotlight-foreground">
        <p className="data-label text-spotlight-foreground/60">{ar ? 'الحصة الجاية' : 'Next class'}</p>
        <div>
          <p className="font-display text-heading-lg">{ar ? 'مفيش حصص في جدولك' : 'Your timetable is empty'}</p>
          <p className="mt-1.5 text-body-sm text-spotlight-foreground/70">
            {ar ? 'اشترك في مجموعة وحصصها هتظهر هنا تلقائي.' : 'Join a group and its classes appear here.'}
          </p>
        </div>
        <Link
          to="/groups"
          className="inline-flex items-center gap-1.5 self-start text-body-sm font-semibold text-spotlight-foreground underline-offset-4 hover:underline"
        >
          {ar ? 'تصفّح المجموعات' : 'Browse groups'}
          <Arrow className="size-4" />
        </Link>
      </div>
    )

  return <NextClassCard slot={slot} ar={ar} formatTime={formatTime} />
}

function NextClassCard({
  slot,
  ar,
  formatTime,
}: {
  slot: ScheduleSlotDto
  ar: boolean
  formatTime: (v: string) => string
}) {
  const view = useSlotView(slot)
  return (
    <section
      aria-label={ar ? 'الحصة الجاية' : 'Next class'}
      className="relative flex min-h-[14rem] flex-col overflow-hidden rounded-lg bg-spotlight p-6 text-spotlight-foreground"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-caption font-semibold text-spotlight-foreground/70">
          <span className={cn('size-2 rounded-full bg-accent', view.isLive && 'animate-pulse')} />
          {view.isLive ? (ar ? 'شغّالة دلوقتي' : 'Live now') : ar ? 'الحصة الجاية' : 'Next class'}
        </p>
        {view.nextLabel && (
          <span className="text-caption font-medium text-spotlight-foreground/70">{view.nextLabel}</span>
        )}
      </div>

      <div className="mt-auto pt-8">
        <p className="tnum font-display text-[clamp(2.25rem,4vw,3rem)] font-semibold leading-none">
          {slot.startTime ? formatTime(slot.startTime) : '—'}
          {slot.endTime && (
            <span className="ms-2 text-body font-normal text-spotlight-foreground/55">
              — {formatTime(slot.endTime)}
            </span>
          )}
        </p>
        <p className="mt-3 truncate font-display text-heading-md">{slot.groupName}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-spotlight-foreground/70">
          {slot.teacherName && <span>{slot.teacherName}</span>}
          {(slot.location || view.isOnline) && (
            <span className="inline-flex items-center gap-1.5">
              {view.isOnline ? <Monitor className="size-3.5" /> : <MapPin className="size-3.5" />}
              {slot.location || (ar ? 'أونلاين' : 'Online')}
            </span>
          )}
        </p>
      </div>

      {slot.meetingUrl && (
        <Button asChild variant="secondary" size="sm" className="mt-5 self-start">
          <a href={slot.meetingUrl} target="_blank" rel="noopener noreferrer">
            <Video />
            {ar ? 'ادخل الحصة' : 'Join class'}
          </a>
        </Button>
      )}
    </section>
  )
}

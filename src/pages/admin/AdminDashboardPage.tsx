import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Building2, GraduationCap, ShieldAlert, Star } from 'lucide-react'
import { adminApi } from '@/api/endpoints/admin'
import { platformApi } from '@/api/endpoints/platform'
import { qk } from '@/lib/query-client'
import { usePageTitle } from '@/hooks/use-page-title'
import { useI18n } from '@/i18n'
import { avatarTraitsFor, imageUrl } from '@/lib/identity'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { StatSkeleton, RowSkeleton } from '@/components/ui/skeleton'
import { QueryError } from '@/components/common/QueryBoundary'
import { EmptyState } from '@/components/common/states'
import { RevenueAreaChart } from '@/components/dashboard/charts'
import { FilterChip } from '@/components/common/controls'
import { Avatar } from '@/components/illustrations/PersonAvatar'
import { Rating } from '@/components/common/Rating'
import { IconMark, ListRow, MetricStrip, Panel, PanelLink, RowList } from '@/components/dashboard/kit'

const RANGES = [3, 6, 12] as const

export default function AdminDashboardPage() {
  const { t, locale, formatNumber, formatCurrency } = useI18n()
  usePageTitle(t('admin.platformOverview'))

  const [months, setMonths] = React.useState<number>(6)

  const dashboard = useQuery({
    queryKey: qk.admin.dashboard(months),
    queryFn: () => adminApi.dashboard(months),
  })

  const overview = useQuery({
    queryKey: qk.platform.overview,
    queryFn: platformApi.overview,
  })

  const data = dashboard.data
  const revenueSeries = (data?.revenueTrend ?? []).map((p) => ({
    label: p.label ?? '',
    value: p.totalRevenue ?? 0,
    secondary: p.courseRevenue ?? 0,
  }))
  const hasRevenue = revenueSeries.some((p) => p.value > 0)

  return (
    <>
      <DashboardHeader
        title={t('admin.platformOverview')}
        description={
          locale === 'ar-EG'
            ? 'حالة المنصة كلها: المستخدمين، المحتوى، والإيرادات.'
            : 'The whole platform at a glance: users, content, and revenue.'
        }
        actions={
          <div className="flex gap-2">
            {RANGES.map((value) => (
              <FilterChip
                key={value}
                label={
                  locale === 'ar-EG' ? `${formatNumber(value)} شهور` : `${formatNumber(value)} months`
                }
                active={months === value}
                onClick={() => setMonths(value)}
              />
            ))}
          </div>
        }
      />

      {dashboard.isPending ? (
        <StatSkeleton count={4} />
      ) : dashboard.isError ? (
        <QueryError error={dashboard.error} onRetry={() => dashboard.refetch()} />
      ) : (
        <div className="space-y-3">
          <MetricStrip
            items={[
              {
                label: t('admin.users'),
                value: formatNumber(data?.totalUsers ?? 0),
                hint: `${formatNumber(data?.totalStudents ?? 0)} ${t('common.students')}`,
              },
              {
                label: t('common.teachers'),
                value: formatNumber(data?.totalTeachers ?? 0),
                hint: `${formatNumber(data?.verifiedTeachers ?? 0)} ${locale === 'ar-EG' ? 'موثّق' : 'verified'}`,
                href: '/admin/teachers',
              },
              {
                label: t('dashboard.revenue'),
                value: formatCurrency(data?.platformRevenue ?? 0),
                hint: locale === 'ar-EG' ? `آخر ${formatNumber(months)} شهور` : `Last ${formatNumber(months)} months`,
              },
              {
                label: locale === 'ar-EG' ? 'طلبات توثيق' : 'Pending verifications',
                value: formatNumber(data?.pendingVerifications ?? 0),
                tone: (data?.pendingVerifications ?? 0) > 0 ? 'accent' : 'default',
                href: '/admin/teachers',
              },
            ]}
          />
          <MetricStrip
            items={[
              {
                label: t('common.groups'),
                value: formatNumber(data?.totalGroups ?? 0),
                hint: `${formatNumber(data?.publishedGroups ?? 0)} ${t('common.published')}`,
                href: '/admin/groups',
              },
              {
                label: t('common.courses'),
                value: formatNumber(data?.totalCourses ?? 0),
                hint: `${formatNumber(data?.publishedCourses ?? 0)} ${t('common.published')}`,
                href: '/admin/courses',
              },
              {
                label: locale === 'ar-EG' ? 'الاشتراكات' : 'Enrollments',
                value: formatNumber((data?.totalGroupEnrollments ?? 0) + (data?.totalCourseEnrollments ?? 0)),
                href: '/admin/enrollments',
              },
              {
                label: t('common.reviews'),
                value: formatNumber(data?.totalReviews ?? 0),
                hint:
                  (data?.pendingReviews ?? 0) > 0
                    ? `${formatNumber(data!.pendingReviews!)} ${locale === 'ar-EG' ? 'تحت المراجعة' : 'pending'}`
                    : undefined,
                tone: (data?.pendingReviews ?? 0) > 0 ? 'accent' : 'default',
                href: '/admin/reviews',
              },
            ]}
          />
        </div>
      )}

      {/* Schools, accounts and SaaS subscriptions — GET /platform/overview. */}
      <div className="mt-3">
        {overview.isPending ? (
          <StatSkeleton count={4} />
        ) : overview.isError ? (
          <QueryError error={overview.error} onRetry={() => overview.refetch()} compact />
        ) : (
          <MetricStrip
            items={[
              {
                label: locale === 'ar-EG' ? 'المدارس' : 'Schools',
                value: formatNumber(overview.data?.totalSchools ?? 0),
                hint:
                  locale === 'ar-EG'
                    ? `${formatNumber(overview.data?.activeSchools ?? 0)} نشطة · ${formatNumber(overview.data?.newSchoolsLast30Days ?? 0)} جديدة في ٣٠ يوم`
                    : `${formatNumber(overview.data?.activeSchools ?? 0)} active · ${formatNumber(overview.data?.newSchoolsLast30Days ?? 0)} new in 30 days`,
                href: '/admin/tenants',
              },
              {
                label: locale === 'ar-EG' ? 'اشتراكات نشطة' : 'Active subscriptions',
                value: formatNumber(overview.data?.activeSubscriptions ?? 0),
                hint:
                  locale === 'ar-EG'
                    ? `${formatNumber(overview.data?.trialSubscriptions ?? 0)} تجريبي`
                    : `${formatNumber(overview.data?.trialSubscriptions ?? 0)} on trial`,
              },
              {
                label: locale === 'ar-EG' ? 'اشتراكات في خطر' : 'At-risk subscriptions',
                value: formatNumber(overview.data?.atRiskSubscriptions ?? 0),
                tone: (overview.data?.atRiskSubscriptions ?? 0) > 0 ? 'warn' : 'default',
              },
              {
                label: locale === 'ar-EG' ? 'حسابات موقوفة' : 'Suspended accounts',
                value: formatNumber(overview.data?.suspendedUsers ?? 0),
                hint:
                  locale === 'ar-EG'
                    ? `${formatNumber(overview.data?.platformAdministrators ?? 0)} أدمن للمنصة`
                    : `${formatNumber(overview.data?.platformAdministrators ?? 0)} platform admins`,
                href: '/admin/users',
              },
            ]}
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22.5rem]">
        <Panel title={t('dashboard.revenue')}>
          {dashboard.isPending ? (
            <div className="h-[260px] animate-pulse rounded-md bg-muted" />
          ) : !hasRevenue ? (
            <EmptyState
              spot="payments"
              compact
              className="border-0"
              title={locale === 'ar-EG' ? 'لسه مفيش إيرادات' : 'No revenue yet'}
            />
          ) : (
            <RevenueAreaChart data={revenueSeries} />
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            title={locale === 'ar-EG' ? 'آخر المدرّسين' : 'Newest teachers'}
            action={<PanelLink to="/admin/teachers">{t('common.viewAll')}</PanelLink>}
            flush
          >
            {dashboard.isPending ? (
              <div className="p-5">
                <RowSkeleton count={4} />
              </div>
            ) : (data?.recentTeachers ?? []).length === 0 ? (
              <p className="px-5 py-6 text-center text-caption text-muted-foreground">
                {locale === 'ar-EG' ? 'مفيش مدرّسين جدد.' : 'No new teachers.'}
              </p>
            ) : (
              <RowList>
                {data!.recentTeachers!.map((teacher) => (
                  <ListRow
                    key={teacher.id}
                    to={`/admin/teachers?search=${encodeURIComponent(teacher.displayName ?? '')}`}
                    leading={
                      <Avatar
                        traits={avatarTraitsFor(teacher.id ?? '')}
                        seed={teacher.id ?? ''}
                        name={teacher.displayName ?? ''}
                        src={imageUrl(teacher.profileImageUrl)}
                        size="sm"
                      />
                    }
                    title={
                      <span className="flex items-center gap-1.5">
                        <span className="truncate">{teacher.displayName}</span>
                        {teacher.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-role-student" />}
                      </span>
                    }
                    meta={teacher.headline}
                    trailing={<Rating value={teacher.rating ?? 0} size="sm" />}
                  />
                ))}
              </RowList>
            )}
          </Panel>

          <Panel title={t('dashboard.quickActions')} flush>
            <RowList>
              {[
                { href: '/admin/tenants', icon: Building2, label: t('admin.tenants') },
                { href: '/admin/teachers', icon: GraduationCap, label: t('common.teachers') },
                { href: '/admin/reviews', icon: Star, label: t('admin.moderation') },
                { href: '/admin/audit-logs', icon: ShieldAlert, label: t('admin.auditLogs') },
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

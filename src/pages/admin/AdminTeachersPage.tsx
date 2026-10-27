import * as React from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Eye, MoreVertical, Pause, Play, ShieldCheck, Sparkles, XCircle, SearchCheck } from 'lucide-react'
import { adminApi, type AdminTeacherQuery } from '@/api/endpoints/admin'
import type { TeacherListItemDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { usePageTitle } from '@/hooks/use-page-title'
import { useDebounced } from '@/hooks/use-ui'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/i18n'
import { avatarTraitsFor, imageUrl } from '@/lib/identity'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DataTable, type Column } from '@/components/dashboard/DataTable'
import { FilterChip, SearchBar } from '@/components/common/controls'
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Rating } from '@/components/common/Rating'
import { Avatar } from '@/components/illustrations/PersonAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useApiErrorToast } from '@/hooks/use-api-toast'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { QueryError } from '@/components/common/QueryBoundary'
import { RowSkeleton } from '@/components/ui/skeleton'

const PAGE_SIZE = 20

const VERIFICATION = [
  { value: undefined, ar: 'الكل', en: 'All' },
  { value: 'Pending', ar: 'مستني', en: 'Pending' },
  /* The API's review step (Pending → UnderReview → Verified/Rejected). */
  { value: 'UnderReview', ar: 'تحت المراجعة', en: 'Under review' },
  { value: 'Verified', ar: 'موثّق', en: 'Verified' },
  { value: 'Rejected', ar: 'مرفوض', en: 'Rejected' },
] as const

export default function AdminTeachersPage() {
  const { t, locale, formatNumber } = useI18n()
  const lang: 'ar' | 'en' = locale === 'ar-EG' ? 'ar' : 'en'
  usePageTitle(t('common.teachers'))

  const { toast } = useToast()
  const showApiError = useApiErrorToast()
  const queryClient = useQueryClient()

  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [verification, setVerification] = React.useState<string>()
  const [suspending, setSuspending] = React.useState<TeacherListItemDto | null>(null)
  const [viewing, setViewing] = React.useState<string | null>(null)
  const debounced = useDebounced(search, 300)

  const query: AdminTeacherQuery = React.useMemo(
    () => ({
      Page: page,
      PageSize: PAGE_SIZE,
      Search: debounced.trim() || undefined,
      VerificationStatus: verification,
    }),
    [page, debounced, verification],
  )

  const teachers = useQuery({
    queryKey: qk.admin.teachers(query),
    queryFn: () => adminApi.teachers(query),
    placeholderData: keepPreviousData,
  })

  React.useEffect(() => setPage(1), [debounced, verification])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin'] })

  const onError = (error: unknown) =>
    showApiError(error)

  const verify = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      adminApi.verifyTeacher(id, approve),
    onSuccess: () => {
      invalidate()
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError,
  })

  const beginReview = useMutation({
    mutationFn: (id: string) => adminApi.beginTeacherReview(id),
    onSuccess: () => {
      invalidate()
      toast({ title: locale === 'ar-EG' ? 'اتنقل للمراجعة' : 'Moved into review', variant: 'success' })
    },
    onError,
  })

  const feature = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      adminApi.featureTeacher(id, featured),
    onSuccess: () => {
      invalidate()
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError,
  })

  const activate = useMutation({
    mutationFn: (id: string) => adminApi.activateTeacher(id),
    onSuccess: () => {
      invalidate()
      toast({ title: t('common.active'), variant: 'success' })
    },
    onError,
  })

  const suspend = useMutation({
    mutationFn: (id: string) =>
      adminApi.suspendTeacher(
        id,
        locale === 'ar-EG' ? 'إيقاف إداري' : 'Suspended by platform admin',
      ),
    onSuccess: () => {
      invalidate()
      setSuspending(null)
      toast({ title: t('common.inactive'), variant: 'success' })
    },
    onError,
  })

  const columns: Column<TeacherListItemDto>[] = [
    {
      id: 'teacher',
      header: t('common.teacher'),
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            traits={avatarTraitsFor(row.id ?? '')}
            seed={row.id ?? ''}
            name={row.displayName ?? ''}
            src={imageUrl(row.profileImageUrl)}
            size="sm"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-display text-body-sm font-semibold text-foreground">
              {row.displayName}
              {row.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" />}
            </p>
            <p className="truncate text-caption text-muted-foreground">{row.headline}</p>
          </div>
        </div>
      ),
      sortValue: (row) => row.displayName ?? '',
    },
    {
      id: 'subjects',
      header: t('common.subject'),
      hideOnMobile: true,
      cell: (row) => (
        <span className="truncate text-caption text-muted-foreground">
          {(row.subjects ?? [])
            .map((s) => (locale === 'ar-EG' ? s.nameAr : s.nameEn))
            .filter(Boolean)
            .join('، ')}
        </span>
      ),
    },
    {
      id: 'scale',
      header: locale === 'ar-EG' ? 'الحجم' : 'Scale',
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-caption text-muted-foreground">
          {formatNumber(row.studentsCount ?? 0)} {t('common.students')} ·{' '}
          {formatNumber(row.groupsCount ?? 0)} {t('common.groups')}
        </span>
      ),
      sortValue: (row) => row.studentsCount ?? 0,
    },
    {
      id: 'rating',
      header: t('common.rating'),
      cell: (row) => <Rating value={row.rating ?? 0} count={row.reviewCount} size="sm" />,
      sortValue: (row) => row.rating ?? 0,
    },
    {
      id: 'flags',
      header: t('common.status'),
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={row.isVerified ? 'success' : 'outline'} size="sm">
            {row.isVerified
              ? locale === 'ar-EG'
                ? 'موثّق'
                : 'Verified'
              : locale === 'ar-EG'
                ? 'غير موثّق'
                : 'Unverified'}
          </Badge>
          {row.isFeatured && (
            <Badge variant="featured" size="sm">
              <Sparkles className="size-3" />
              {locale === 'ar-EG' ? 'مميّز' : 'Featured'}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t('common.actions')}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => row.id && setViewing(row.id)}>
              <Eye className="size-4" />
              {locale === 'ar-EG' ? 'عرض الملف' : 'View profile'}
            </DropdownMenuItem>
            {/* rows carry no status, but under the Pending filter every row is pending */}
            {verification === 'Pending' && (
              <DropdownMenuItem onSelect={() => row.id && beginReview.mutate(row.id)}>
                <SearchCheck className="size-4" />
                {locale === 'ar-EG' ? 'ابدأ المراجعة' : 'Begin review'}
              </DropdownMenuItem>
            )}
            {!row.isVerified && (
              <DropdownMenuItem
                onSelect={() => row.id && verify.mutate({ id: row.id, approve: true })}
              >
                <ShieldCheck className="size-4" />
                {t('admin.verify')}
              </DropdownMenuItem>
            )}
            {row.isVerified && (
              <DropdownMenuItem
                onSelect={() => row.id && verify.mutate({ id: row.id, approve: false })}
              >
                <XCircle className="size-4" />
                {t('admin.reject')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => row.id && feature.mutate({ id: row.id, featured: !row.isFeatured })}
            >
              <Sparkles className="size-4" />
              {row.isFeatured ? t('admin.unfeature') : t('admin.feature')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => row.id && activate.mutate(row.id)}>
              <Play className="size-4 flip-rtl" />
              {t('admin.activate')}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive-strong" onSelect={() => setSuspending(row)}>
              <Pause className="size-4" />
              {t('admin.suspend')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <>
      <DashboardHeader
        title={t('common.teachers')}
        description={
          locale === 'ar-EG'
            ? 'وثّق المدرّسين، ميّز اللي يستاهل، وأوقف المخالف.'
            : 'Verify teachers, feature the best, and suspend rule-breakers.'
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('common.search')}
            className="sm:max-w-md"
            id="admin-teachers-search"
          />
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {VERIFICATION.map((v) => (
              <FilterChip
                key={v.value ?? 'all'}
                label={v[lang]}
                active={verification === v.value}
                onClick={() => setVerification(v.value)}
              />
            ))}
          </div>
        </div>
      </DashboardHeader>

      <DataTable
        rows={teachers.data?.items ?? []}
        columns={columns}
        rowKey={(row) => row.id ?? ''}
        loading={teachers.isPending}
        error={teachers.isError ? teachers.error : undefined}
        onRetry={() => teachers.refetch()}
        isFetching={teachers.isFetching}
        serverPage={teachers.data}
        onPageChange={setPage}
        empty={{
          spot: 'teachers',
          title: locale === 'ar-EG' ? 'مفيش مدرّسين' : 'No teachers',
        }}
        mobileCard={(row) => (
          <Card className="flex items-center gap-3 p-4">
            <Avatar
              traits={avatarTraitsFor(row.id ?? '')}
              seed={row.id ?? ''}
              name={row.displayName ?? ''}
              src={imageUrl(row.profileImageUrl)}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-body-sm font-bold text-foreground">
                {row.displayName}
              </p>
              <p className="truncate text-caption text-muted-foreground">{row.headline}</p>
            </div>
            <Badge variant={row.isVerified ? 'success' : 'outline'} size="sm">
              {row.isVerified ? 'OK' : '—'}
            </Badge>
          </Card>
        )}
      />

      <ConfirmDialog
        open={Boolean(suspending)}
        onOpenChange={(open) => !open && setSuspending(null)}
        title={locale === 'ar-EG' ? 'إيقاف المدرّس؟' : 'Suspend this teacher?'}
        description={
          locale === 'ar-EG'
            ? `هيتم إيقاف حساب ${suspending?.displayName ?? ''}.`
            : `This suspends ${suspending?.displayName ?? ''}'s account.`
        }
        confirmLabel={t('admin.suspend')}
        loading={suspend.isPending}
        onConfirm={() => suspending?.id && suspend.mutate(suspending.id)}
      />

      <TeacherProfileSheet teacherId={viewing} onClose={() => setViewing(null)} />
    </>
  )
}

/**
 * The full profile behind a row (GET /admin/teachers/{id}). Unverified teachers
 * are not public, so this is the only way to read what they submitted before
 * deciding on verification.
 */
function TeacherProfileSheet({ teacherId, onClose }: { teacherId: string | null; onClose: () => void }) {
  const { locale, pick, formatNumber } = useI18n()
  const ar = locale === 'ar-EG'

  const teacher = useQuery({
    queryKey: qk.admin.teacher(teacherId ?? ''),
    queryFn: () => adminApi.teacher(teacherId!),
    enabled: Boolean(teacherId),
  })
  const d = teacher.data

  return (
    <Sheet open={Boolean(teacherId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="end" className="flex w-full max-w-xl flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border p-5 text-start">
          <SheetTitle className="truncate">{d?.displayName ?? (ar ? 'ملف المدرّس' : 'Teacher profile')}</SheetTitle>
          <SheetDescription>{d?.headline ?? ''}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 p-5">
          {teacher.isPending ? (
            <RowSkeleton count={4} />
          ) : teacher.isError ? (
            <QueryError error={teacher.error} onRetry={() => teacher.refetch()} compact />
          ) : d ? (
            <>
              <div className="flex items-center gap-4">
                <Avatar
                  traits={avatarTraitsFor(d.id ?? '')}
                  seed={d.id ?? ''}
                  name={d.displayName ?? ''}
                  src={imageUrl(d.profileImageUrl)}
                  size="lg"
                />
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={d.isVerified ? 'success' : 'outline'} size="sm">
                    {d.verificationStatus}
                  </Badge>
                  {d.isFeatured && (
                    <Badge variant="featured" size="sm">
                      {ar ? 'مميّز' : 'Featured'}
                    </Badge>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-body-sm">
                <Fact label={ar ? 'المدينة' : 'City'} value={d.city || '—'} />
                <Fact label={ar ? 'سنين الخبرة' : 'Experience'} value={formatNumber(d.yearsOfExperience ?? 0)} />
                <Fact label={ar ? 'الطلاب' : 'Students'} value={formatNumber(d.studentsCount ?? 0)} />
                <Fact
                  label={ar ? 'المجموعات / الكورسات' : 'Groups / courses'}
                  value={`${formatNumber(d.groupsCount ?? 0)} / ${formatNumber(d.coursesCount ?? 0)}`}
                />
              </dl>

              {d.bio && <p className="whitespace-pre-line text-body-sm leading-relaxed text-foreground">{d.bio}</p>}

              {((d.subjects ?? []).length > 0 || (d.grades ?? []).length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {(d.subjects ?? []).map((s) => (
                    <Badge key={s.id} variant="primary" size="sm">
                      {pick(s.nameAr, s.nameEn)}
                    </Badge>
                  ))}
                  {(d.grades ?? []).map((g) => (
                    <Badge key={g.id} variant="outline" size="sm">
                      {pick(g.nameAr, g.nameEn)}
                    </Badge>
                  ))}
                </div>
              )}

              {(d.achievements ?? []).length > 0 && (
                <section>
                  <h3 className="mb-2 font-display text-body font-semibold text-foreground">
                    {ar ? 'الإنجازات' : 'Achievements'}
                  </h3>
                  <ul className="space-y-2">
                    {(d.achievements ?? []).map((a) => (
                      <li key={a.id} className="rounded-lg border border-border p-3 text-body-sm">
                        <p className="font-semibold text-foreground">
                          {a.title}
                          {a.year ? <span className="tnum ms-2 text-muted-foreground">{a.year}</span> : null}
                        </p>
                        {a.description && <p className="mt-1 text-muted-foreground">{a.description}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(d.socialLinks ?? []).length > 0 && (
                <ul className="space-y-1 text-body-sm">
                  {(d.socialLinks ?? []).map((l) => (
                    <li key={l.id}>
                      <a href={l.url} target="_blank" rel="noreferrer" className="font-latin text-primary hover:underline">
                        {l.platformName ?? l.platform}: {l.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="tnum mt-0.5 font-semibold text-foreground">{value}</dd>
    </div>
  )
}

import * as React from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, ShieldMinus } from 'lucide-react'
import { platformApi, type PlatformUserQuery } from '@/api/endpoints/platform'
import { isApiError } from '@/api/errors'
import type { PlatformAdministratorDto, PlatformUserDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { usePageTitle } from '@/hooks/use-page-title'
import { useDebounced } from '@/hooks/use-ui'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/i18n'
import { avatarTraitsFor, imageUrl } from '@/lib/identity'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DataTable, type Column } from '@/components/dashboard/DataTable'
import { FilterChip, SearchBar } from '@/components/common/controls'
import { FormDialog } from '@/components/common/FormDialog'
import { UserStateButton } from '@/components/admin/UserStateButton'
import { Avatar } from '@/components/illustrations/PersonAvatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'

const PAGE_SIZE = 20

const ROLE_FILTERS: { value: PlatformUserQuery['Role']; ar: string; en: string }[] = [
  { value: undefined, ar: 'الكل', en: 'All' },
  { value: 'Student', ar: 'طلاب', en: 'Students' },
  { value: 'Teacher', ar: 'مدرّسين', en: 'Teachers' },
  { value: 'Parent', ar: 'أولياء أمور', en: 'Parents' },
  { value: 'Admin', ar: 'أدمن', en: 'Admins' },
]

/**
 * Every account on the platform (GET /platform/users — the one list that is not
 * workspace-scoped) and who holds platform authority (/platform/administrators).
 */
export default function AdminUsersPage() {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  usePageTitle(ar ? 'المستخدمين' : 'Users')

  return (
    <>
      <DashboardHeader
        title={ar ? 'المستخدمين' : 'Users'}
        description={
          ar
            ? 'كل حسابات المنصة عبر كل المدارس، ومين عنده صلاحية أدمن.'
            : 'Every account across all schools, and who holds platform authority.'
        }
      />
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">{ar ? 'كل الحسابات' : 'All accounts'}</TabsTrigger>
          <TabsTrigger value="admins">{ar ? 'أدمن المنصة' : 'Platform admins'}</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>
        <TabsContent value="admins" className="mt-6">
          <AdministratorsTab />
        </TabsContent>
      </Tabs>
    </>
  )
}

/* -------------------------------------------------------------------------- */

function UsersTab() {
  const { t, locale, formatDate, formatNumber } = useI18n()
  const ar = locale === 'ar-EG'
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [role, setRole] = React.useState<PlatformUserQuery['Role']>(undefined)
  const [granting, setGranting] = React.useState<PlatformUserDto | null>(null)
  const debounced = useDebounced(search, 300)

  React.useEffect(() => setPage(1), [debounced, role])

  const query = React.useMemo<PlatformUserQuery>(
    () => ({ Page: page, PageSize: PAGE_SIZE, Search: debounced.trim() || undefined, Role: role }),
    [page, debounced, role],
  )

  const users = useQuery({
    queryKey: qk.platform.users(query),
    queryFn: () => platformApi.users(query),
    placeholderData: keepPreviousData,
  })

  const roles = (row: PlatformUserDto) =>
    [
      row.isStudent && (ar ? 'طالب' : 'Student'),
      row.isTeacher && (ar ? 'مدرّس' : 'Teacher'),
      row.isParent && (ar ? 'ولي أمر' : 'Parent'),
    ].filter(Boolean) as string[]

  const columns: Column<PlatformUserDto>[] = [
    {
      id: 'user',
      header: ar ? 'الحساب' : 'Account',
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            traits={avatarTraitsFor(row.userId ?? '')}
            seed={row.userId ?? ''}
            name={row.displayName}
            src={imageUrl(row.profileImageUrl)}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-body-sm font-semibold text-foreground">{row.displayName}</p>
            <p className="truncate font-latin text-caption text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
      sortValue: (row) => row.displayName,
    },
    {
      id: 'roles',
      header: ar ? 'الأدوار' : 'Roles',
      hideOnMobile: true,
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {roles(row).map((r) => (
            <Badge key={r} variant="outline" size="sm">
              {r}
            </Badge>
          ))}
          {(row.schoolMemberships ?? 0) > 0 && (
            <Badge variant="info" size="sm">
              {ar ? `${formatNumber(row.schoolMemberships!)} مدرسة` : `${row.schoolMemberships} schools`}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'lastLogin',
      header: ar ? 'آخر دخول' : 'Last sign-in',
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-caption text-muted-foreground">
          {row.lastLoginAt ? formatDate(row.lastLoginAt, 'd MMM yyyy') : '—'}
        </span>
      ),
      sortValue: (row) => row.lastLoginAt ?? '',
    },
    {
      id: 'status',
      header: t('common.status'),
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={row.isActive ? 'success' : 'outline'} size="sm">
            {row.isActive ? t('common.active') : t('common.inactive')}
          </Badge>
          {!row.emailConfirmed && (
            <Badge variant="warning" size="sm">
              {ar ? 'الإيميل مش مؤكَّد' : 'Email unconfirmed'}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex justify-end gap-2">
          <UserStateButton userId={row.userId} isActive={row.isActive} name={row.displayName} />
          {row.isActive && (
            <Button size="sm" variant="ghost" onClick={() => setGranting(row)}>
              <ShieldCheck className="size-4" />
              {ar ? 'اجعله أدمن' : 'Make admin'}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('common.search')}
          className="max-w-md flex-1"
          id="platform-users-search"
        />
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map((f) => (
            <FilterChip
              key={f.value ?? 'all'}
              label={ar ? f.ar : f.en}
              active={role === f.value}
              onClick={() => setRole(f.value)}
            />
          ))}
        </div>
      </div>

      <DataTable
        rows={users.data?.items ?? []}
        columns={columns}
        rowKey={(row) => row.userId ?? row.email}
        loading={users.isPending}
        error={users.isError ? users.error : undefined}
        onRetry={() => users.refetch()}
        isFetching={users.isFetching}
        serverPage={users.data}
        onPageChange={setPage}
        empty={{ spot: 'teachers', title: ar ? 'مفيش حسابات مطابقة' : 'No matching accounts' }}
        mobileCard={(row) => (
          <Card className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-body-sm font-bold text-foreground">{row.displayName}</p>
                <p className="truncate font-latin text-caption text-muted-foreground">{row.email}</p>
              </div>
              <Badge variant={row.isActive ? 'success' : 'outline'} size="sm">
                {row.isActive ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
            <p className="text-caption text-muted-foreground">{roles(row).join(' · ') || '—'}</p>
            <div className="flex gap-2">
              <UserStateButton userId={row.userId} isActive={row.isActive} name={row.displayName} />
              {row.isActive && (
                <Button size="sm" variant="ghost" onClick={() => setGranting(row)}>
                  {ar ? 'اجعله أدمن' : 'Make admin'}
                </Button>
              )}
            </div>
          </Card>
        )}
      />

      <AuthorityDialog
        mode="grant"
        target={granting ? { userId: granting.userId, name: granting.displayName } : null}
        onClose={() => setGranting(null)}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */

function AdministratorsTab() {
  const { t, locale, formatDate } = useI18n()
  const ar = locale === 'ar-EG'
  const [revoking, setRevoking] = React.useState<PlatformAdministratorDto | null>(null)

  const admins = useQuery({
    queryKey: qk.platform.administrators,
    queryFn: platformApi.administrators,
  })

  const columns: Column<PlatformAdministratorDto>[] = [
    {
      id: 'admin',
      header: ar ? 'الأدمن' : 'Administrator',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-display text-body-sm font-semibold text-foreground">
            {row.displayName}
            {row.isCurrentUser && (
              <span className="ms-2 text-caption font-normal text-muted-foreground">{ar ? '(إنت)' : '(you)'}</span>
            )}
          </p>
          <p className="truncate font-latin text-caption text-muted-foreground">{row.email}</p>
        </div>
      ),
      sortValue: (row) => row.displayName,
    },
    {
      id: 'lastLogin',
      header: ar ? 'آخر دخول' : 'Last sign-in',
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-caption text-muted-foreground">
          {row.lastLoginAt ? formatDate(row.lastLoginAt, 'd MMM yyyy') : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('common.status'),
      cell: (row) => (
        <Badge variant={row.isActive ? 'success' : 'outline'} size="sm">
          {row.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (row) =>
        // The server refuses to remove the last administrator; say so instead of offering it.
        row.isLastAdministrator ? (
          <span className="text-caption text-muted-foreground">{ar ? 'آخر أدمن' : 'Last administrator'}</span>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setRevoking(row)}>
            <ShieldMinus className="size-4" />
            {ar ? 'سحب الصلاحية' : 'Revoke'}
          </Button>
        ),
    },
  ]

  return (
    <>
      <DataTable
        rows={admins.data ?? []}
        columns={columns}
        rowKey={(row) => row.userId ?? row.email}
        loading={admins.isPending}
        error={admins.isError ? admins.error : undefined}
        onRetry={() => admins.refetch()}
        empty={{ spot: 'teachers', title: ar ? 'مفيش أدمن' : 'No administrators' }}
      />
      <AuthorityDialog
        mode="revoke"
        target={revoking ? { userId: revoking.userId, name: revoking.displayName, self: revoking.isCurrentUser } : null}
        onClose={() => setRevoking(null)}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */

/** Grants or revokes platform authority. Both are audited and the server requires a reason. */
function AuthorityDialog({
  mode,
  target,
  onClose,
}: {
  mode: 'grant' | 'revoke'
  target: { userId?: string; name: string; self?: boolean } | null
  onClose: () => void
}) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [reason, setReason] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setReason('')
    setError(null)
  }, [target])

  const change = useMutation({
    mutationFn: () =>
      mode === 'grant'
        ? platformApi.grantAdmin(target!.userId!, reason.trim())
        : platformApi.revokeAdmin(target!.userId!, reason.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform'] })
      toast({
        title:
          mode === 'grant'
            ? ar ? 'بقى أدمن للمنصة' : 'Administrator added'
            : ar ? 'اتسحبت الصلاحية' : 'Authority revoked',
        variant: 'success',
      })
      onClose()
    },
    onError: (e) => setError(isApiError(e) ? e.message : ar ? 'حصل خطأ' : 'Something went wrong'),
  })

  return (
    <FormDialog
      open={!!target}
      onOpenChange={(open) => !open && onClose()}
      submitting={change.isPending}
      submitDisabled={!reason.trim()}
      error={error}
      title={
        mode === 'grant'
          ? ar ? `تخلي ${target?.name ?? ''} أدمن للمنصة؟` : `Make ${target?.name ?? ''} a platform administrator?`
          : ar ? `تسحب صلاحية الأدمن من ${target?.name ?? ''}؟` : `Revoke ${target?.name ?? ''}'s platform authority?`
      }
      description={
        mode === 'grant'
          ? ar
            ? 'هيقدر يدير كل المدارس والمستخدمين والإعدادات. العملية بتتسجّل.'
            : 'They will be able to manage every school, account and setting. This is audited.'
          : target?.self
            ? ar
              ? 'دي صلاحيتك إنت — هتخرج من لوحة الأدمن فورًا.'
              : 'This is your own authority — you will lose the admin console immediately.'
            : ar
              ? 'كل جلساته المفتوحة هتتقفل. العملية بتتسجّل.'
              : 'Their open sessions are closed. This is audited.'
      }
      submitLabel={mode === 'grant' ? (ar ? 'تأكيد' : 'Confirm') : ar ? 'سحب الصلاحية' : 'Revoke'}
      onSubmit={(e) => {
        e.preventDefault()
        if (reason.trim()) change.mutate()
      }}
    >
      <Field label={ar ? 'السبب' : 'Reason'} htmlFor="authority-reason" required>
        <Input id="authority-reason" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </FormDialog>
  )
}

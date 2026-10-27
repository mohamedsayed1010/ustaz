import * as React from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { tenantApi } from '@/api/endpoints/tenant'
import type { AuditLogDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { usePageTitle } from '@/hooks/use-page-title'
import { useDebounced } from '@/hooks/use-ui'
import { useI18n } from '@/i18n'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DataTable, type Column } from '@/components/dashboard/DataTable'
import { SearchBar } from '@/components/common/controls'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 25

/**
 * Sensitive actions inside the caller's workspace (GET /tenant/audit-logs).
 * The server allows the workspace owner only; anyone else gets its 403.
 */
export default function TeacherAuditLogPage() {
  const { t, locale, formatDate } = useI18n()
  const ar = locale === 'ar-EG'
  usePageTitle(ar ? 'سجل العمليات' : 'Audit log')

  const [page, setPage] = React.useState(1)
  const [action, setAction] = React.useState('')
  const debounced = useDebounced(action, 300)
  React.useEffect(() => setPage(1), [debounced])

  const query = React.useMemo(
    () => ({ Page: page, PageSize: PAGE_SIZE, Action: debounced.trim() || undefined }),
    [page, debounced],
  )

  const logs = useQuery({
    queryKey: qk.tenant.auditLogs(query),
    queryFn: () => tenantApi.auditLogs(query),
    placeholderData: keepPreviousData,
  })

  const columns: Column<AuditLogDto>[] = [
    {
      id: 'when',
      header: t('common.date'),
      cell: (row) => (
        <span className="tnum whitespace-nowrap text-caption text-muted-foreground">
          {row.createdAt ? formatDate(row.createdAt, 'd MMM yyyy, HH:mm') : '—'}
        </span>
      ),
      sortValue: (row) => row.createdAt ?? '',
    },
    {
      id: 'action',
      header: ar ? 'العملية' : 'Action',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-latin text-body-sm font-semibold text-foreground">{row.action}</p>
          {row.entityName && <p className="font-latin text-caption text-muted-foreground">{row.entityName}</p>}
        </div>
      ),
    },
    {
      id: 'who',
      header: ar ? 'بواسطة' : 'By',
      hideOnMobile: true,
      cell: (row) => <span className="font-latin text-caption text-muted-foreground">{row.userEmail ?? '—'}</span>,
    },
    {
      id: 'result',
      header: t('common.status'),
      cell: (row) => (
        <Badge variant={row.succeeded ? 'success' : 'destructive'} size="sm">
          {row.succeeded ? (ar ? 'تمّت' : 'Succeeded') : ar ? 'فشلت' : 'Failed'}
        </Badge>
      ),
    },
  ]

  return (
    <>
      <DashboardHeader
        title={ar ? 'سجل العمليات' : 'Audit log'}
        description={
          ar
            ? 'العمليات الحساسة اللي حصلت في مساحة عملك — لصاحب المساحة بس.'
            : 'Sensitive actions taken in your workspace — visible to the owner only.'
        }
      >
        <SearchBar
          value={action}
          onChange={setAction}
          placeholder={ar ? 'فلتر بالعملية' : 'Filter by action'}
          className="max-w-md"
          id="tenant-audit-action"
        />
      </DashboardHeader>

      <DataTable
        rows={logs.data?.items ?? []}
        columns={columns}
        rowKey={(row) => row.id ?? ''}
        loading={logs.isPending}
        error={logs.isError ? logs.error : undefined}
        onRetry={() => logs.refetch()}
        isFetching={logs.isFetching}
        serverPage={logs.data}
        onPageChange={setPage}
        empty={{ spot: 'courses', title: ar ? 'مفيش عمليات مسجّلة' : 'Nothing recorded yet' }}
        mobileCard={(row) => (
          <Card className="space-y-1 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-latin text-body-sm font-semibold text-foreground">{row.action}</p>
              <Badge variant={row.succeeded ? 'success' : 'destructive'} size="sm">
                {row.succeeded ? '✓' : '✕'}
              </Badge>
            </div>
            <p className="tnum text-caption text-muted-foreground">
              {row.createdAt ? formatDate(row.createdAt, 'd MMM yyyy, HH:mm') : ''} · {row.userEmail}
            </p>
          </Card>
        )}
      />
    </>
  )
}

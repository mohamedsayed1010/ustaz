import * as React from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/endpoints/admin'
import type { DiscountDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { usePageTitle } from '@/hooks/use-page-title'
import { useDebounced } from '@/hooks/use-ui'
import { useI18n } from '@/i18n'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DataTable, type Column } from '@/components/dashboard/DataTable'
import { FilterChip, SearchBar } from '@/components/common/controls'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20

/** Every promo code on the platform (GET /admin/discounts). Read-only: teachers own their codes. */
export default function AdminDiscountsPage() {
  const { t, locale, formatNumber, formatCurrency, formatDate } = useI18n()
  const ar = locale === 'ar-EG'
  usePageTitle(ar ? 'أكواد الخصم' : 'Discount codes')

  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [validOnly, setValidOnly] = React.useState(false)
  const debounced = useDebounced(search, 300)
  React.useEffect(() => setPage(1), [debounced, validOnly])

  const query = React.useMemo(
    () => ({
      Page: page,
      PageSize: PAGE_SIZE,
      Search: debounced.trim() || undefined,
      CurrentlyValidOnly: validOnly || undefined,
    }),
    [page, debounced, validOnly],
  )

  const discounts = useQuery({
    queryKey: qk.admin.discounts(query),
    queryFn: () => adminApi.discounts(query),
    placeholderData: keepPreviousData,
  })

  const value = (row: DiscountDto) =>
    row.type === 'Percentage' ? `${formatNumber(row.value ?? 0)}%` : formatCurrency(row.value ?? 0)

  const columns: Column<DiscountDto>[] = [
    {
      id: 'code',
      header: ar ? 'الكود' : 'Code',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-latin text-body-sm font-semibold tracking-wide text-foreground">{row.code}</p>
          {row.description && <p className="truncate text-caption text-muted-foreground">{row.description}</p>}
        </div>
      ),
      sortValue: (row) => row.code ?? '',
    },
    {
      id: 'value',
      header: ar ? 'الخصم' : 'Discount',
      cell: (row) => <span className="tnum text-body-sm text-foreground">{value(row)}</span>,
      sortValue: (row) => row.value ?? 0,
    },
    {
      id: 'usage',
      header: ar ? 'الاستخدام' : 'Usage',
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-caption text-muted-foreground">
          {formatNumber(row.usedCount ?? 0)}
          {row.usageLimit ? ` / ${formatNumber(row.usageLimit)}` : ''}
        </span>
      ),
      sortValue: (row) => row.usedCount ?? 0,
    },
    {
      id: 'window',
      header: ar ? 'الصلاحية' : 'Valid',
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-caption text-muted-foreground">
          {row.startDate ? formatDate(row.startDate, 'd MMM yyyy') : '—'}
          {' → '}
          {row.endDate ? formatDate(row.endDate, 'd MMM yyyy') : ar ? 'مفتوح' : 'open'}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('common.status'),
      cell: (row) => (
        <Badge variant={row.isCurrentlyValid ? 'success' : 'outline'} size="sm">
          {row.isCurrentlyValid ? (ar ? 'ساري' : 'Valid') : row.isActive ? (ar ? 'منتهي' : 'Expired') : t('common.inactive')}
        </Badge>
      ),
    },
  ]

  return (
    <>
      <DashboardHeader
        title={ar ? 'أكواد الخصم' : 'Discount codes'}
        description={ar ? 'كل أكواد الخصم اللي عملها المدرّسين على المنصة.' : 'Every promo code teachers have created.'}
      >
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('common.search')}
            className="max-w-md flex-1"
            id="admin-discounts-search"
          />
          <FilterChip
            label={ar ? 'السارية بس' : 'Currently valid'}
            active={validOnly}
            onClick={() => setValidOnly((v) => !v)}
          />
        </div>
      </DashboardHeader>

      <DataTable
        rows={discounts.data?.items ?? []}
        columns={columns}
        rowKey={(row) => row.id ?? row.code ?? ''}
        loading={discounts.isPending}
        error={discounts.isError ? discounts.error : undefined}
        onRetry={() => discounts.refetch()}
        isFetching={discounts.isFetching}
        serverPage={discounts.data}
        onPageChange={setPage}
        empty={{ spot: 'payments', title: ar ? 'مفيش أكواد خصم' : 'No discount codes' }}
        mobileCard={(row) => (
          <Card className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-latin text-body-sm font-bold text-foreground">{row.code}</p>
              <p className="tnum text-caption text-muted-foreground">{value(row)}</p>
            </div>
            <Badge variant={row.isCurrentlyValid ? 'success' : 'outline'} size="sm">
              {row.isCurrentlyValid ? (ar ? 'ساري' : 'Valid') : ar ? 'غير ساري' : 'Not valid'}
            </Badge>
          </Card>
        )}
      />
    </>
  )
}

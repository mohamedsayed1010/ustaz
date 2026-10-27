import * as React from 'react'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { studentApi } from '@/api/endpoints/student'
import type { InquiryDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { usePageTitle } from '@/hooks/use-page-title'
import { useI18n } from '@/i18n'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/dashboard/DataTable'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 20

/** Requests the student sent to teachers (GET /student/inquiries) and where each stands. */
export default function StudentInquiriesPage() {
  const { t, locale, formatDate } = useI18n()
  const ar = locale === 'ar-EG'
  usePageTitle(ar ? 'طلباتي' : 'My inquiries')

  const [page, setPage] = React.useState(1)
  const query = React.useMemo(() => ({ Page: page, PageSize: PAGE_SIZE }), [page])

  const inquiries = useQuery({
    queryKey: qk.student.inquiries(query),
    queryFn: () => studentApi.inquiries(query),
    placeholderData: keepPreviousData,
  })

  const target = (row: InquiryDto) => row.groupName || row.courseTitle || (ar ? 'استفسار عام' : 'General question')

  const columns: Column<InquiryDto>[] = [
    {
      id: 'teacher',
      header: ar ? 'المدرّس' : 'Teacher',
      cell: (row) => (
        <div className="min-w-0">
          <Link
            to={`/teachers/${row.teacherId}`}
            className="block truncate font-display text-body-sm font-semibold text-foreground hover:text-primary"
          >
            {row.teacherName}
          </Link>
          <p className="truncate text-caption text-muted-foreground">{target(row)}</p>
        </div>
      ),
      sortValue: (row) => row.teacherName ?? '',
    },
    {
      id: 'message',
      header: ar ? 'رسالتك' : 'Your message',
      hideOnMobile: true,
      cell: (row) => <p className="line-clamp-2 max-w-md text-body-sm text-muted-foreground">{row.message}</p>,
    },
    {
      id: 'reply',
      header: ar ? 'رد المدرّس' : "Teacher's note",
      hideOnMobile: true,
      cell: (row) => (
        <p className="line-clamp-2 max-w-xs text-body-sm text-muted-foreground">{row.teacherNote || '—'}</p>
      ),
    },
    {
      id: 'date',
      header: t('common.date'),
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-body-sm text-muted-foreground">
          {row.createdAt ? formatDate(row.createdAt, 'd MMM yyyy') : '—'}
        </span>
      ),
      sortValue: (row) => row.createdAt ?? '',
    },
    {
      id: 'status',
      header: t('common.status'),
      cell: (row) => <StatusBadge status={row.status} fallbackLabel={row.statusName} />,
    },
    {
      id: 'whatsapp',
      header: '',
      cell: (row) =>
        row.whatsAppLink ? (
          <Button asChild size="sm" variant="outline">
            <a href={row.whatsAppLink} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" />
              {ar ? 'واتساب' : 'WhatsApp'}
            </a>
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <DashboardHeader
        title={ar ? 'طلباتي' : 'My inquiries'}
        description={
          ar
            ? 'الأسئلة وطلبات الانضمام اللي بعتّها للمدرّسين، وحالة كل طلب.'
            : 'Questions and join requests you sent to teachers, and where each one stands.'
        }
      />

      <DataTable
        rows={inquiries.data?.items ?? []}
        columns={columns}
        rowKey={(row) => row.id ?? ''}
        loading={inquiries.isPending}
        error={inquiries.isError ? inquiries.error : undefined}
        onRetry={() => inquiries.refetch()}
        isFetching={inquiries.isFetching}
        serverPage={inquiries.data}
        onPageChange={setPage}
        empty={{
          spot: 'messages',
          title: ar ? 'مبعتّش أي طلب لسه' : 'No inquiries yet',
          description: ar
            ? 'تقدر تسأل أي مدرّس أو تطلب الانضمام لمجموعة من صفحته.'
            : 'Ask a teacher a question or request a seat from their profile.',
          action: { label: t('nav.teachers'), href: '/teachers' },
        }}
        mobileCard={(row) => (
          <Card className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-body-sm font-bold text-foreground">{row.teacherName}</p>
                <p className="truncate text-caption text-muted-foreground">{target(row)}</p>
              </div>
              <StatusBadge status={row.status} fallbackLabel={row.statusName} />
            </div>
            <p className="line-clamp-3 text-body-sm text-muted-foreground">{row.message}</p>
            {row.teacherNote && (
              <p className="rounded-md bg-muted p-2 text-body-sm text-foreground">{row.teacherNote}</p>
            )}
          </Card>
        )}
      />
    </>
  )
}

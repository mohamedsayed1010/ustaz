import * as React from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, BookOpen, LineChart, MessageSquare, UserPlus, Users } from 'lucide-react'
import { teacherAnalyticsApi, teacherEnrollmentsApi, teacherGroupsApi } from '@/api/endpoints/teacher'
import { isApiError } from '@/api/errors'
import { useToast } from '@/hooks/use-toast'
import { FormDialog } from '@/components/common/FormDialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AtRiskStudentDto, CourseEnrollmentDto, GroupEnrollmentDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { usePageTitle } from '@/hooks/use-page-title'
import { useDebounced } from '@/hooks/use-ui'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { avatarTraitsFor } from '@/lib/identity'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { SearchBar } from '@/components/common/controls'
import { StatusBadge } from '@/components/common/StatusBadge'
import { DataTable, type Column } from '@/components/dashboard/DataTable'
import { QueryError } from '@/components/common/QueryBoundary'
import { EmptyState } from '@/components/common/states'
import { RowSkeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/primitives'
import { Avatar } from '@/components/illustrations/PersonAvatar'
import { Button } from '@/components/ui/button'
import { StudentInsightSheet } from '@/components/teacher/StudentInsightSheet'

const PAGE_SIZE = 20

export default function TeacherStudentsPage() {
  const { t, locale, formatNumber, formatCurrency, formatDate } = useI18n()
  usePageTitle(t('common.students'))

  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const debounced = useDebounced(search, 300)

  const query = React.useMemo(
    () => ({ Page: page, PageSize: PAGE_SIZE, Search: debounced.trim() || undefined }),
    [page, debounced],
  )

  const enrollments = useQuery({
    queryKey: qk.teacher.enrollments('groups', query),
    queryFn: () => teacherEnrollmentsApi.groups(query),
    placeholderData: keepPreviousData,
  })

  const atRisk = useQuery({
    queryKey: qk.teacher.atRisk({ Take: 50 }),
    queryFn: () => teacherAnalyticsApi.atRisk({ Take: 50 }),
  })

  React.useEffect(() => setPage(1), [debounced])

  const [inspecting, setInspecting] = React.useState<{ id: string; name?: string | null } | null>(null)
  const [adding, setAdding] = React.useState<GroupEnrollmentDto | null>(null)

  const columns: Column<GroupEnrollmentDto>[] = [
    {
      id: 'student',
      header: t('common.student'),
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            traits={avatarTraitsFor(row.studentId ?? '')}
            seed={row.studentId ?? ''}
            name={row.studentName ?? ''}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-body-sm font-semibold text-foreground">
              {row.studentName}
            </p>
            {row.studentPhoneNumber && (
              <p className="truncate font-latin text-caption text-muted-foreground" dir="ltr">
                {row.studentPhoneNumber}
              </p>
            )}
          </div>
        </div>
      ),
      sortValue: (row) => row.studentName ?? '',
    },
    {
      id: 'group',
      header: t('common.group'),
      cell: (row) => (
        <span className="truncate text-body-sm text-muted-foreground">{row.groupName}</span>
      ),
      sortValue: (row) => row.groupName ?? '',
    },
    {
      id: 'enrolled',
      header: locale === 'ar-EG' ? 'تاريخ الاشتراك' : 'Enrolled',
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-body-sm text-muted-foreground">
          {row.enrolledAt ? formatDate(row.enrolledAt, 'd MMM yyyy') : '—'}
        </span>
      ),
      sortValue: (row) => row.enrolledAt ?? '',
    },
    {
      id: 'price',
      header: t('common.price'),
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum font-display text-body-sm font-bold text-foreground">
          {formatCurrency(row.finalPrice ?? 0)}
        </span>
      ),
      sortValue: (row) => row.finalPrice ?? 0,
    },
    {
      id: 'status',
      header: t('common.status'),
      cell: (row) => <StatusBadge status={row.status} fallbackLabel={row.statusName} />,
      sortValue: (row) => row.status ?? '',
    },
    {
      id: 'view',
      header: '',
      cell: (row) =>
        row.studentId ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInspecting({ id: row.studentId!, name: row.studentName })}
            >
              <LineChart className="size-4" />
              {locale === 'ar-EG' ? 'الملف' : 'Profile'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(row)}>
              <UserPlus className="size-4" />
              {locale === 'ar-EG' ? 'ضيفه لمجموعة' : 'Add to group'}
            </Button>
          </div>
        ) : null,
    },
  ]

  const riskCount = (atRisk.data ?? []).filter(
    (s) => s.riskLevel === 'High' || s.riskLevel === 'Medium',
  ).length

  return (
    <>
      <DashboardHeader
        title={t('common.students')}
        description={
          locale === 'ar-EG'
            ? 'كل طلابك، اشتراكاتهم، ومين محتاج متابعة.'
            : 'All your students, their enrollments, and who needs attention.'
        }
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            <Users className="size-4" />
            {t('common.all')}
            {enrollments.data && (
              <span className="tnum ms-1.5 rounded-full bg-muted px-1.5 text-[0.6875rem]">
                {formatNumber(enrollments.data.totalCount)}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="courses">
            <BookOpen className="size-4" />
            {locale === 'ar-EG' ? 'طلاب الكورسات' : 'Course students'}
          </TabsTrigger>
          <TabsTrigger value="at-risk">
            <AlertTriangle className="size-4" />
            {t('dashboard.atRiskStudents')}
            {riskCount > 0 && (
              <span className="tnum ms-1.5 rounded-full bg-destructive/15 px-1.5 text-[0.6875rem] text-destructive-strong">
                {formatNumber(riskCount)}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-5">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('common.search')}
            className="max-w-md"
            id="teacher-students-search"
          />

          <DataTable
            rows={enrollments.data?.items ?? []}
            columns={columns}
            rowKey={(row) => row.id ?? `${row.studentId}-${row.groupId}`}
            loading={enrollments.isPending}
            error={enrollments.isError ? enrollments.error : undefined}
            onRetry={() => enrollments.refetch()}
            isFetching={enrollments.isFetching}
            serverPage={enrollments.data}
            onPageChange={setPage}
            empty={{
              spot: 'teachers',
              title: locale === 'ar-EG' ? 'لسه مفيش طلاب' : 'No students yet',
              description:
                locale === 'ar-EG'
                  ? 'انشر مجموعاتك عشان الطلاب يقدروا يشتركوا.'
                  : 'Publish your groups so students can enroll.',
              action: { label: t('common.groups'), href: '/teacher/groups' },
            }}
            mobileCard={(row) => (
              <Card className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    traits={avatarTraitsFor(row.studentId ?? '')}
                    seed={row.studentId ?? ''}
                    name={row.studentName ?? ''}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-body-sm font-bold text-foreground">
                      {row.studentName}
                    </p>
                    <p className="truncate text-caption text-muted-foreground">{row.groupName}</p>
                  </div>
                  <StatusBadge status={row.status} fallbackLabel={row.statusName} />
                </div>
              </Card>
            )}
          />
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <CourseStudentsTable onInspect={setInspecting} />
        </TabsContent>

        <TabsContent value="at-risk" className="mt-6">
          {atRisk.isPending ? (
            <RowSkeleton count={5} />
          ) : atRisk.isError ? (
            <QueryError error={atRisk.error} onRetry={() => atRisk.refetch()} />
          ) : (atRisk.data ?? []).length === 0 ? (
            <EmptyState
              spot="success"
              title={locale === 'ar-EG' ? 'كل الطلاب منتظمين' : 'Everyone is on track'}
              description={
                locale === 'ar-EG'
                  ? 'مفيش طالب محتاج متابعة خاصة دلوقتي.'
                  : 'No student needs special attention right now.'
              }
            />
          ) : (
            <div className="space-y-4">
              {(atRisk.data ?? []).map((student) => (
                <AtRiskCard key={student.studentId} student={student} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <StudentInsightSheet
        studentId={inspecting?.id ?? null}
        studentName={inspecting?.name}
        open={Boolean(inspecting)}
        onOpenChange={(open) => !open && setInspecting(null)}
      />

      <AddToGroupDialog enrollment={adding} onClose={() => setAdding(null)} />
    </>
  )
}

/**
 * Enrolls a student the teacher already has into another of their groups
 * (POST /teacher/groups/{groupId}/students). The server requires Students.Manage
 * and refuses a duplicate enrollment; both come back as the API's message.
 */
function AddToGroupDialog({ enrollment, onClose }: { enrollment: GroupEnrollmentDto | null; onClose: () => void }) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [groupId, setGroupId] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const groupsQuery = { PageSize: 100 }
  const groups = useQuery({
    queryKey: qk.teacher.groups(groupsQuery),
    queryFn: () => teacherGroupsApi.list(groupsQuery),
    enabled: Boolean(enrollment),
  })
  const options = (groups.data?.items ?? []).filter((g) => g.id && g.id !== enrollment?.groupId)

  React.useEffect(() => {
    setGroupId('')
    setPrice('')
    setNotes('')
    setError(null)
  }, [enrollment])

  const badPrice = price.trim() !== '' && !(Number(price) >= 0)
  const enroll = useMutation({
    mutationFn: () =>
      teacherGroupsApi.enrollStudent(groupId, {
        studentId: enrollment!.studentId!,
        monthlyPrice: price.trim() ? Number(price) : null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher'] })
      toast({ title: ar ? 'اتضاف للمجموعة' : 'Added to the group', variant: 'success' })
      onClose()
    },
    onError: (e) => setError(isApiError(e) ? e.message : t('states.errorTitle')),
  })

  return (
    <FormDialog
      open={Boolean(enrollment)}
      onOpenChange={(open) => !open && onClose()}
      title={ar ? `إضافة ${enrollment?.studentName ?? ''} لمجموعة` : `Add ${enrollment?.studentName ?? ''} to a group`}
      description={ar ? 'الطالب هيوصله إشعار بالاشتراك.' : 'The student is notified of the enrollment.'}
      error={error}
      submitting={enroll.isPending}
      submitDisabled={!groupId || badPrice}
      onSubmit={(e) => {
        e.preventDefault()
        if (groupId && !badPrice) enroll.mutate()
      }}
    >
      <Field label={t('common.group')} htmlFor="enroll-group" required>
        {groups.isPending ? (
          <RowSkeleton count={1} />
        ) : groups.isError ? (
          <QueryError error={groups.error} onRetry={() => groups.refetch()} compact />
        ) : options.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            {ar ? 'مفيش مجموعة تانية تضيفه ليها.' : 'You have no other group to add them to.'}
          </p>
        ) : (
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger id="enroll-group">
              <SelectValue placeholder={ar ? 'اختار مجموعة' : 'Choose a group'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((g) => (
                <SelectItem key={g.id} value={g.id!}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>
      <Field
        label={ar ? 'السعر الشهري (اختياري)' : 'Monthly price (optional)'}
        htmlFor="enroll-price"
        hint={ar ? 'سيبه فاضي عشان يتحسب بسعر المجموعة.' : "Leave empty to use the group's price."}
      >
        <Input id="enroll-price" type="number" min={0} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <Field label={ar ? 'ملاحظات' : 'Notes'} htmlFor="enroll-notes">
        <Input id="enroll-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
      </Field>
    </FormDialog>
  )
}

function AtRiskCard({ student }: { student: AtRiskStudentDto }) {
  const { t, locale, formatNumber, formatTimeAgo } = useI18n()

  const metrics = [
    { label: t('dashboard.attendance'), value: Math.round(student.attendanceRate ?? 0) },
    { label: t('dashboard.homework'), value: Math.round(student.homeworkCompletionRate ?? 0) },
    { label: t('dashboard.grades'), value: Math.round(student.averageExamPercentage ?? 0) },
    { label: t('dashboard.progress'), value: Math.round(student.averageCourseProgress ?? 0) },
  ]

  return (
    <Card
      className={cn(
        'p-5',
        student.riskLevel === 'High'
          ? 'border-destructive/30 bg-destructive/5'
          : student.riskLevel === 'Medium'
            ? 'border-warning/30 bg-warning/5'
            : undefined,
      )}
    >
      <div className="flex flex-wrap items-start gap-4">
        <Avatar
          traits={avatarTraitsFor(student.studentId ?? '')}
          seed={student.studentId ?? ''}
          name={student.studentName ?? ''}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-body font-bold text-foreground">
              {student.studentName}
            </p>
            <Badge
              variant={
                student.riskLevel === 'High'
                  ? 'destructive'
                  : student.riskLevel === 'Medium'
                    ? 'warning'
                    : 'outline'
              }
              size="sm"
            >
              {student.riskLevelName ?? student.riskLevel}
            </Badge>
            {student.lastActivityAt && (
              <span className="text-caption text-muted-foreground">
                {formatTimeAgo(student.lastActivityAt)}
              </span>
            )}
          </div>

          <ul className="mt-3 space-y-1.5">
            {(student.reasons ?? []).map((reason) => (
              <li
                key={reason.code}
                className="flex items-start gap-2 text-body-sm text-muted-foreground"
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning-strong" />
                {locale === 'ar-EG' ? reason.messageAr : reason.messageEn}
              </li>
            ))}
          </ul>

          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt className="text-caption text-muted-foreground">{metric.label}</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <Progress
                    value={metric.value}
                    className="h-1.5 flex-1"
                    indicatorClassName={
                      metric.value >= 75
                        ? 'bg-success'
                        : metric.value >= 50
                          ? 'bg-warning'
                          : 'bg-destructive'
                    }
                  />
                  <span className="tnum text-caption font-bold text-foreground">
                    {metric.value}%
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex flex-wrap gap-4 text-caption text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="size-3.5" />
              {formatNumber(student.missingHomeworkCount ?? 0)}{' '}
              {locale === 'ar-EG' ? 'واجب ناقص' : 'missing homework'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="size-3.5" />
              {formatNumber(student.failedExamCount ?? 0)}{' '}
              {locale === 'ar-EG' ? 'امتحان راسب' : 'failed exams'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" />
              {formatNumber(student.absenceCount ?? 0)}{' '}
              {locale === 'ar-EG' ? 'غياب' : 'absences'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

/** Students who bought the teacher's recorded courses (GET /teacher/enrollments/courses). */
function CourseStudentsTable({ onInspect }: { onInspect: (student: { id: string; name?: string | null }) => void }) {
  const { t, locale, formatDate } = useI18n()
  const ar = locale === 'ar-EG'
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const debounced = useDebounced(search, 300)
  React.useEffect(() => setPage(1), [debounced])

  const query = React.useMemo(
    () => ({ Page: page, PageSize: PAGE_SIZE, Search: debounced.trim() || undefined }),
    [page, debounced],
  )
  const enrollments = useQuery({
    queryKey: qk.teacher.enrollments('courses', query),
    queryFn: () => teacherEnrollmentsApi.courses(query),
    placeholderData: keepPreviousData,
  })

  const columns: Column<CourseEnrollmentDto>[] = [
    {
      id: 'student',
      header: t('common.student'),
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar traits={avatarTraitsFor(row.studentId ?? '')} seed={row.studentId ?? ''} name={row.studentName ?? ''} size="sm" />
          <p className="truncate font-display text-body-sm font-semibold text-foreground">{row.studentName}</p>
        </div>
      ),
      sortValue: (row) => row.studentName ?? '',
    },
    {
      id: 'course',
      header: t('common.course'),
      cell: (row) => <span className="truncate text-body-sm text-muted-foreground">{row.courseTitle}</span>,
      sortValue: (row) => row.courseTitle ?? '',
    },
    {
      id: 'progress',
      header: ar ? 'التقدّم' : 'Progress',
      cell: (row) => (
        <div className="flex min-w-[7rem] items-center gap-2">
          <Progress value={row.progressPercentage ?? 0} className="h-1.5 flex-1" />
          <span className="tnum text-caption text-muted-foreground">{row.progressPercentage ?? 0}%</span>
        </div>
      ),
      sortValue: (row) => row.progressPercentage ?? 0,
    },
    {
      id: 'enrolled',
      header: ar ? 'تاريخ الاشتراك' : 'Enrolled',
      hideOnMobile: true,
      cell: (row) => (
        <span className="tnum text-body-sm text-muted-foreground">
          {row.enrolledAt ? formatDate(row.enrolledAt, 'd MMM yyyy') : '—'}
        </span>
      ),
      sortValue: (row) => row.enrolledAt ?? '',
    },
    {
      id: 'status',
      header: t('common.status'),
      cell: (row) => <StatusBadge status={row.status} fallbackLabel={row.statusName} />,
      sortValue: (row) => row.status ?? '',
    },
    {
      id: 'view',
      header: '',
      cell: (row) =>
        row.studentId ? (
          <Button variant="ghost" size="sm" onClick={() => onInspect({ id: row.studentId!, name: row.studentName })}>
            <LineChart className="size-4" />
            {ar ? 'الملف' : 'Profile'}
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-5">
      <SearchBar value={search} onChange={setSearch} placeholder={t('common.search')} className="max-w-md" id="teacher-course-students-search" />
      <DataTable
        rows={enrollments.data?.items ?? []}
        columns={columns}
        rowKey={(row) => row.id ?? `${row.studentId}-${row.courseId}`}
        loading={enrollments.isPending}
        error={enrollments.isError ? enrollments.error : undefined}
        onRetry={() => enrollments.refetch()}
        isFetching={enrollments.isFetching}
        serverPage={enrollments.data}
        onPageChange={setPage}
        empty={{
          spot: 'courses',
          title: ar ? 'لسه محدش اشترك في كورساتك' : 'No course students yet',
          description: ar ? 'انشر كورس مسجّل عشان الطلاب يقدروا يشتركوا فيه.' : 'Publish a recorded course so students can enroll.',
          action: { label: t('common.courses'), href: '/teacher/courses' },
        }}
        mobileCard={(row) => (
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Avatar traits={avatarTraitsFor(row.studentId ?? '')} seed={row.studentId ?? ''} name={row.studentName ?? ''} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-body-sm font-bold text-foreground">{row.studentName}</p>
                <p className="truncate text-caption text-muted-foreground">{row.courseTitle}</p>
              </div>
              <StatusBadge status={row.status} fallbackLabel={row.statusName} />
            </div>
            <Progress value={row.progressPercentage ?? 0} className="h-1.5" />
          </Card>
        )}
      />
    </div>
  )
}

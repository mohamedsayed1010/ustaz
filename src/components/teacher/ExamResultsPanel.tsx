import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { teacherEnrollmentsApi, teacherExamsApi } from '@/api/endpoints/teacher'
import type { ExamDto, ExamResultDto, GroupEnrollmentDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { useI18n } from '@/i18n'
import { useToast } from '@/hooks/use-toast'
import { useApiErrorToast } from '@/hooks/use-api-toast'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/primitives'
import { EmptyState } from '@/components/common/states'
import { QueryError } from '@/components/common/QueryBoundary'
import { RowSkeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Every active student in a group — the roster is paged, so read every page. */
async function loadRoster(groupId: string): Promise<GroupEnrollmentDto[]> {
  const all: GroupEnrollmentDto[] = []
  for (let page = 1; page < 50; page++) {
    const res = await teacherEnrollmentsApi.groups({ GroupId: groupId, Status: 'Active', Page: page, PageSize: 100 })
    all.push(...(res.items ?? []))
    if (!res.hasNext) break
  }
  return all
}

type Row = { score: string; isAbsent: boolean; comment: string }

const rowFrom = (r?: ExamResultDto): Row => ({
  score: r && !r.isAbsent ? String(r.score ?? '') : '',
  isAbsent: r?.isAbsent ?? false,
  comment: r?.teacherComment ?? '',
})

/**
 * Results for one exam. For a paper exam this is the only place marks get in:
 * the group's active roster becomes a marking sheet. New marks are recorded
 * together (POST …/results); a mark that already exists is corrected on its own
 * (PUT …/results/{studentId}) — the documented way to change one result.
 */
export function ExamResultsPanel({ exam }: { exam: ExamDto }) {
  const { locale, formatNumber } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const showError = useApiErrorToast()
  const queryClient = useQueryClient()
  const examId = exam.id!
  const max = exam.maximumScore ?? 0

  const results = useQuery({
    queryKey: qk.teacher.examResults(examId),
    queryFn: () => teacherExamsApi.results(examId),
  })
  const roster = useQuery({
    queryKey: ['teacher', 'enrollments', 'roster', exam.groupId],
    queryFn: () => loadRoster(exam.groupId!),
    enabled: Boolean(exam.groupId),
  })

  const byStudent = React.useMemo(
    () => new Map((results.data ?? []).map((r) => [r.studentId!, r])),
    [results.data],
  )

  const [rows, setRows] = React.useState<Record<string, Row>>({})
  const [rowErrors, setRowErrors] = React.useState<Record<string, string>>({})

  /* Re-seed from the server whenever saved results change. */
  React.useEffect(() => {
    if (!roster.data) return
    const next: Record<string, Row> = {}
    for (const s of roster.data) next[s.studentId!] = rowFrom(byStudent.get(s.studentId!))
    setRows(next)
    setRowErrors({})
  }, [roster.data, byStudent])

  const dirty = (roster.data ?? []).filter((s) => {
    const row = rows[s.studentId!]
    const base = rowFrom(byStudent.get(s.studentId!))
    return row && (row.score !== base.score || row.isAbsent !== base.isAbsent || row.comment !== base.comment)
  })

  const save = useMutation({
    mutationFn: async () => {
      const errors: Record<string, string> = {}
      const fresh: { studentId: string; score: number; isAbsent: boolean; teacherComment: string | null }[] = []
      const corrections: typeof fresh = []
      for (const s of dirty) {
        const id = s.studentId!
        const row = rows[id]
        const n = Number(row.score)
        if (!row.isAbsent && (row.score.trim() === '' || Number.isNaN(n) || n < 0 || n > max)) {
          errors[id] = ar ? `الدرجة من 0 لـ ${formatNumber(max)}` : `Score must be 0–${formatNumber(max)}`
          continue
        }
        const input = {
          studentId: id,
          score: row.isAbsent ? 0 : n,
          isAbsent: row.isAbsent,
          teacherComment: row.comment.trim() || null,
        }
        ;(byStudent.has(id) ? corrections : fresh).push(input)
      }
      setRowErrors(errors)
      if (Object.keys(errors).length) throw new Error('validation')

      if (fresh.length) await teacherExamsApi.recordResults(examId, { results: fresh })
      for (const c of corrections) {
        await teacherExamsApi.updateResult(examId, c.studentId, { ...c, examId })
      }
      return fresh.length + corrections.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'exam', examId] })
      queryClient.invalidateQueries({ queryKey: ['teacher', 'exams'] })
      toast({ title: ar ? `اتسجّلت ${formatNumber(count)} نتيجة` : `${count} results saved`, variant: 'success' })
    },
    onError: (error) => {
      if ((error as Error).message === 'validation') return
      // Some results may already be saved; re-read so the sheet shows the truth.
      queryClient.invalidateQueries({ queryKey: qk.teacher.examResults(examId) })
      showError(error)
    },
  })

  if (results.isPending || (exam.groupId && roster.isPending)) return <RowSkeleton count={5} />
  if (results.isError) return <QueryError error={results.error} onRetry={() => results.refetch()} />
  if (roster.isError) return <QueryError error={roster.error} onRetry={() => roster.refetch()} />

  /* Without a group there is no roster to mark against — show what exists. */
  if (!exam.groupId) {
    const list = results.data ?? []
    if (!list.length)
      return (
        <EmptyState
          spot="exams"
          title={ar ? 'لسه مفيش نتايج' : 'No results yet'}
          description={
            ar
              ? 'الامتحان ده مش مربوط بمجموعة، فمفيش قايمة طلاب نسجّل لها درجات.'
              : 'This exam is not linked to a group, so there is no roster to record marks for.'
          }
        />
      )
    return <ResultsList results={list} />
  }

  const students = roster.data ?? []
  if (!students.length)
    return (
      <EmptyState
        spot="groups"
        title={ar ? 'مفيش طلاب نشطين في المجموعة' : 'No active students in this group'}
        description={ar ? 'أول ما الطلاب يشتركوا هتقدر تسجّل درجاتهم هنا.' : 'Once students enroll you can record their marks here.'}
      />
    )

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <p className="text-body-sm text-muted-foreground">
          {ar ? 'الدرجة النهائية' : 'Maximum score'}:{' '}
          <span className="tnum font-semibold text-foreground">{formatNumber(max)}</span>
          {' · '}
          {ar ? 'النجاح' : 'Pass'}:{' '}
          <span className="tnum font-semibold text-foreground">{formatNumber(exam.passingScore ?? 0)}</span>
        </p>
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty.length}>
          <Save />
          {ar ? `حفظ (${formatNumber(dirty.length)})` : `Save (${dirty.length})`}
        </Button>
      </div>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[40rem] text-body-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-start">
              <th className="p-3 text-start data-label">{ar ? 'الطالب' : 'Student'}</th>
              <th className="p-3 text-start data-label">{ar ? 'الدرجة' : 'Score'}</th>
              <th className="p-3 text-start data-label">{ar ? 'غايب' : 'Absent'}</th>
              <th className="p-3 text-start data-label">{ar ? 'ملاحظة' : 'Comment'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((s) => {
              const id = s.studentId!
              const row = rows[id] ?? rowFrom()
              const saved = byStudent.get(id)
              const set = (patch: Partial<Row>) => setRows((prev) => ({ ...prev, [id]: { ...row, ...patch } }))
              return (
                <tr key={id}>
                  <td className="p-3">
                    <p className="font-semibold text-foreground">{s.studentName}</p>
                    {saved && (
                      <Badge variant={saved.isAbsent ? 'outline' : saved.isPassed ? 'success' : 'destructive'} size="sm" className="mt-1">
                        {saved.isAbsent ? (ar ? 'غياب' : 'Absent') : saved.isPassed ? (ar ? 'ناجح' : 'Passed') : ar ? 'راسب' : 'Failed'}
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 align-top">
                    <Input
                      value={row.score}
                      onChange={(e) => set({ score: e.target.value })}
                      inputMode="decimal"
                      dir="ltr"
                      disabled={row.isAbsent}
                      aria-label={ar ? `درجة ${s.studentName}` : `${s.studentName} score`}
                      aria-invalid={Boolean(rowErrors[id]) || undefined}
                      className={cn('tnum w-24', rowErrors[id] && 'border-destructive')}
                    />
                    {rowErrors[id] && <p className="mt-1 text-caption text-destructive-strong">{rowErrors[id]}</p>}
                  </td>
                  <td className="p-3 align-top">
                    <Checkbox
                      checked={row.isAbsent}
                      onCheckedChange={(v) => set({ isAbsent: v === true, score: v === true ? '' : row.score })}
                      aria-label={ar ? `${s.studentName} غايب` : `${s.studentName} absent`}
                    />
                  </td>
                  <td className="p-3 align-top">
                    <Input
                      value={row.comment}
                      onChange={(e) => set({ comment: e.target.value })}
                      aria-label={ar ? `ملاحظة على ${s.studentName}` : `Comment for ${s.studentName}`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ResultsList({ results }: { results: ExamResultDto[] }) {
  const { locale, formatNumber } = useI18n()
  const ar = locale === 'ar-EG'
  return (
    <Card className="divide-y divide-border">
      {results.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-3 p-4">
          <p className="font-semibold text-foreground">{r.studentName}</p>
          <span className="tnum text-body-sm text-muted-foreground">
            {r.isAbsent
              ? ar
                ? 'غياب'
                : 'Absent'
              : `${formatNumber(r.score ?? 0)} / ${formatNumber(r.maximumScore ?? 0)}`}
          </span>
        </div>
      ))}
    </Card>
  )
}

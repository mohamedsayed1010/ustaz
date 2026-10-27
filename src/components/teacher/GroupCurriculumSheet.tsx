import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { teacherGroupsApi } from '@/api/endpoints/teacher'
import type { GroupCurriculumDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { applyServerErrors, optionalText } from '@/lib/form'
import { useI18n } from '@/i18n'
import { useToast } from '@/hooks/use-toast'
import { useApiErrorToast } from '@/hooks/use-api-toast'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FormDialog } from '@/components/common/FormDialog'
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import { QueryError } from '@/components/common/QueryBoundary'
import { EmptyState } from '@/components/common/states'
import { RowSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'

/**
 * A group's syllabus — the ordered list of topics shown on its public page.
 * Server-owned: each change re-reads the group instead of patching locally.
 */
export function GroupCurriculumSheet({
  groupId,
  groupName,
  open,
  onOpenChange,
}: {
  groupId: string | null
  groupName?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const queryClient = useQueryClient()
  const showError = useApiErrorToast()
  const { toast } = useToast()

  const group = useQuery({
    queryKey: qk.teacher.group(groupId ?? ''),
    queryFn: () => teacherGroupsApi.details(groupId!),
    enabled: open && Boolean(groupId),
  })

  const [editing, setEditing] = React.useState<{ item: GroupCurriculumDto | null } | null>(null)
  const [removing, setRemoving] = React.useState<GroupCurriculumDto | null>(null)

  const refresh = React.useCallback(() => {
    if (!groupId) return
    queryClient.invalidateQueries({ queryKey: qk.teacher.group(groupId) })
    queryClient.invalidateQueries({ queryKey: qk.groups.curriculum(groupId) })
    queryClient.invalidateQueries({ queryKey: qk.groups.details(groupId) })
  }, [groupId, queryClient])

  const remove = useMutation({
    mutationFn: () => teacherGroupsApi.removeCurriculum(groupId!, removing!.id!),
    onSuccess: () => {
      refresh()
      setRemoving(null)
      toast({ title: ar ? 'اتحذف' : 'Deleted', variant: 'success' })
    },
    onError: showError,
  })

  const items = [...(group.data?.curriculum ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const nextOrder = items.reduce((m, i) => Math.max(m, i.sortOrder ?? 0), 0) + 1

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="end" className="flex w-full max-w-xl flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border p-5 text-start">
            <SheetTitle>{ar ? 'منهج المجموعة' : 'Group curriculum'}</SheetTitle>
            <SheetDescription className="truncate">{groupName}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5">
            {group.isPending ? (
              <RowSkeleton count={4} />
            ) : group.isError ? (
              <QueryError error={group.error} onRetry={() => group.refetch()} />
            ) : items.length === 0 ? (
              <EmptyState
                spot="groups"
                title={ar ? 'لسه مفيش منهج' : 'No curriculum yet'}
                description={
                  ar
                    ? 'اكتب المواضيع اللي هتشرحها بالترتيب — بتظهر للطلاب في صفحة المجموعة قبل ما يحجزوا.'
                    : 'List the topics you will cover, in order — students see them on the group page before booking.'
                }
                action={{ label: ar ? 'أضف أول موضوع' : 'Add the first topic', onClick: () => setEditing({ item: null }) }}
              />
            ) : (
              <ol className="divide-y divide-border rounded-lg border border-border bg-card">
                {items.map((item, index) => (
                  <li key={item.id} className="flex items-start gap-3 p-4">
                    <span className="tnum grid size-7 shrink-0 place-items-center rounded-md bg-muted text-caption font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-semibold text-foreground">{item.title}</p>
                      {item.description && <p className="mt-0.5 text-caption text-muted-foreground">{item.description}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={ar ? 'تعديل' : 'Edit'}
                      onClick={() => setEditing({ item })}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive-strong"
                      aria-label={ar ? 'حذف' : 'Delete'}
                      onClick={() => setRemoving(item)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-border p-4">
              <Button variant="outline" block onClick={() => setEditing({ item: null })}>
                <Plus />
                {ar ? 'أضف موضوع' : 'Add topic'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {groupId && (
        <CurriculumDialog
          groupId={groupId}
          state={editing}
          nextOrder={nextOrder}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        tone="danger"
        loading={remove.isPending}
        title={ar ? 'تحذف الموضوع؟' : 'Delete this topic?'}
        description={
          ar ? `هيتشال «${removing?.title ?? ''}» من منهج المجموعة.` : `“${removing?.title ?? ''}” will be removed from the curriculum.`
        }
        confirmLabel={ar ? 'حذف' : 'Delete'}
        onConfirm={() => remove.mutate()}
      />
    </>
  )
}

type Values = { title: string; description: string; sortOrder: string }

function CurriculumDialog({
  groupId,
  state,
  nextOrder,
  onClose,
  onSaved,
}: {
  groupId: string
  state: { item: GroupCurriculumDto | null } | null
  nextOrder: number
  onClose: () => void
  onSaved: () => void
}) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const [formError, setFormError] = React.useState<string | null>(null)
  const item = state?.item ?? null

  const schema = React.useMemo(
    () =>
      z.object({
        title: z.string().trim().min(1, t('validation.required')),
        description: z.string().optional().default(''),
        sortOrder: z
          .string()
          .refine((v) => v.trim() === '' || (/^\d+$/.test(v.trim()) && Number(v) >= 0), t('validation.number')),
      }),
    [t],
  )
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema) as never,
  })

  React.useEffect(() => {
    if (!state) return
    setFormError(null)
    reset({
      title: item?.title ?? '',
      description: item?.description ?? '',
      sortOrder: String(item?.sortOrder ?? nextOrder),
    })
  }, [state, item, nextOrder, reset])

  const save = useMutation({
    mutationFn: (v: Values) => {
      const body = { title: v.title.trim(), description: optionalText(v.description, !!item?.id), sortOrder: Number(v.sortOrder || 0) }
      return item?.id
        ? teacherGroupsApi.updateCurriculum(groupId, item.id, body)
        : teacherGroupsApi.addCurriculum(groupId, body)
    },
    onSuccess: () => {
      onSaved()
      onClose()
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError: (error) => setFormError(applyServerErrors<Values>(error, setError, ['title', 'description', 'sortOrder'])),
  })

  return (
    <FormDialog
      open={Boolean(state)}
      onOpenChange={(o) => !o && onClose()}
      title={item ? (ar ? 'تعديل الموضوع' : 'Edit topic') : ar ? 'موضوع جديد' : 'New topic'}
      error={formError}
      submitting={save.isPending}
      onSubmit={handleSubmit((v) => save.mutate(v))}
      size="md"
    >
      <Field label={ar ? 'الموضوع' : 'Topic'} htmlFor="cur-title" error={errors.title?.message} required>
        <Input id="cur-title" {...register('title')} />
      </Field>
      <Field label={ar ? 'تفاصيل' : 'Details'} htmlFor="cur-desc" error={errors.description?.message}>
        <Textarea id="cur-desc" rows={3} {...register('description')} />
      </Field>
      <Field label={ar ? 'الترتيب' : 'Order'} htmlFor="cur-order" error={errors.sortOrder?.message}>
        <Input id="cur-order" inputMode="numeric" dir="ltr" className="tnum w-28" {...register('sortOrder')} />
      </Field>
    </FormDialog>
  )
}

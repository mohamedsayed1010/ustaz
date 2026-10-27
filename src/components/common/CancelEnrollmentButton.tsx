import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { enrollmentsApi } from '@/api/endpoints/catalog'
import { useI18n } from '@/i18n'
import { useToast } from '@/hooks/use-toast'
import { useApiErrorToast } from '@/hooks/use-api-toast'
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'

/**
 * Cancels the student's own course or group enrollment
 * (POST /enrollments/{courses|groups}/{enrollmentId}/cancel). A group seat is
 * freed by the server. Only offered while the enrollment is still live.
 */
export function CancelEnrollmentButton({
  kind,
  enrollmentId,
  title,
  status,
}: {
  kind: 'course' | 'group'
  enrollmentId?: string | null
  title?: string | null
  status?: string | null
}) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const showError = useApiErrorToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')

  const cancel = useMutation({
    mutationFn: () =>
      kind === 'course'
        ? enrollmentsApi.cancelCourse(enrollmentId!, reason.trim() || undefined)
        : enrollmentsApi.cancelGroup(enrollmentId!, reason.trim() || undefined),
    onSuccess: () => {
      setOpen(false)
      setReason('')
      queryClient.invalidateQueries({ queryKey: ['student'] })
      queryClient.invalidateQueries({ queryKey: [kind === 'course' ? 'courses' : 'groups'] })
      toast({ title: ar ? 'اتلغى الاشتراك' : 'Enrollment cancelled', variant: 'success' })
    },
    onError: showError,
  })

  if (!enrollmentId || !(status === 'Active' || status === 'Pending')) return null

  return (
    <>
      <Button variant="ghost" size="sm" className="text-destructive-strong" onClick={() => setOpen(true)}>
        {ar ? 'إلغاء الاشتراك' : 'Cancel enrollment'}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="danger"
        loading={cancel.isPending}
        title={ar ? 'تلغي اشتراكك؟' : 'Cancel this enrollment?'}
        description={
          kind === 'group'
            ? ar
              ? `هتخرج من «${title ?? ''}» ومكانك هيتاح لطالب تاني.`
              : `You will leave “${title ?? ''}” and your seat will be released.`
            : ar
              ? `هيتلغى اشتراكك في «${title ?? ''}».`
              : `Your enrollment in “${title ?? ''}” will be cancelled.`
        }
        confirmLabel={ar ? 'إلغاء الاشتراك' : 'Cancel enrollment'}
        cancelLabel={ar ? 'رجوع' : 'Keep it'}
        onConfirm={() => cancel.mutate()}
      >
        <Field label={ar ? 'السبب (اختياري)' : 'Reason (optional)'} htmlFor={`cancel-reason-${enrollmentId}`}>
          <Textarea
            id={`cancel-reason-${enrollmentId}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </ConfirmDialog>
    </>
  )
}

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/endpoints/admin'
import { useI18n } from '@/i18n'
import { useToast } from '@/hooks/use-toast'
import { useApiErrorToast } from '@/hooks/use-api-toast'
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'

/**
 * Suspends or reactivates any account by its user id
 * (POST /admin/users/{userId}/state). Suspension asks for an optional reason,
 * which the API records.
 */
export function UserStateButton({
  userId,
  isActive,
  name,
}: {
  userId?: string | null
  isActive?: boolean
  name?: string | null
}) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const showError = useApiErrorToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const suspending = Boolean(isActive)

  const change = useMutation({
    mutationFn: () => adminApi.setUserState(userId!, !suspending, reason.trim() || undefined),
    onSuccess: () => {
      setOpen(false)
      setReason('')
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      queryClient.invalidateQueries({ queryKey: ['platform'] })
      toast({ title: suspending ? t('admin.suspend') : t('admin.activate'), variant: 'success' })
    },
    onError: showError,
  })

  if (!userId) return null

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={suspending ? 'text-destructive-strong' : undefined}
        onClick={() => setOpen(true)}
      >
        {suspending ? t('admin.suspend') : t('admin.activate')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone={suspending ? 'danger' : 'default'}
        loading={change.isPending}
        title={
          suspending
            ? ar
              ? `توقف حساب ${name ?? ''}؟`
              : `Suspend ${name ?? 'this account'}?`
            : ar
              ? `ترجّع حساب ${name ?? ''}؟`
              : `Reactivate ${name ?? 'this account'}?`
        }
        description={
          suspending
            ? ar
              ? 'مش هيقدر يدخل المنصة لحد ما ترجّع الحساب.'
              : 'They will not be able to sign in until the account is reactivated.'
            : ar
              ? 'هيقدر يدخل المنصة تاني.'
              : 'They will be able to sign in again.'
        }
        confirmLabel={suspending ? t('admin.suspend') : t('admin.activate')}
        onConfirm={() => change.mutate()}
      >
        {suspending && (
          <Field label={ar ? 'السبب (اختياري)' : 'Reason (optional)'} htmlFor={`state-reason-${userId}`}>
            <Textarea id={`state-reason-${userId}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        )}
      </ConfirmDialog>
    </>
  )
}

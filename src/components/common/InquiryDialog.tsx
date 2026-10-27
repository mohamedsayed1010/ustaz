import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MessageCircleQuestion } from 'lucide-react'
import { inquiriesApi } from '@/api/endpoints/catalog'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/i18n'
import { EG_MOBILE, applyServerErrors, normalizeEgyptianMobile } from '@/lib/form'
import { FormDialog } from '@/components/common/FormDialog'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'

type Values = { name: string; phoneNumber: string; email: string; message: string }

/**
 * "Ask the teacher" — sends an inquiry (POST /inquiries) that lands in the
 * teacher's inquiry pipeline. Optionally about one group or course. Prefilled
 * for signed-in visitors.
 */
export function InquiryButton({
  teacherId,
  groupId,
  courseId,
  subjectLabel,
  ...buttonProps
}: {
  teacherId: string
  groupId?: string
  courseId?: string
  /** What the question is about, shown in the dialog. */
  subjectLabel?: string | null
} & Omit<ButtonProps, 'onClick' | 'children'>) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().trim().min(2, t('validation.required')),
        phoneNumber: z
          .string()
          .trim()
          .refine((v) => EG_MOBILE.test(v.replace(/\s/g, '')), t('validation.phone')),
        email: z
          .string()
          .trim()
          .refine((v) => v === '' || z.string().email().safeParse(v).success, t('validation.email')),
        message: z.string().trim().min(10, ar ? 'اكتب سؤالك في ١٠ حروف على الأقل' : 'Write at least 10 characters'),
      }),
    [t, ar],
  )
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema) as never,
  })

  React.useEffect(() => {
    if (!open) return
    setFormError(null)
    reset({
      name: user?.displayName ?? '',
      phoneNumber: user?.phoneNumber ?? '',
      email: user?.email ?? '',
      message: '',
    })
  }, [open, user, reset])

  const send = useMutation({
    mutationFn: (v: Values) =>
      inquiriesApi.create({
        teacherId,
        groupId: groupId ?? null,
        courseId: courseId ?? null,
        name: v.name.trim(),
        phoneNumber: normalizeEgyptianMobile(v.phoneNumber),
        email: v.email.trim() || null,
        message: v.message.trim(),
      }),
    onSuccess: () => {
      setOpen(false)
      toast({
        title: ar ? 'سؤالك وصل للمدرّس' : 'Your question reached the teacher',
        description: ar ? 'هيتواصل معاك على رقمك.' : 'They will get back to you on your number.',
        variant: 'success',
      })
    },
    onError: (error) =>
      setFormError(applyServerErrors<Values>(error, setError, ['name', 'phoneNumber', 'email', 'message'])),
  })

  return (
    <>
      <Button variant="outline" {...buttonProps} onClick={() => setOpen(true)}>
        <MessageCircleQuestion />
        {ar ? 'اسأل المدرّس' : 'Ask the teacher'}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={ar ? 'اسأل المدرّس' : 'Ask the teacher'}
        description={subjectLabel ?? undefined}
        error={formError}
        submitting={send.isPending}
        submitLabel={ar ? 'إرسال' : 'Send'}
        onSubmit={handleSubmit((v) => send.mutate(v))}
        size="md"
      >
        <Field label={ar ? 'الاسم' : 'Name'} htmlFor="inq-name" error={errors.name?.message} required>
          <Input id="inq-name" autoComplete="name" {...register('name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={ar ? 'رقم الموبايل' : 'Mobile number'} htmlFor="inq-phone" error={errors.phoneNumber?.message} required>
            <Input id="inq-phone" type="tel" dir="ltr" autoComplete="tel" className="text-start font-latin" {...register('phoneNumber')} />
          </Field>
          <Field label={ar ? 'الإيميل (اختياري)' : 'Email (optional)'} htmlFor="inq-email" error={errors.email?.message}>
            <Input id="inq-email" type="email" dir="ltr" autoComplete="email" className="text-start font-latin" {...register('email')} />
          </Field>
        </div>
        <Field label={ar ? 'سؤالك' : 'Your question'} htmlFor="inq-message" error={errors.message?.message} required>
          <Textarea id="inq-message" rows={4} {...register('message')} />
        </Field>
      </FormDialog>
    </>
  )
}

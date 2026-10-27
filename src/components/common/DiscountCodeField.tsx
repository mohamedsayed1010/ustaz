import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Tag, X } from 'lucide-react'
import { discountsApi } from '@/api/endpoints/catalog'
import { isApiError } from '@/api/errors'
import type { DiscountValidationResultDto } from '@/api/schema'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PriceBreakdown } from '@/types'
import { cn } from '@/lib/utils'

/** What a code was checked against — exactly one of a course or a group. */
export type DiscountTarget = { courseId: string; groupId?: never } | { groupId: string; courseId?: never }

/** A code the server accepted, with the prices it quoted for it. */
export interface AppliedDiscount {
  code: string
  breakdown: PriceBreakdown
  currency?: string
}

/**
 * The "have a discount code?" control used before enrolling in a course or a
 * group. It asks the server to price the code (POST /discounts/validate, which
 * never redeems it — redemption happens during enrollment) and reports the
 * accepted code upward so the enroll request can carry it. The prices shown are
 * the server's, never computed here.
 */
export function DiscountCodeField({
  target,
  applied,
  onChange,
  disabled,
  className,
}: {
  target: DiscountTarget
  applied: AppliedDiscount | null
  onChange: (next: AppliedDiscount | null) => void
  disabled?: boolean
  className?: string
}) {
  const { locale, formatCurrency } = useI18n()
  const ar = locale === 'ar-EG'
  const [open, setOpen] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [rejection, setRejection] = React.useState<string | null>(null)
  const inputId = React.useId()

  const validate = useMutation({
    mutationFn: (value: string) => discountsApi.validate({ code: value, ...target }),
    onSuccess: (result: DiscountValidationResultDto, value) => {
      if (!result.isValid) {
        setRejection(result.failureReason || (ar ? 'الكود ده مش صالح.' : 'This code is not valid.'))
        onChange(null)
        return
      }
      setRejection(null)
      const original = result.originalAmount ?? 0
      const discountAmount = result.discountAmount ?? 0
      onChange({
        code: result.code || value,
        currency: result.currency,
        breakdown: {
          original,
          discountAmount,
          final: result.finalAmount ?? Math.max(0, original - discountAmount),
          percentOff: original > 0 ? Math.round((discountAmount / original) * 100) : 0,
        },
      })
    },
    onError: (error) => {
      onChange(null)
      // The live API answers an unknown code with 404 rather than { isValid: false }.
      if (isApiError(error) && error.kind === 'notFound') {
        setRejection(ar ? 'الكود ده مش موجود أو مش صالح هنا.' : 'This code does not exist or does not apply here.')
        return
      }
      setRejection(isApiError(error) ? error.message : ar ? 'تعذّر التحقق من الكود.' : 'Could not check this code.')
    },
  })

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const value = code.trim()
    if (!value || validate.isPending) return
    validate.mutate(value)
  }

  if (applied) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-body-sm',
          className,
        )}
      >
        <CheckCircle2 className="size-4 shrink-0 text-success-strong" aria-hidden />
        <span className="min-w-0 flex-1 text-success-strong">
          <span className="font-semibold" dir="ltr">
            {applied.code}
          </span>{' '}
          — {ar ? 'وفّرت' : 'you save'}{' '}
          <span className="tnum font-semibold">
            {formatCurrency(applied.breakdown.discountAmount, applied.currency ?? 'EGP')}
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setCode('')
          }}
          disabled={disabled}
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={ar ? 'إلغاء الكود' : 'Remove code'}
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary underline-offset-4 hover:underline disabled:opacity-50',
          className,
        )}
      >
        <Tag className="size-4" aria-hidden />
        {ar ? 'عندك كود خصم؟' : 'Have a discount code?'}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className={cn('space-y-1.5', className)} noValidate>
      <label htmlFor={inputId} className="text-caption font-semibold text-foreground">
        {ar ? 'كود الخصم' : 'Discount code'}
      </label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            if (rejection) setRejection(null)
          }}
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="flex-1 text-start font-latin uppercase"
          aria-invalid={Boolean(rejection) || undefined}
          aria-describedby={rejection ? `${inputId}-error` : undefined}
          disabled={disabled}
          autoFocus
        />
        <Button type="submit" variant="outline" loading={validate.isPending} disabled={disabled || !code.trim()}>
          {ar ? 'تطبيق' : 'Apply'}
        </Button>
      </div>
      {rejection && (
        <p id={`${inputId}-error`} role="alert" className="text-caption text-destructive-strong">
          {rejection}
        </p>
      )}
    </form>
  )
}

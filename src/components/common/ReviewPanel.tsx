import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Star, Trash2 } from 'lucide-react'
import { reviewsApi } from '@/api/endpoints/catalog'
import { isApiError } from '@/api/errors'
import type { ReviewDto } from '@/api/schema'
import { useI18n } from '@/i18n'
import { useToast } from '@/hooks/use-toast'
import { useApiErrorToast } from '@/hooks/use-api-toast'
import { FormDialog } from '@/components/common/FormDialog'
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { optionalText } from '@/lib/form'

/** What is being reviewed — exactly one of a teacher, a group or a course. */
export type ReviewTarget = { teacherId: string } | { groupId: string } | { courseId: string }

/**
 * Write, edit or delete the visitor's review of a teacher, group or course.
 * The API requires a non-cancelled enrollment with the target and moderates
 * every review, so a new one only appears in the list once approved; the
 * server's own message explains any refusal.
 */
export function ReviewPanel({
  target,
  reviews,
  canReview,
  hint,
  queryKeys,
}: {
  target: ReviewTarget
  /** The list already on the page; the visitor's own review is marked `isOwn`. */
  reviews: ReviewDto[]
  canReview: boolean
  /** Shown under the button when eligibility is decided by the server. */
  hint?: string
  /** Queries to refresh after a change (the page's review list, ratings). */
  queryKeys: readonly (readonly unknown[])[]
}) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const showError = useApiErrorToast()
  const queryClient = useQueryClient()
  const own = reviews.find((r) => r.isOwn)
  const [composing, setComposing] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const refresh = () => queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))

  const remove = useMutation({
    mutationFn: () => reviewsApi.remove(own!.id!),
    onSuccess: () => {
      refresh()
      setDeleting(false)
      toast({ title: ar ? 'اتحذف تقييمك' : 'Your review was deleted', variant: 'success' })
    },
    onError: showError,
  })

  if (!own && !canReview) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {own ? (
        <>
          <span className="text-body-sm text-muted-foreground">{ar ? 'ده تقييمك.' : 'This is your review.'}</span>
          <Button variant="outline" size="sm" onClick={() => setComposing(true)}>
            <Pencil />
            {ar ? 'تعديل' : 'Edit'}
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive-strong" onClick={() => setDeleting(true)}>
            <Trash2 />
            {ar ? 'حذف' : 'Delete'}
          </Button>
        </>
      ) : (
        <div>
          <Button variant="outline" size="sm" onClick={() => setComposing(true)}>
            <Star />
            {ar ? 'اكتب تقييم' : 'Write a review'}
          </Button>
          {hint && <p className="mt-1.5 text-caption text-muted-foreground">{hint}</p>}
        </div>
      )}

      <ReviewDialog
        open={composing}
        onOpenChange={setComposing}
        target={target}
        existing={own ?? null}
        onSaved={(created) => {
          refresh()
          toast({
            title: created
              ? ar
                ? 'شكرًا! تقييمك اتبعت وهيظهر بعد المراجعة.'
                : 'Thanks! Your review will appear once it has been checked.'
              : ar
                ? 'اتحدّث تقييمك'
                : 'Your review was updated',
            variant: 'success',
          })
        }}
      />

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        tone="danger"
        loading={remove.isPending}
        title={ar ? 'تحذف تقييمك؟' : 'Delete your review?'}
        description={ar ? 'هيتشال من الصفحة والتقييم العام هيتحسب من جديد.' : 'It will be removed and the overall rating recalculated.'}
        confirmLabel={ar ? 'حذف' : 'Delete'}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}

function ReviewDialog({
  open,
  onOpenChange,
  target,
  existing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: ReviewTarget
  existing: ReviewDto | null
  onSaved: (created: boolean) => void
}) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const [rating, setRating] = React.useState(0)
  const [comment, setComment] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [ratingError, setRatingError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setRating(existing?.rating ?? 0)
    setComment(existing?.comment ?? '')
    setError(null)
    setRatingError(null)
  }, [open, existing])

  const save = useMutation({
    mutationFn: async () => {
      if (existing?.id) {
        await reviewsApi.update(existing.id, { rating, comment: optionalText(comment, true) })
        return false
      }
      await reviewsApi.create({ ...target, rating, comment: comment.trim() || null })
      return true
    },
    onSuccess: (created) => {
      onOpenChange(false)
      onSaved(created)
    },
    onError: (e) => setError(isApiError(e) ? e.message : ar ? 'حصلت مشكلة.' : 'Something went wrong.'),
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={existing ? (ar ? 'تعديل تقييمك' : 'Edit your review') : ar ? 'اكتب تقييم' : 'Write a review'}
      error={error}
      submitting={save.isPending}
      onSubmit={(e) => {
        e.preventDefault()
        if (rating < 1) {
          setRatingError(ar ? 'اختار عدد النجوم' : 'Choose a star rating')
          return
        }
        save.mutate()
      }}
      size="md"
    >
      <div>
        <p id="review-stars-label" className="text-caption font-semibold text-foreground">
          {ar ? 'تقييمك' : 'Your rating'}
        </p>
        <div role="radiogroup" aria-labelledby="review-stars-label" className="mt-2 flex gap-1" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={ar ? `${n} من ٥` : `${n} of 5`}
              onClick={() => {
                setRating(n)
                setRatingError(null)
              }}
              className="grid size-10 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Star className={cn('size-7', n <= rating ? 'fill-brand text-brand' : 'text-muted-foreground/40')} />
            </button>
          ))}
        </div>
        {ratingError && <p className="mt-1 text-caption text-destructive-strong">{ratingError}</p>}
      </div>
      <Field label={ar ? 'رأيك (اختياري)' : 'Your thoughts (optional)'} htmlFor="review-comment">
        <Textarea id="review-comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
    </FormDialog>
  )
}

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clock, Eye, FileVideo, Pencil, Plus, Trash2 } from 'lucide-react'
import { teacherCoursesApi } from '@/api/endpoints/teacher'
import type { CourseLessonDto, CourseSectionDto } from '@/api/schema'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Switch } from '@/components/ui/primitives'

/**
 * A recorded course's content: its sections (chapters) and the lessons inside
 * them. Everything here is server-owned — after each change the course is
 * re-read rather than patched locally, because the add endpoints return 201
 * without a body.
 */
export function CourseContentSheet({
  courseId,
  courseTitle,
  open,
  onOpenChange,
}: {
  courseId: string | null
  courseTitle?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const queryClient = useQueryClient()
  const showError = useApiErrorToast()
  const { toast } = useToast()

  const course = useQuery({
    queryKey: qk.teacher.course(courseId ?? ''),
    queryFn: () => teacherCoursesApi.details(courseId!),
    enabled: open && Boolean(courseId),
  })

  const [sectionDialog, setSectionDialog] = React.useState<{ section: CourseSectionDto | null } | null>(null)
  const [lessonDialog, setLessonDialog] = React.useState<{
    sectionId: string
    lesson: CourseLessonDto | null
  } | null>(null)
  const [removing, setRemoving] = React.useState<
    { kind: 'section'; item: CourseSectionDto } | { kind: 'lesson'; item: CourseLessonDto } | null
  >(null)

  /** The editor's copy, the dashboard list (lesson counts) and the public page all change. */
  const refresh = React.useCallback(() => {
    if (!courseId) return
    queryClient.invalidateQueries({ queryKey: qk.teacher.course(courseId) })
    queryClient.invalidateQueries({ queryKey: ['teacher', 'courses'] })
    queryClient.invalidateQueries({ queryKey: qk.courses.details(courseId) })
  }, [courseId, queryClient])

  const remove = useMutation({
    mutationFn: () =>
      removing!.kind === 'section'
        ? teacherCoursesApi.removeSection(courseId!, removing!.item.id!)
        : teacherCoursesApi.removeLesson(courseId!, removing!.item.id!),
    onSuccess: () => {
      refresh()
      setRemoving(null)
      toast({ title: ar ? 'اتحذف' : 'Deleted', variant: 'success' })
    },
    onError: showError,
  })

  const sections = [...(course.data?.sections ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const nextSectionOrder = sections.reduce((max, s) => Math.max(max, s.sortOrder ?? 0), 0) + 1

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="end" className="flex w-full max-w-2xl flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border p-5 text-start">
            <SheetTitle>{ar ? 'محتوى الكورس' : 'Course content'}</SheetTitle>
            <SheetDescription className="truncate">{courseTitle}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-5">
            {course.isPending ? (
              <RowSkeleton count={4} />
            ) : course.isError ? (
              <QueryError error={course.error} onRetry={() => course.refetch()} />
            ) : sections.length === 0 ? (
              <EmptyState
                spot="courses"
                title={ar ? 'لسه مفيش أقسام' : 'No sections yet'}
                description={
                  ar
                    ? 'قسّم الكورس لأقسام، وضيف الدروس جوّه كل قسم. الطلاب بيشوفوا الدروس المنشورة بس.'
                    : 'Split the course into sections, then add lessons inside each. Students only see published lessons.'
                }
                action={{ label: ar ? 'أضف أول قسم' : 'Add the first section', onClick: () => setSectionDialog({ section: null }) }}
              />
            ) : (
              <ol className="space-y-4">
                {sections.map((section, index) => {
                  const lessons = [...(section.lessons ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  return (
                    <li key={section.id} className="rounded-lg border border-border bg-card">
                      <div className="flex items-start gap-3 border-b border-border p-4">
                        <span className="tnum grid size-7 shrink-0 place-items-center rounded-md bg-muted text-caption font-semibold text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-body-sm font-semibold text-foreground">{section.title}</p>
                          {section.description && (
                            <p className="mt-0.5 text-caption text-muted-foreground">{section.description}</p>
                          )}
                          <p className="tnum mt-1 text-caption text-muted-foreground">
                            {lessons.length} {ar ? 'درس' : lessons.length === 1 ? 'lesson' : 'lessons'}
                            {(section.durationInMinutes ?? 0) > 0 && ` · ${section.durationInMinutes} ${ar ? 'دقيقة' : 'min'}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={ar ? 'تعديل القسم' : 'Edit section'}
                          onClick={() => setSectionDialog({ section })}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive-strong"
                          aria-label={ar ? 'حذف القسم' : 'Delete section'}
                          onClick={() => setRemoving({ kind: 'section', item: section })}
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <ul className="divide-y divide-border">
                        {lessons.map((lesson) => (
                          <li key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                            <FileVideo className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-body-sm font-medium text-foreground">{lesson.title}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {(lesson.durationInMinutes ?? 0) > 0 && (
                                  <span className="tnum inline-flex items-center gap-1 text-caption text-muted-foreground">
                                    <Clock className="size-3" aria-hidden />
                                    {lesson.durationInMinutes} {ar ? 'د' : 'min'}
                                  </span>
                                )}
                                {lesson.isPreview && (
                                  <Badge variant="accent" size="sm">
                                    <Eye />
                                    {ar ? 'معاينة مجانية' : 'Free preview'}
                                  </Badge>
                                )}
                                {!lesson.isPublished && (
                                  <Badge variant="outline" size="sm">
                                    {ar ? 'مسودة' : 'Draft'}
                                  </Badge>
                                )}
                                {!lesson.videoUrl && (
                                  <Badge variant="warning" size="sm">
                                    {ar ? 'من غير فيديو' : 'No video'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={ar ? 'تعديل الدرس' : 'Edit lesson'}
                              onClick={() => setLessonDialog({ sectionId: section.id!, lesson })}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive-strong"
                              aria-label={ar ? 'حذف الدرس' : 'Delete lesson'}
                              onClick={() => setRemoving({ kind: 'lesson', item: lesson })}
                            >
                              <Trash2 />
                            </Button>
                          </li>
                        ))}
                        <li className="px-4 py-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary"
                            onClick={() => setLessonDialog({ sectionId: section.id!, lesson: null })}
                          >
                            <Plus />
                            {ar ? 'أضف درس' : 'Add lesson'}
                          </Button>
                        </li>
                      </ul>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {sections.length > 0 && (
            <div className="border-t border-border p-4">
              <Button variant="outline" block onClick={() => setSectionDialog({ section: null })}>
                <Plus />
                {ar ? 'أضف قسم' : 'Add section'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {courseId && (
        <SectionDialog
          courseId={courseId}
          state={sectionDialog}
          nextOrder={nextSectionOrder}
          onClose={() => setSectionDialog(null)}
          onSaved={refresh}
        />
      )}
      {courseId && (
        <LessonDialog
          courseId={courseId}
          state={lessonDialog}
          sections={sections}
          onClose={() => setLessonDialog(null)}
          onSaved={refresh}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        tone="danger"
        loading={remove.isPending}
        title={
          removing?.kind === 'section'
            ? ar
              ? 'تحذف القسم؟'
              : 'Delete this section?'
            : ar
              ? 'تحذف الدرس؟'
              : 'Delete this lesson?'
        }
        description={
          removing?.kind === 'section'
            ? ar
              ? `هيتحذف «${removing.item.title}» وكل الدروس اللي جوّاه. مينفعش ترجع في الخطوة دي.`
              : `“${removing.item.title}” and every lesson in it will be deleted. This cannot be undone.`
            : ar
              ? `هيتحذف «${removing?.item.title ?? ''}» نهائيًا.`
              : `“${removing?.item.title ?? ''}” will be deleted permanently.`
        }
        confirmLabel={ar ? 'حذف' : 'Delete'}
        onConfirm={() => remove.mutate()}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */

const wholeNumber = (message: string) =>
  z.string().refine((v) => v.trim() === '' || (/^\d+$/.test(v.trim()) && Number(v) >= 0), message)

type SectionValues = { title: string; description: string; sortOrder: string }

function SectionDialog({
  courseId,
  state,
  nextOrder,
  onClose,
  onSaved,
}: {
  courseId: string
  state: { section: CourseSectionDto | null } | null
  nextOrder: number
  onClose: () => void
  onSaved: () => void
}) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const [formError, setFormError] = React.useState<string | null>(null)
  const section = state?.section ?? null

  const schema = React.useMemo(
    () =>
      z.object({
        title: z.string().trim().min(1, t('validation.required')),
        description: z.string().optional().default(''),
        sortOrder: wholeNumber(t('validation.number')),
      }),
    [t],
  )
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<SectionValues>({
    resolver: zodResolver(schema) as never,
  })

  React.useEffect(() => {
    if (!state) return
    setFormError(null)
    reset({
      title: section?.title ?? '',
      description: section?.description ?? '',
      sortOrder: String(section?.sortOrder ?? nextOrder),
    })
  }, [state, section, nextOrder, reset])

  const save = useMutation({
    mutationFn: (v: SectionValues) => {
      const body = {
        title: v.title.trim(),
        description: optionalText(v.description, !!section?.id),
        sortOrder: Number(v.sortOrder || 0),
      }
      return section?.id
        ? teacherCoursesApi.updateSection(courseId, section.id, body)
        : teacherCoursesApi.addSection(courseId, body)
    },
    onSuccess: () => {
      onSaved()
      onClose()
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError: (error) => setFormError(applyServerErrors<SectionValues>(error, setError, ['title', 'description', 'sortOrder'])),
  })

  return (
    <FormDialog
      open={Boolean(state)}
      onOpenChange={(o) => !o && onClose()}
      title={section ? (ar ? 'تعديل القسم' : 'Edit section') : ar ? 'قسم جديد' : 'New section'}
      error={formError}
      submitting={save.isPending}
      onSubmit={handleSubmit((v) => save.mutate(v))}
      size="md"
    >
      <Field label={ar ? 'اسم القسم' : 'Section title'} htmlFor="section-title" error={errors.title?.message} required>
        <Input id="section-title" {...register('title')} />
      </Field>
      <Field label={ar ? 'وصف قصير' : 'Short description'} htmlFor="section-desc" error={errors.description?.message}>
        <Textarea id="section-desc" rows={3} {...register('description')} />
      </Field>
      <Field label={ar ? 'الترتيب' : 'Order'} htmlFor="section-order" error={errors.sortOrder?.message}>
        <Input id="section-order" inputMode="numeric" dir="ltr" className="tnum w-28" {...register('sortOrder')} />
      </Field>
    </FormDialog>
  )
}

type LessonValues = {
  sectionId: string
  title: string
  description: string
  videoUrl: string
  durationInMinutes: string
  sortOrder: string
  isPreview: boolean
  isPublished: boolean
}

function LessonDialog({
  courseId,
  state,
  sections,
  onClose,
  onSaved,
}: {
  courseId: string
  state: { sectionId: string; lesson: CourseLessonDto | null } | null
  sections: CourseSectionDto[]
  onClose: () => void
  onSaved: () => void
}) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const [formError, setFormError] = React.useState<string | null>(null)
  const lesson = state?.lesson ?? null

  const schema = React.useMemo(
    () =>
      z.object({
        sectionId: z.string().min(1, t('validation.selectOne')),
        title: z.string().trim().min(1, t('validation.required')),
        description: z.string().optional().default(''),
        videoUrl: z
          .string()
          .trim()
          .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), ar ? 'لازم يكون لينك يبدأ بـ http' : 'Must be a link starting with http'),
        durationInMinutes: wholeNumber(t('validation.number')),
        sortOrder: wholeNumber(t('validation.number')),
        isPreview: z.boolean(),
        isPublished: z.boolean(),
      }),
    [t, ar],
  )
  const { register, handleSubmit, reset, setError, watch, setValue, formState: { errors } } = useForm<LessonValues>({
    resolver: zodResolver(schema) as never,
  })

  React.useEffect(() => {
    if (!state) return
    setFormError(null)
    const siblings = sections.find((s) => s.id === state.sectionId)?.lessons ?? []
    reset({
      sectionId: lesson?.sectionId ?? state.sectionId,
      title: lesson?.title ?? '',
      description: lesson?.description ?? '',
      videoUrl: lesson?.videoUrl ?? '',
      durationInMinutes: String(lesson?.durationInMinutes ?? 0),
      sortOrder: String(lesson?.sortOrder ?? siblings.reduce((m, l) => Math.max(m, l.sortOrder ?? 0), 0) + 1),
      isPreview: lesson?.isPreview ?? false,
      isPublished: lesson?.isPublished ?? true,
    })
  }, [state, lesson, sections, reset])

  const save = useMutation({
    mutationFn: (v: LessonValues) => {
      const body = {
        sectionId: v.sectionId,
        title: v.title.trim(),
        description: optionalText(v.description, !!lesson?.id),
        videoUrl: optionalText(v.videoUrl, !!lesson?.id),
        durationInMinutes: Number(v.durationInMinutes || 0),
        sortOrder: Number(v.sortOrder || 0),
        isPreview: v.isPreview,
        isPublished: v.isPublished,
      }
      return lesson?.id
        ? teacherCoursesApi.updateLesson(courseId, lesson.id, body)
        : teacherCoursesApi.addLesson(courseId, body)
    },
    onSuccess: () => {
      onSaved()
      onClose()
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError: (error) =>
      setFormError(
        applyServerErrors<LessonValues>(error, setError, ['title', 'videoUrl', 'durationInMinutes', 'sortOrder', 'sectionId']),
      ),
  })

  return (
    <FormDialog
      open={Boolean(state)}
      onOpenChange={(o) => !o && onClose()}
      title={lesson ? (ar ? 'تعديل الدرس' : 'Edit lesson') : ar ? 'درس جديد' : 'New lesson'}
      error={formError}
      submitting={save.isPending}
      onSubmit={handleSubmit((v) => save.mutate(v))}
      size="lg"
    >
      {lesson && sections.length > 1 && (
        <Field label={ar ? 'القسم' : 'Section'} htmlFor="lesson-section" error={errors.sectionId?.message}>
          <select
            id="lesson-section"
            className="h-10 w-full rounded-md border border-input bg-card px-3 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register('sectionId')}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={ar ? 'عنوان الدرس' : 'Lesson title'} htmlFor="lesson-title" error={errors.title?.message} required>
        <Input id="lesson-title" {...register('title')} />
      </Field>
      <Field label={ar ? 'وصف' : 'Description'} htmlFor="lesson-desc" error={errors.description?.message}>
        <Textarea id="lesson-desc" rows={3} {...register('description')} />
      </Field>
      <Field
        label={ar ? 'لينك الفيديو' : 'Video link'}
        htmlFor="lesson-video"
        error={errors.videoUrl?.message}
        hint={ar ? 'يوتيوب أو أي لينك مباشر للفيديو.' : 'YouTube or any direct video link.'}
      >
        <Input id="lesson-video" dir="ltr" className="text-start font-latin" placeholder="https://" {...register('videoUrl')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={ar ? 'المدة بالدقايق' : 'Duration (minutes)'} htmlFor="lesson-duration" error={errors.durationInMinutes?.message}>
          <Input id="lesson-duration" inputMode="numeric" dir="ltr" className="tnum" {...register('durationInMinutes')} />
        </Field>
        <Field label={ar ? 'الترتيب' : 'Order'} htmlFor="lesson-order" error={errors.sortOrder?.message}>
          <Input id="lesson-order" inputMode="numeric" dir="ltr" className="tnum" {...register('sortOrder')} />
        </Field>
      </div>
      <div className="space-y-3 rounded-lg border border-border p-3.5">
        <label className="flex items-center justify-between gap-3 text-body-sm">
          <span>
            <span className="block font-semibold text-foreground">{ar ? 'معاينة مجانية' : 'Free preview'}</span>
            <span className="block text-caption text-muted-foreground">
              {ar ? 'أي حد يقدر يتفرّج عليه قبل ما يشترك.' : 'Anyone can watch it before enrolling.'}
            </span>
          </span>
          <Switch checked={watch('isPreview')} onCheckedChange={(v) => setValue('isPreview', v)} />
        </label>
        <label className="flex items-center justify-between gap-3 text-body-sm">
          <span>
            <span className="block font-semibold text-foreground">{ar ? 'منشور' : 'Published'}</span>
            <span className="block text-caption text-muted-foreground">
              {ar ? 'الدروس غير المنشورة مبتظهرش للطلاب.' : 'Unpublished lessons are hidden from students.'}
            </span>
          </span>
          <Switch checked={watch('isPublished')} onCheckedChange={(v) => setValue('isPublished', v)} />
        </label>
      </div>
    </FormDialog>
  )
}

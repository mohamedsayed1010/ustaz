import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Plus, Trash2 } from 'lucide-react'
import { teacherProfileApi } from '@/api/endpoints/teacher'
import { isApiError } from '@/api/errors'
import type { SocialLinkInput, TeacherDetailsDto } from '@/api/schema'
import { qk } from '@/lib/query-client'
import { imageUrl } from '@/lib/identity'
import { useI18n } from '@/i18n'
import { useToast } from '@/hooks/use-toast'
import { useApiErrorToast } from '@/hooks/use-api-toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { PanelHeading } from '@/components/common/SectionHeading'

type Platform = SocialLinkInput['platform']
const PLATFORMS: Platform[] = ['Facebook', 'Instagram', 'YouTube', 'TikTok', 'LinkedIn', 'WhatsApp']
const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(v.trim())

/**
 * The parts of a teacher's public profile that live outside the main form:
 * the cover image, achievements and social links. The two lists are replaced
 * wholesale by the API (PUT …/achievements, PUT …/social-links), so each is
 * edited as a local copy and saved in one request.
 */
export function TeacherShowcaseEditor({ profile }: { profile: TeacherDetailsDto }) {
  const queryClient = useQueryClient()
  const refresh = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: qk.teacher.profile })
    if (profile.id) queryClient.invalidateQueries({ queryKey: qk.teachers.details(profile.id) })
  }, [queryClient, profile.id])

  return (
    <>
      <CoverCard profile={profile} onSaved={refresh} />
      <AchievementsCard profile={profile} onSaved={refresh} />
      <SocialLinksCard profile={profile} onSaved={refresh} />
    </>
  )
}

function CoverCard({ profile, onSaved }: { profile: TeacherDetailsDto; onSaved: () => void }) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const showError = useApiErrorToast()
  const input = React.useRef<HTMLInputElement>(null)
  const cover = imageUrl(profile.coverImageUrl)

  const upload = useMutation({
    mutationFn: (file: File) => teacherProfileApi.uploadCover(file),
    onSuccess: () => {
      onSaved()
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError: showError,
  })

  return (
    <Card className="p-6">
      <PanelHeading
        title={ar ? 'صورة الغلاف' : 'Cover image'}
        description={ar ? 'بتظهر أعلى صفحتك العامة. الأفضل صورة عريضة.' : 'Shown across the top of your public page. A wide image works best.'}
      />
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted">
        {cover ? (
          <img src={cover} alt="" className="aspect-[4/1] w-full object-cover" />
        ) : (
          <div className="grid aspect-[4/1] place-items-center text-caption text-muted-foreground">
            {ar ? 'مفيش غلاف لسه' : 'No cover yet'}
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload.mutate(file)
          e.target.value = ''
        }}
      />
      <Button variant="outline" className="mt-4" loading={upload.isPending} onClick={() => input.current?.click()}>
        <ImagePlus />
        {cover ? (ar ? 'تغيير الغلاف' : 'Replace cover') : ar ? 'رفع غلاف' : 'Upload cover'}
      </Button>
    </Card>
  )
}

type AchievementRow = { id?: string | null; title: string; description: string; year: string }

function AchievementsCard({ profile, onSaved }: { profile: TeacherDetailsDto; onSaved: () => void }) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const seed = React.useCallback(
    (): AchievementRow[] =>
      [...(profile.achievements ?? [])]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((a) => ({ id: a.id, title: a.title ?? '', description: a.description ?? '', year: a.year ? String(a.year) : '' })),
    [profile.achievements],
  )
  const [rows, setRows] = React.useState<AchievementRow[]>(seed)
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => setRows(seed()), [seed])

  const save = useMutation({
    mutationFn: () => {
      const thisYear = new Date().getFullYear()
      const bad = rows.find((r) => !r.title.trim() || (r.year && !(/^\d{4}$/.test(r.year) && Number(r.year) <= thisYear + 1)))
      if (bad) throw new Error(ar ? 'كل إنجاز محتاج عنوان، والسنة لازم تكون ٤ أرقام.' : 'Each achievement needs a title, and the year must be four digits.')
      return teacherProfileApi.updateAchievements({
        achievements: rows.map((r, i) => ({
          id: r.id ?? null,
          title: r.title.trim(),
          description: r.description.trim() || null,
          year: r.year ? Number(r.year) : null,
          sortOrder: i,
        })),
      })
    },
    onSuccess: () => {
      setError(null)
      onSaved()
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError: (e) => setError(isApiError(e) ? e.message : (e as Error).message),
  })

  const set = (i: number, patch: Partial<AchievementRow>) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <Card className="p-6">
      <PanelHeading
        title={ar ? 'إنجازات' : 'Achievements'}
        description={ar ? 'جوايز، أوائل، أو أي حاجة تفرق مع ولي الأمر.' : 'Awards, top students, anything a parent would weigh.'}
      />
      <ul className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <li key={row.id ?? `new-${i}`} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_6rem_auto]">
            <Input
              value={row.title}
              onChange={(e) => set(i, { title: e.target.value })}
              placeholder={ar ? 'العنوان' : 'Title'}
              aria-label={ar ? 'عنوان الإنجاز' : 'Achievement title'}
            />
            <Input
              value={row.year}
              onChange={(e) => set(i, { year: e.target.value })}
              placeholder={ar ? 'السنة' : 'Year'}
              inputMode="numeric"
              dir="ltr"
              className="tnum"
              aria-label={ar ? 'السنة' : 'Year'}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive-strong"
              aria-label={ar ? 'حذف' : 'Remove'}
              onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
            <Textarea
              value={row.description}
              onChange={(e) => set(i, { description: e.target.value })}
              rows={2}
              placeholder={ar ? 'تفاصيل (اختياري)' : 'Details (optional)'}
              aria-label={ar ? 'تفاصيل الإنجاز' : 'Achievement details'}
              className="sm:col-span-3"
            />
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-caption text-destructive-strong">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setRows((prev) => [...prev, { title: '', description: '', year: '' }])}>
          <Plus />
          {ar ? 'أضف إنجاز' : 'Add achievement'}
        </Button>
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          {t('common.save')}
        </Button>
      </div>
    </Card>
  )
}

type LinkRow = { platform: Platform; url: string }

function SocialLinksCard({ profile, onSaved }: { profile: TeacherDetailsDto; onSaved: () => void }) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const seed = React.useCallback(
    (): LinkRow[] =>
      [...(profile.socialLinks ?? [])]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((l) => ({ platform: l.platform ?? 'Facebook', url: l.url ?? '' })),
    [profile.socialLinks],
  )
  const [rows, setRows] = React.useState<LinkRow[]>(seed)
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => setRows(seed()), [seed])

  const save = useMutation({
    mutationFn: () => {
      if (rows.some((r) => !isHttpUrl(r.url)))
        throw new Error(ar ? 'كل لينك لازم يبدأ بـ http:// أو https://' : 'Every link must start with http:// or https://')
      return teacherProfileApi.updateSocialLinks({
        links: rows.map((r, i) => ({ platform: r.platform, url: r.url.trim(), sortOrder: i })),
      })
    },
    onSuccess: () => {
      setError(null)
      onSaved()
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError: (e) => setError(isApiError(e) ? e.message : (e as Error).message),
  })

  const set = (i: number, patch: Partial<LinkRow>) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <Card className="p-6">
      <PanelHeading
        title={ar ? 'حساباتك على السوشيال' : 'Social links'}
        description={ar ? 'بتظهر في صفحتك العامة.' : 'Shown on your public page.'}
      />
      <ul className="mt-4 space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex gap-2">
            <select
              value={row.platform}
              onChange={(e) => set(i, { platform: e.target.value as Platform })}
              aria-label={ar ? 'المنصة' : 'Platform'}
              className="h-10 w-36 shrink-0 rounded-md border border-input bg-card px-2 text-body-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Input
              value={row.url}
              onChange={(e) => set(i, { url: e.target.value })}
              placeholder="https://"
              dir="ltr"
              className="flex-1 text-start font-latin"
              aria-label={ar ? 'اللينك' : 'Link'}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive-strong"
              aria-label={ar ? 'حذف' : 'Remove'}
              onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-caption text-destructive-strong">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setRows((prev) => [...prev, { platform: 'Facebook', url: '' }])}>
          <Plus />
          {ar ? 'أضف لينك' : 'Add link'}
        </Button>
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          {t('common.save')}
        </Button>
      </div>
    </Card>
  )
}

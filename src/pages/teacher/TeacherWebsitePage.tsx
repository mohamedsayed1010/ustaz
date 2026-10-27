import * as React from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ExternalLink, Globe, ImagePlus, Pencil, Plus, RefreshCw, Star, Trash2 } from 'lucide-react'
import { tenantApi } from '@/api/endpoints/tenant'
import { isApiError } from '@/api/errors'
import type {
  CreateWebsiteSectionCommand,
  TenantBrandingDto,
  TenantDomainDto,
  TenantWebsiteDto,
  UpdateTenantWebsiteCommand,
  WebsiteSectionDto,
} from '@/api/schema'
import { qk } from '@/lib/query-client'
import { imageUrl } from '@/lib/identity'
import { usePageTitle } from '@/hooks/use-page-title'
import { useToast } from '@/hooks/use-toast'
import { useApiErrorToast } from '@/hooks/use-api-toast'
import { useI18n } from '@/i18n'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { PanelHeading } from '@/components/common/SectionHeading'
import { QueryError } from '@/components/common/QueryBoundary'
import { EmptyState } from '@/components/common/states'
import { FormDialog } from '@/components/common/FormDialog'
import { ConfirmDialog } from '@/components/modals/ConfirmDialog'
import { RowSkeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Switch } from '@/components/ui/primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const HEX = /^#[0-9A-Fa-f]{6}$/
const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(v.trim())
const orNull = (v: string) => (v.trim() ? v.trim() : null)
/*
 * The update endpoints treat null as "leave unchanged" and a blank string as
 * "clear", so edit forms send every field trimmed — an emptied input really clears.
 */
const clearable = (v: string) => v.trim()

const SECTION_TYPES: { value: NonNullable<WebsiteSectionDto['type']>; ar: string; en: string }[] = [
  { value: 'Hero', ar: 'الواجهة', en: 'Hero' },
  { value: 'About', ar: 'عنّا', en: 'About' },
  { value: 'Achievements', ar: 'الإنجازات', en: 'Achievements' },
  { value: 'Testimonials', ar: 'آراء الطلاب', en: 'Testimonials' },
  { value: 'FeaturedGroups', ar: 'مجموعات مميّزة', en: 'Featured groups' },
  { value: 'FeaturedCourses', ar: 'كورسات مميّزة', en: 'Featured courses' },
  { value: 'Teachers', ar: 'المدرّسين', en: 'Teachers' },
  { value: 'Contact', ar: 'التواصل', en: 'Contact' },
  { value: 'Custom', ar: 'مخصّص', en: 'Custom' },
]

/**
 * The workspace's public website: branding (/tenant/branding, logo, cover),
 * content (/tenant/website), sections (/tenant/website/sections) and custom
 * domains (/tenant/domains). The server enforces Website.Manage / Tenant.Manage
 * and the plan's customisation features; refusals surface as the API's message.
 */
export default function TeacherWebsitePage() {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  usePageTitle(ar ? 'الموقع' : 'Website')

  const tenant = useQuery({ queryKey: qk.tenant.self, queryFn: tenantApi.get })
  const slug = tenant.data?.slug

  return (
    <>
      <DashboardHeader
        title={ar ? 'موقعك' : 'Your website'}
        description={
          ar
            ? 'الهوية والمحتوى والدومين بتاع صفحتك العامة.'
            : 'Branding, content and domain for your public page.'
        }
        actions={
          slug ? (
            <Button asChild variant="outline" size="sm">
              <Link to={`/site/${slug}`} target="_blank">
                <ExternalLink className="size-4" />
                {ar ? 'شوف الموقع' : 'View site'}
              </Link>
            </Button>
          ) : undefined
        }
      />
      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">{ar ? 'الهوية' : 'Branding'}</TabsTrigger>
          <TabsTrigger value="content">{ar ? 'المحتوى' : 'Content'}</TabsTrigger>
          <TabsTrigger value="sections">{ar ? 'الأقسام' : 'Sections'}</TabsTrigger>
          <TabsTrigger value="domains">{ar ? 'الدومين' : 'Domains'}</TabsTrigger>
        </TabsList>
        <TabsContent value="branding" className="mt-6">
          <BrandingTab />
        </TabsContent>
        <TabsContent value="content" className="mt-6">
          <ContentTab />
        </TabsContent>
        <TabsContent value="sections" className="mt-6">
          <SectionsTab />
        </TabsContent>
        <TabsContent value="domains" className="mt-6">
          <DomainsTab />
        </TabsContent>
      </Tabs>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Branding                                  */
/* -------------------------------------------------------------------------- */

function BrandingTab() {
  const branding = useQuery({ queryKey: qk.tenant.branding, queryFn: tenantApi.branding })
  if (branding.isPending) return <RowSkeleton count={4} />
  if (branding.isError) return <QueryError error={branding.error} onRetry={() => branding.refetch()} />
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <BrandingForm branding={branding.data} />
      <div className="space-y-6">
        <ImageCard kind="logo" current={branding.data.logoUrl} />
        <ImageCard kind="cover" current={branding.data.coverImageUrl} />
      </div>
    </div>
  )
}

function BrandingForm({ branding }: { branding: TenantBrandingDto }) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    primary: branding.primaryColorHex ?? '#1E3A8A',
    secondary: branding.secondaryColorHex ?? '#0F766E',
    accent: branding.accentColorHex ?? '#F97316',
    font: branding.fontFamily ?? '',
    tagline: branding.tagline ?? '',
    favicon: branding.faviconUrl ?? '',
  })
  const [error, setError] = React.useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = useMutation({
    mutationFn: () =>
      tenantApi.updateBranding({
        primaryColorHex: form.primary,
        secondaryColorHex: form.secondary,
        accentColorHex: form.accent,
        fontFamily: clearable(form.font),
        tagline: clearable(form.tagline),
        faviconUrl: clearable(form.favicon),
      }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: qk.tenant.branding })
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError: (e) => setError(isApiError(e) ? e.message : t('states.errorTitle')),
  })

  const invalid =
    ![form.primary, form.secondary, form.accent].every((c) => HEX.test(c)) ||
    (!!form.favicon.trim() && !isHttpUrl(form.favicon))

  return (
    <Card className="p-6">
      <PanelHeading title={ar ? 'الألوان والخط' : 'Colours and type'} />
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!invalid) save.mutate()
        }}
      >
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['primary', ar ? 'الأساسي' : 'Primary'],
              ['secondary', ar ? 'الثانوي' : 'Secondary'],
              ['accent', ar ? 'المميِّز' : 'Accent'],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} htmlFor={`brand-${key}`}>
              <div className="flex items-center gap-2">
                <input
                  id={`brand-${key}`}
                  type="color"
                  value={HEX.test(form[key]) ? form[key] : '#000000'}
                  onChange={set(key)}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded border border-border bg-transparent"
                />
                <Input dir="ltr" value={form[key]} onChange={set(key)} maxLength={7} className="font-latin" />
              </div>
            </Field>
          ))}
        </div>
        <Field label={ar ? 'الخط' : 'Font family'} htmlFor="brand-font">
          <Input id="brand-font" value={form.font} maxLength={100} onChange={set('font')} placeholder="Cairo" />
        </Field>
        <Field label={ar ? 'الشعار النصّي' : 'Tagline'} htmlFor="brand-tagline">
          <Input id="brand-tagline" value={form.tagline} maxLength={500} onChange={set('tagline')} />
        </Field>
        <Field label={ar ? 'رابط الأيقونة (favicon)' : 'Favicon URL'} htmlFor="brand-favicon">
          <Input id="brand-favicon" dir="ltr" value={form.favicon} onChange={set('favicon')} placeholder="https://" />
        </Field>
        {error && <p className="text-body-sm text-destructive">{error}</p>}
        <Button type="submit" loading={save.isPending} disabled={invalid}>
          {t('common.save')}
        </Button>
      </form>
    </Card>
  )
}

function ImageCard({ kind, current }: { kind: 'logo' | 'cover'; current?: string | null }) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const showError = useApiErrorToast()
  const queryClient = useQueryClient()
  const input = React.useRef<HTMLInputElement>(null)
  const src = imageUrl(current)

  const upload = useMutation({
    mutationFn: (file: File) => (kind === 'logo' ? tenantApi.uploadLogo(file) : tenantApi.uploadCover(file)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tenant.branding })
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError: showError,
  })

  return (
    <Card className="p-6">
      <PanelHeading title={kind === 'logo' ? (ar ? 'اللوجو' : 'Logo') : ar ? 'صورة الغلاف' : 'Cover image'} />
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-muted">
        {src ? (
          <img
            src={src}
            alt=""
            className={kind === 'logo' ? 'mx-auto h-24 object-contain p-3' : 'aspect-[4/1] w-full object-cover'}
          />
        ) : (
          <div className={`grid place-items-center text-caption text-muted-foreground ${kind === 'logo' ? 'h-24' : 'aspect-[4/1]'}`}>
            {ar ? 'مفيش صورة لسه' : 'Nothing uploaded yet'}
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload.mutate(file)
          e.target.value = ''
        }}
      />
      <Button variant="outline" className="mt-4" loading={upload.isPending} onClick={() => input.current?.click()}>
        <ImagePlus />
        {src ? (ar ? 'تغيير' : 'Replace') : ar ? 'رفع' : 'Upload'}
      </Button>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Content                                  */
/* -------------------------------------------------------------------------- */

function ContentTab() {
  const website = useQuery({ queryKey: qk.tenant.website, queryFn: tenantApi.website })
  if (website.isPending) return <RowSkeleton count={6} />
  if (website.isError) return <QueryError error={website.error} onRetry={() => website.refetch()} />
  return <ContentForm website={website.data} />
}

type ContentFields = Required<{ [K in keyof UpdateTenantWebsiteCommand]: string }>

function ContentForm({ website }: { website: TenantWebsiteDto }) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [published, setPublished] = React.useState(!!website.isPublished)
  const [form, setForm] = React.useState<Omit<ContentFields, 'isPublished'>>({
    heroTitle: website.heroTitle ?? '',
    heroSubtitle: website.heroSubtitle ?? '',
    heroImageUrl: website.heroImageUrl ?? '',
    heroCtaLabel: website.heroCtaLabel ?? '',
    heroCtaUrl: website.heroCtaUrl ?? '',
    aboutTitle: website.aboutTitle ?? '',
    aboutBody: website.aboutBody ?? '',
    contactEmail: website.contactEmail ?? '',
    contactPhone: website.contactPhone ?? '',
    contactAddress: website.contactAddress ?? '',
    whatsAppNumber: website.whatsAppNumber ?? '',
    mapEmbedUrl: website.mapEmbedUrl ?? '',
    seoTitle: website.seo?.title ?? '',
    seoDescription: website.seo?.description ?? '',
    seoKeywords: website.seo?.keywords ?? '',
    seoImageUrl: website.seo?.imageUrl ?? '',
    googleAnalyticsId: website.seo?.googleAnalyticsId ?? '',
    facebookPixelId: website.seo?.facebookPixelId ?? '',
  })
  const [error, setError] = React.useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const urlFields = ['heroImageUrl', 'heroCtaUrl', 'mapEmbedUrl', 'seoImageUrl'] as const
  const badUrl = urlFields.find((k) => form[k].trim() && !isHttpUrl(form[k]))

  const save = useMutation({
    mutationFn: () =>
      tenantApi.updateWebsite({
        isPublished: published,
        ...(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, clearable(v)])) as UpdateTenantWebsiteCommand),
      }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: qk.tenant.website })
      toast({ title: t('common.saved'), variant: 'success' })
    },
    onError: (e) => setError(isApiError(e) ? e.message : t('states.errorTitle')),
  })

  const text = (key: keyof typeof form, label: string, max: number, ltr = false) => (
    <Field label={label} htmlFor={`site-${key}`}>
      <Input
        id={`site-${key}`}
        dir={ltr ? 'ltr' : undefined}
        value={form[key]}
        maxLength={max}
        onChange={set(key)}
      />
    </Field>
  )

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        if (!badUrl) save.mutate()
      }}
    >
      <Card className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="font-display text-body font-semibold text-foreground">{ar ? 'نشر الموقع' : 'Publish website'}</p>
          <p className="text-body-sm text-muted-foreground">
            {ar ? 'لو مقفول، الصفحة العامة مش هتظهر لحد.' : 'When off, nobody can open your public page.'}
          </p>
        </div>
        <Switch checked={published} onCheckedChange={setPublished} aria-label={ar ? 'نشر الموقع' : 'Publish website'} />
      </Card>

      <Card className="space-y-4 p-6">
        <PanelHeading title={ar ? 'الواجهة' : 'Hero'} />
        {text('heroTitle', ar ? 'العنوان' : 'Title', 200)}
        {text('heroSubtitle', ar ? 'العنوان الفرعي' : 'Subtitle', 500)}
        {text('heroImageUrl', ar ? 'رابط الصورة' : 'Image URL', 2000, true)}
        <div className="grid gap-4 sm:grid-cols-2">
          {text('heroCtaLabel', ar ? 'نص الزرار' : 'Button label', 100)}
          {text('heroCtaUrl', ar ? 'رابط الزرار' : 'Button URL', 2000, true)}
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <PanelHeading title={ar ? 'عنّا' : 'About'} />
        {text('aboutTitle', ar ? 'العنوان' : 'Title', 200)}
        <Field label={ar ? 'النص' : 'Body'} htmlFor="site-aboutBody">
          <Textarea id="site-aboutBody" rows={5} maxLength={4000} value={form.aboutBody} onChange={set('aboutBody')} />
        </Field>
      </Card>

      <Card className="space-y-4 p-6">
        <PanelHeading title={ar ? 'التواصل' : 'Contact'} />
        <div className="grid gap-4 sm:grid-cols-2">
          {text('contactEmail', ar ? 'الإيميل' : 'Email', 256, true)}
          {text('contactPhone', ar ? 'التليفون' : 'Phone', 20, true)}
          {text('whatsAppNumber', ar ? 'رقم الواتساب' : 'WhatsApp number', 20, true)}
          {text('contactAddress', ar ? 'العنوان' : 'Address', 500)}
        </div>
        {text('mapEmbedUrl', ar ? 'رابط الخريطة' : 'Map embed URL', 2000, true)}
      </Card>

      <Card className="space-y-4 p-6">
        <PanelHeading title="SEO" />
        {text('seoTitle', ar ? 'عنوان الصفحة' : 'Page title', 200)}
        {text('seoDescription', ar ? 'الوصف' : 'Description', 500)}
        {text('seoKeywords', ar ? 'الكلمات المفتاحية' : 'Keywords', 500)}
        {text('seoImageUrl', ar ? 'صورة المشاركة' : 'Share image URL', 2000, true)}
        <div className="grid gap-4 sm:grid-cols-2">
          {text('googleAnalyticsId', 'Google Analytics ID', 50, true)}
          {text('facebookPixelId', 'Facebook Pixel ID', 50, true)}
        </div>
      </Card>

      {(error || badUrl) && (
        <p className="text-body-sm text-destructive">
          {error ?? (ar ? 'فيه رابط لازم يبدأ بـ https://' : 'Links must start with https://')}
        </p>
      )}
      <Button type="submit" loading={save.isPending} disabled={!!badUrl}>
        {t('common.save')}
      </Button>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  Sections                                  */
/* -------------------------------------------------------------------------- */

function SectionsTab() {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const showError = useApiErrorToast()
  const queryClient = useQueryClient()
  const [editing, setEditing] = React.useState<WebsiteSectionDto | 'new' | null>(null)
  const [removing, setRemoving] = React.useState<WebsiteSectionDto | null>(null)

  const sections = useQuery({ queryKey: qk.tenant.sections, queryFn: tenantApi.sections })
  const list = [...(sections.data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.tenant.sections })
    queryClient.invalidateQueries({ queryKey: qk.tenant.website })
  }

  const reorder = useMutation({
    mutationFn: (ids: string[]) => tenantApi.reorderSections(ids),
    onSuccess: refresh,
    onError: showError,
  })
  const toggle = useMutation({
    mutationFn: (s: WebsiteSectionDto) => tenantApi.updateSection(s.id!, { isVisible: !s.isVisible }),
    onSuccess: refresh,
    onError: showError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => tenantApi.removeSection(id),
    onSuccess: () => {
      refresh()
      toast({ title: ar ? 'اتمسح القسم' : 'Section deleted', variant: 'success' })
    },
    onError: showError,
  })

  const move = (index: number, by: -1 | 1) => {
    const ids = list.map((s) => s.id!)
    const [moved] = ids.splice(index, 1)
    ids.splice(index + by, 0, moved)
    reorder.mutate(ids)
  }

  const typeLabel = (type?: string) => {
    const meta = SECTION_TYPES.find((x) => x.value === type)
    return meta ? (ar ? meta.ar : meta.en) : type
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="size-4" />
          {ar ? 'قسم جديد' : 'Add section'}
        </Button>
      </div>
      {sections.isPending ? (
        <RowSkeleton count={4} />
      ) : sections.isError ? (
        <QueryError error={sections.error} onRetry={() => sections.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          spot="courses"
          title={ar ? 'مفيش أقسام لسه' : 'No sections yet'}
          description={ar ? 'الأقسام بتترتّب تحت بعض في صفحتك العامة.' : 'Sections stack down your public page in order.'}
          action={{ label: ar ? 'قسم جديد' : 'Add section', onClick: () => setEditing('new') }}
        />
      ) : (
        <Card className="divide-y divide-border">
          {list.map((s, i) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === 0 || reorder.isPending}
                  onClick={() => move(i, -1)}
                  aria-label={ar ? 'لفوق' : 'Move up'}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={i === list.length - 1 || reorder.isPending}
                  onClick={() => move(i, 1)}
                  aria-label={ar ? 'لتحت' : 'Move down'}
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-body-sm font-semibold text-foreground">
                  {s.title || typeLabel(s.type)}
                </p>
                <Badge variant="outline" size="sm">
                  {typeLabel(s.type)}
                </Badge>
              </div>
              <Switch
                checked={!!s.isVisible}
                onCheckedChange={() => toggle.mutate(s)}
                aria-label={ar ? 'ظاهر' : 'Visible'}
              />
              <Button variant="ghost" size="icon-sm" onClick={() => setEditing(s)} aria-label={ar ? 'تعديل' : 'Edit'}>
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setRemoving(s)} aria-label={ar ? 'مسح' : 'Delete'}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </Card>
      )}

      <SectionDialog
        section={editing}
        nextOrder={list.length}
        onClose={() => setEditing(null)}
        onSaved={refresh}
        typeLabel={typeLabel}
      />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        tone="danger"
        title={ar ? 'تمسح القسم ده؟' : 'Delete this section?'}
        description={ar ? 'مش هيظهر في موقعك تاني.' : 'It will no longer appear on your site.'}
        confirmLabel={ar ? 'مسح' : 'Delete'}
        loading={remove.isPending}
        onConfirm={() => removing?.id && remove.mutate(removing.id)}
      />
    </>
  )
}

function SectionDialog({
  section,
  nextOrder,
  onClose,
  onSaved,
  typeLabel,
}: {
  section: WebsiteSectionDto | 'new' | null
  nextOrder: number
  onClose: () => void
  onSaved: () => void
  typeLabel: (type?: string) => string | undefined
}) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const isNew = section === 'new'
  const existing = section && section !== 'new' ? section : null
  const [type, setType] = React.useState<NonNullable<CreateWebsiteSectionCommand['type']>>('About')
  const [title, setTitle] = React.useState('')
  const [subtitle, setSubtitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [image, setImage] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setType(existing?.type ?? 'About')
    setTitle(existing?.title ?? '')
    setSubtitle(existing?.subtitle ?? '')
    setBody(existing?.body ?? '')
    setImage(existing?.imageUrl ?? '')
    setError(null)
  }, [section]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () => {
      return existing
        ? tenantApi.updateSection(existing.id!, {
            title: clearable(title),
            subtitle: clearable(subtitle),
            body: clearable(body),
            imageUrl: clearable(image),
          })
        : tenantApi.addSection({
            type,
            title: orNull(title),
            subtitle: orNull(subtitle),
            body: orNull(body),
            imageUrl: orNull(image),
            isVisible: true,
            sortOrder: nextOrder,
          })
    },
    onSuccess: () => {
      onSaved()
      onClose()
    },
    onError: (e) => setError(isApiError(e) ? e.message : t('states.errorTitle')),
  })

  const badImage = !!image.trim() && !isHttpUrl(image)

  return (
    <FormDialog
      open={!!section}
      onOpenChange={(open) => !open && onClose()}
      title={isNew ? (ar ? 'قسم جديد' : 'New section') : (ar ? 'تعديل القسم' : 'Edit section')}
      error={error ?? (badImage ? (ar ? 'رابط الصورة لازم يبدأ بـ https://' : 'Image URL must start with https://') : null)}
      submitting={save.isPending}
      submitDisabled={badImage}
      onSubmit={(e) => {
        e.preventDefault()
        if (!badImage) save.mutate()
      }}
    >
      {isNew ? (
        <Field label={ar ? 'النوع' : 'Type'} htmlFor="section-type">
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger id="section-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTION_TYPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {ar ? s.ar : s.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <p className="text-body-sm text-muted-foreground">{typeLabel(existing?.type)}</p>
      )}
      <Field label={ar ? 'العنوان' : 'Title'} htmlFor="section-title">
        <Input id="section-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={ar ? 'العنوان الفرعي' : 'Subtitle'} htmlFor="section-subtitle">
        <Input id="section-subtitle" value={subtitle} maxLength={500} onChange={(e) => setSubtitle(e.target.value)} />
      </Field>
      <Field label={ar ? 'النص' : 'Body'} htmlFor="section-body">
        <Textarea id="section-body" rows={4} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Field label={ar ? 'رابط الصورة' : 'Image URL'} htmlFor="section-image">
        <Input id="section-image" dir="ltr" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://" />
      </Field>
    </FormDialog>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Domains                                  */
/* -------------------------------------------------------------------------- */

function DomainsTab() {
  const { locale, formatDate } = useI18n()
  const ar = locale === 'ar-EG'
  const { toast } = useToast()
  const showError = useApiErrorToast()
  const queryClient = useQueryClient()
  const [adding, setAdding] = React.useState(false)
  const [removing, setRemoving] = React.useState<TenantDomainDto | null>(null)

  const domains = useQuery({ queryKey: qk.tenant.domains, queryFn: tenantApi.domains })
  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.tenant.domains })

  const verify = useMutation({
    mutationFn: (id: string) => tenantApi.verifyDomain(id),
    onSuccess: (d) => {
      refresh()
      toast({
        title:
          d.verificationStatus === 'Verified'
            ? ar ? 'الدومين اتأكد' : 'Domain verified'
            : ar ? 'لسه السجل مش ظاهر' : 'Record not found yet',
        variant: d.verificationStatus === 'Verified' ? 'success' : 'default',
      })
    },
    onError: showError,
  })
  const makePrimary = useMutation({
    mutationFn: (id: string) => tenantApi.updateDomain(id, { isPrimary: true }),
    onSuccess: refresh,
    onError: showError,
  })
  const remove = useMutation({
    mutationFn: (id: string) => tenantApi.removeDomain(id),
    onSuccess: refresh,
    onError: showError,
  })

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          {ar ? 'إضافة دومين' : 'Add domain'}
        </Button>
      </div>
      {domains.isPending ? (
        <RowSkeleton count={2} />
      ) : domains.isError ? (
        <QueryError error={domains.error} onRetry={() => domains.refetch()} />
      ) : (domains.data ?? []).length === 0 ? (
        <EmptyState
          spot="courses"
          title={ar ? 'مفيش دومين خاص' : 'No custom domain'}
          description={
            ar
              ? 'اربط دومين زي www.example.com بموقعك. محتاج باقة فيها دومين خاص.'
              : 'Point a domain like www.example.com at your site. Needs a plan with custom domains.'
          }
          action={{ label: ar ? 'إضافة دومين' : 'Add domain', onClick: () => setAdding(true) }}
        />
      ) : (
        <div className="space-y-4">
          {(domains.data ?? []).map((d) => (
            <Card key={d.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Globe className="size-4 text-muted-foreground" />
                <span className="font-latin font-semibold text-foreground" dir="ltr">
                  {d.host}
                </span>
                {d.isPrimary && (
                  <Badge variant="primary" size="sm">
                    {ar ? 'الأساسي' : 'Primary'}
                  </Badge>
                )}
                <Badge
                  variant={d.verificationStatus === 'Verified' ? 'success' : d.verificationStatus === 'Failed' ? 'destructive' : 'warning'}
                  size="sm"
                >
                  {d.verificationStatusName ?? d.verificationStatus}
                </Badge>
              </div>
              {d.verificationStatus !== 'Verified' && (
                <div className="rounded-lg bg-muted p-3 text-body-sm">
                  <p className="mb-1 text-muted-foreground">
                    {ar ? 'ضيف سجل TXT ده عند مزوّد الدومين:' : 'Add this TXT record at your DNS provider:'}
                  </p>
                  <p className="font-latin break-all text-foreground" dir="ltr">
                    {d.verificationRecordName} → {d.verificationRecordValue}
                  </p>
                  {d.lastVerificationError && <p className="mt-1 text-destructive">{d.lastVerificationError}</p>}
                </div>
              )}
              {d.verifiedAt && (
                <p className="text-caption text-muted-foreground">
                  {ar ? 'اتأكد في ' : 'Verified '}
                  {formatDate(d.verifiedAt, 'd MMM yyyy')}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {d.verificationStatus !== 'Verified' && (
                  <Button size="sm" variant="outline" loading={verify.isPending && verify.variables === d.id} onClick={() => verify.mutate(d.id!)}>
                    <RefreshCw className="size-4" />
                    {ar ? 'تحقّق' : 'Verify'}
                  </Button>
                )}
                {d.verificationStatus === 'Verified' && !d.isPrimary && (
                  <Button size="sm" variant="outline" onClick={() => makePrimary.mutate(d.id!)}>
                    <Star className="size-4" />
                    {ar ? 'اجعله الأساسي' : 'Make primary'}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setRemoving(d)}>
                  <Trash2 className="size-4" />
                  {ar ? 'إزالة' : 'Remove'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AddDomainDialog open={adding} onOpenChange={setAdding} onSaved={refresh} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        tone="danger"
        title={ar ? `تشيل ${removing?.host ?? ''}؟` : `Remove ${removing?.host ?? ''}?`}
        description={ar ? 'الدومين هيبطّل يفتح موقعك.' : 'The domain stops serving your site.'}
        confirmLabel={ar ? 'إزالة' : 'Remove'}
        loading={remove.isPending}
        onConfirm={() => removing?.id && remove.mutate(removing.id)}
      />
    </>
  )
}

const HOST = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))+$/

function AddDomainDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'
  const [host, setHost] = React.useState('')
  const [primary, setPrimary] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setHost('')
    setPrimary(false)
    setError(null)
  }, [open])

  const valid = HOST.test(host.trim()) && host.trim().length <= 253
  const add = useMutation({
    mutationFn: () => tenantApi.addDomain({ host: host.trim().toLowerCase(), makePrimary: primary }),
    onSuccess: () => {
      onSaved()
      onOpenChange(false)
    },
    onError: (e) => setError(isApiError(e) ? e.message : t('states.errorTitle')),
  })

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={ar ? 'إضافة دومين' : 'Add a domain'}
      description={ar ? 'هتحتاج تضيف سجل TXT عشان نتأكد إنه بتاعك.' : 'You will add a TXT record to prove you own it.'}
      error={error}
      submitting={add.isPending}
      submitDisabled={!valid}
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) add.mutate()
      }}
    >
      <Field label={ar ? 'الدومين' : 'Domain'} htmlFor="domain-host" required>
        <Input id="domain-host" dir="ltr" value={host} onChange={(e) => setHost(e.target.value)} placeholder="www.example.com" />
      </Field>
      <label className="flex items-center gap-3 text-body-sm text-foreground">
        <Switch checked={primary} onCheckedChange={setPrimary} />
        {ar ? 'اجعله الدومين الأساسي' : 'Make it the primary domain'}
      </label>
    </FormDialog>
  )
}

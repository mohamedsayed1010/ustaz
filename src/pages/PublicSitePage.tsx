import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { publicSiteApi } from '@/api/endpoints/platform'
import { isApiError } from '@/api/errors'
import { qk } from '@/lib/query-client'
import { imageUrl } from '@/lib/identity'
import { usePageTitle } from '@/hooks/use-page-title'
import { useI18n } from '@/i18n'
import { QueryError } from '@/components/common/QueryBoundary'
import { EmptyState, LoadingState } from '@/components/common/states'
import { SectionHeading } from '@/components/common/SectionHeading'
import { GroupCard } from '@/components/groups/GroupCard'
import { CourseCard } from '@/components/courses/CourseCard'
import { TeacherCard } from '@/components/teachers/TeacherCard'
import { Button } from '@/components/ui/button'

/**
 * A workspace's own public page (/site/:slug): its branding and published
 * website (GET /public/tenants/{slug}), plus its teachers, groups and courses.
 * The tenant payload already carries branding and SEO, so the separate
 * /branding and /seo routes are not needed here.
 */
export default function PublicSitePage() {
  const { slug = '' } = useParams()
  const { t, locale } = useI18n()
  const ar = locale === 'ar-EG'

  const tenant = useQuery({
    queryKey: qk.publicSite.tenant(slug),
    queryFn: () => publicSiteApi.tenant(slug),
    enabled: Boolean(slug),
    retry: (count, error) => !(isApiError(error) && error.status === 404) && count < 2,
  })
  const teachers = useQuery({
    queryKey: qk.publicSite.teachers(slug),
    queryFn: () => publicSiteApi.teachers(slug),
    enabled: tenant.isSuccess,
  })
  const groups = useQuery({
    queryKey: qk.publicSite.groups(slug),
    queryFn: () => publicSiteApi.groups(slug, { PageSize: 6 }),
    enabled: tenant.isSuccess,
  })
  const courses = useQuery({
    queryKey: qk.publicSite.courses(slug),
    queryFn: () => publicSiteApi.courses(slug, { PageSize: 6 }),
    enabled: tenant.isSuccess,
  })

  const d = tenant.data
  const site = d?.website
  const brand = d?.branding
  usePageTitle(site?.seo?.title || d?.displayName || d?.name, site?.seo?.description ?? undefined)

  if (tenant.isPending) return <LoadingState className="py-24" />
  if (tenant.isError) {
    return isApiError(tenant.error) && tenant.error.status === 404 ? (
      <div className="container py-24">
        <EmptyState
          spot="search"
          title={ar ? 'الصفحة دي مش موجودة' : 'This page does not exist'}
          description={ar ? 'يمكن الرابط غلط أو الموقع مش منشور.' : 'The link may be wrong, or the site is not published.'}
          action={{ label: t('nav.teachers'), href: '/teachers' }}
        />
      </div>
    ) : (
      <div className="container py-24">
        <QueryError error={tenant.error} onRetry={() => tenant.refetch()} />
      </div>
    )
  }

  const sections = (site?.sections ?? [])
    .filter((s) => s.isVisible && (s.title || s.body))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const cover = imageUrl(site?.heroImageUrl || brand?.coverImageUrl)
  const logo = imageUrl(brand?.logoUrl)
  const accent = brand?.primaryColorHex

  return (
    <div>
      <section
        className="relative overflow-hidden border-b border-border"
        style={accent ? { backgroundColor: `${accent}14` } : undefined}
      >
        {cover && <img src={cover} alt="" className="absolute inset-0 size-full object-cover opacity-20" />}
        <div className="container relative py-16 lg:py-24">
          {logo && <img src={logo} alt="" className="mb-6 h-16 w-auto object-contain" />}
          <h1 className="font-display text-display-md font-bold text-foreground">
            {site?.heroTitle || d?.displayName || d?.name}
          </h1>
          {(site?.heroSubtitle || brand?.tagline) && (
            <p className="mt-3 max-w-2xl text-body-lg text-muted-foreground">{site?.heroSubtitle || brand?.tagline}</p>
          )}
          {site?.heroCtaLabel && site.heroCtaUrl && (
            <Button asChild className="mt-6" style={accent ? { backgroundColor: accent } : undefined}>
              <a href={site.heroCtaUrl}>{site.heroCtaLabel}</a>
            </Button>
          )}
        </div>
      </section>

      <div className="container space-y-16 py-16">
        {(site?.aboutTitle || site?.aboutBody) && (
          <section className="max-w-3xl">
            <SectionHeading title={site?.aboutTitle || (ar ? 'عنّا' : 'About')} />
            {site?.aboutBody && (
              <p className="mt-4 whitespace-pre-line text-body leading-relaxed text-foreground">{site.aboutBody}</p>
            )}
          </section>
        )}

        {sections.map((s) => (
          <section key={s.id} className="max-w-3xl">
            {s.title && <SectionHeading title={s.title} description={s.subtitle ?? undefined} />}
            {s.imageUrl && <img src={imageUrl(s.imageUrl)} alt="" className="mt-4 w-full rounded-lg object-cover" />}
            {s.body && <p className="mt-4 whitespace-pre-line text-body leading-relaxed text-foreground">{s.body}</p>}
          </section>
        ))}

        {(teachers.data ?? []).length > 0 && (
          <section>
            <SectionHeading title={t('nav.teachers')} />
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(teachers.data ?? []).map((teacher) => (
                <TeacherCard key={teacher.id} teacher={teacher} />
              ))}
            </div>
          </section>
        )}

        {(groups.data?.items ?? []).length > 0 && (
          <section>
            <SectionHeading title={t('nav.groups')} />
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(groups.data?.items ?? []).map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          </section>
        )}

        {(courses.data?.items ?? []).length > 0 && (
          <section>
            <SectionHeading title={t('nav.courses')} />
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(courses.data?.items ?? []).map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        )}

        {(site?.contactEmail || site?.contactPhone || site?.contactAddress || site?.whatsAppLink) && (
          <section>
            <SectionHeading title={ar ? 'تواصل معانا' : 'Get in touch'} />
            <ul className="mt-4 space-y-2 text-body text-foreground">
              {site?.contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  <a href={`tel:${site.contactPhone}`} dir="ltr">{site.contactPhone}</a>
                </li>
              )}
              {site?.contactEmail && (
                <li className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <a href={`mailto:${site.contactEmail}`} className="font-latin">{site.contactEmail}</a>
                </li>
              )}
              {site?.contactAddress && (
                <li className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  {site.contactAddress}
                </li>
              )}
              {site?.whatsAppLink && (
                <li className="flex items-center gap-2">
                  <MessageCircle className="size-4 text-muted-foreground" />
                  <a href={site.whatsAppLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {ar ? 'كلّمنا واتساب' : 'Message us on WhatsApp'}
                  </a>
                </li>
              )}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

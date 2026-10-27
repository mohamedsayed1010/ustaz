import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { EASE_PREMIUM } from '@/lib/motion'
import { LoopThread } from '@/components/home/LoopThread'
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Star,
  Users,
} from 'lucide-react'
import { coursesApi, groupsApi, reviewsApi, teachersApi } from '@/api/endpoints/catalog'
import { billingApi } from '@/api/endpoints/platform'
import { recommendedPlanId, sortPlans, yearlySaving } from '@/lib/plans'
import { qk } from '@/lib/query-client'
import { useSubjects } from '@/hooks/use-taxonomy'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/primitives'
import { SectionHeading } from '@/components/common/SectionHeading'
import { Reveal, RevealGroup, RevealItem } from '@/components/common/Reveal'
import { Counter } from '@/components/common/StatCard'
import { FaqAccordion } from '@/components/common/FaqAccordion'
import { PlanCard } from '@/components/common/PlanCard'
import { ReviewCard } from '@/components/common/ReviewCard'
import { TeacherCard } from '@/components/teachers/TeacherCard'
import { GroupCard } from '@/components/groups/GroupCard'
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton'
import { CardGridSkeleton, Skeleton } from '@/components/ui/skeleton'
import { useHomeFaq } from '@/data/content'
import { SITE } from '@/lib/constants'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*                                 Stats band                                 */
/* -------------------------------------------------------------------------- */

export function StatsBand() {
  const { t, locale } = useI18n()
  const subjects = useSubjects()

  const teachers = useQuery({
    queryKey: qk.teachers.list({ PageSize: 1 }),
    queryFn: () => teachersApi.list({ PageSize: 1 }),
  })
  const groups = useQuery({
    queryKey: qk.groups.list({ PageSize: 1 }),
    queryFn: () => groupsApi.list({ PageSize: 1 }),
  })
  const courses = useQuery({
    queryKey: qk.courses.list({ PageSize: 1 }),
    queryFn: () => coursesApi.list({ PageSize: 1 }),
  })

  const stats = [
    {
      id: 'teachers',
      value: teachers.data?.totalCount ?? 0,
      label: t('common.teachers'),
      description: locale === 'ar-EG' ? 'على المنصة' : 'on the platform',
      icon: GraduationCap,
    },
    {
      id: 'groups',
      value: groups.data?.totalCount ?? 0,
      label: t('common.groups'),
      description: locale === 'ar-EG' ? 'بمواعيد ثابتة' : 'with fixed schedules',
      icon: Users,
    },
    {
      id: 'courses',
      value: courses.data?.totalCount ?? 0,
      label: t('common.courses'),
      description: locale === 'ar-EG' ? 'محتوى مسجّل' : 'recorded content',
      icon: BookOpen,
    },
    {
      id: 'subjects',
      value: subjects.subjects.length,
      label: t('common.subject'),
      description: locale === 'ar-EG' ? 'في كل المراحل' : 'across every stage',
      icon: Star,
    },
  ]

  return (
    <section className="stage stage-deep relative">
      <div className="container-page">
        <RevealGroup
          stagger={0.09}
          className="grid grid-cols-2 border-t border-stage-line lg:grid-cols-4"
        >
          {stats.map((stat, i) => (
            <RevealItem
              key={stat.id}
              variants={statRise}
              className={cn(
                'border-stage-line py-8 ps-5 sm:py-10',
                i % 2 === 1 && 'border-s',
                i >= 2 && 'border-t lg:border-t-0',
                i === 2 && 'lg:border-s',
              )}
            >
              <stat.icon className="size-4 text-primary" aria-hidden />
              <p className="mt-4 font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none text-stage-foreground">
                <Counter value={stat.value} />
              </p>
              <p className="mt-3 text-body-sm font-semibold text-stage-foreground">{stat.label}</p>
              <p className="mt-0.5 text-caption text-stage-muted">{stat.description}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
      {/* The navbar reads this to know where the dark stage ends. */}
      <LoopThread data-stage-end="" />
    </section>
  )
}

export { LoopThread } from '@/components/home/LoopThread'
export { HowItWorks } from '@/components/home/RoleRelay'
export { SubjectsSection } from '@/components/home/SubjectLens'
export { UpcomingClasses } from '@/components/home/ScheduleShowcase'
export { CoursesSection } from '@/components/home/CoursePath'
export { FinalCta } from '@/components/home/ClosingCta'

/** Teacher cards rise and settle, a touch heavier than the default reveal. */
const cardSettle = {
  hidden: { opacity: 0, y: 26, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: EASE_PREMIUM } },
}

const statRise = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_PREMIUM } },
}

/* -------------------------------------------------------------------------- */
/*                             Featured teachers                              */
/* -------------------------------------------------------------------------- */

export function FeaturedTeachers() {
  const { t, locale } = useI18n()

  const teachers = useQuery({
    queryKey: qk.teachers.list({ PageSize: 6, Sort: 'featured' }),
    queryFn: () => teachersApi.list({ PageSize: 6, Sort: 'featured' }),
  })

  const items = teachers.data?.items ?? []
  if (!teachers.isPending && items.length === 0) return null

  return (
    <section className="section-y bg-surface">
      <div className="container-page">
        <SectionHeading
          eyebrow={locale === 'ar-EG' ? 'مدرّسين مميّزين' : 'Featured teachers'}
          title={
            locale === 'ar-EG'
              ? 'مدرّسين بنى كل واحد فيهم اسمه بجد'
              : 'Teachers who built their name for real'
          }
          description={
            locale === 'ar-EG'
              ? 'بروفايلات كاملة بخبرة موثّقة، تقييمات من طلاب حقيقيين، ومواعيد واضحة تقدر تحجز فيها فورًا.'
              : 'Full profiles with verified experience, real student ratings, and times you can book right away.'
          }
          action={{ label: t('common.viewAll'), href: '/teachers' }}
        />

        {teachers.isPending ? (
          <CardGridSkeleton count={3} className="mt-10" />
        ) : (
          <RevealGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 6).map((teacher) => (
              <RevealItem key={teacher.id} className="h-full" variants={cardSettle}>
                <TeacherCard teacher={teacher} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                   Groups                                   */
/* -------------------------------------------------------------------------- */

export function GroupsSection() {
  const { t, locale } = useI18n()

  const groups = useQuery({
    queryKey: qk.groups.list({ PageSize: 6, Sort: 'featured' }),
    queryFn: () => groupsApi.list({ PageSize: 6, Sort: 'featured' }),
  })

  const items = groups.data?.items ?? []
  if (!groups.isPending && items.length === 0) return null

  return (
    <section className="section-y">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('nav.groups')}
          title={
            locale === 'ar-EG'
              ? 'مجموعات بمواعيد ثابتة وأماكن محدودة'
              : 'Groups with fixed times and limited seats'
          }
          description={
            locale === 'ar-EG'
              ? 'اعرف المنهج والمواعيد والسعر والأماكن المتاحة قبل ما تحجز — من غير ما تسأل حد.'
              : 'See the curriculum, schedule, price, and seats left before you book — without asking anyone.'
          }
          action={{ label: t('common.viewAll'), href: '/groups' }}
        />

        {groups.isPending ? (
          <CardGridSkeleton count={3} className="mt-10" />
        ) : (
          <RevealGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((group) => (
              <RevealItem key={group.id} className="h-full">
                <GroupCard group={group} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                             Student reviews                                */
/* -------------------------------------------------------------------------- */

export function StudentReviewsSection() {
  const { locale } = useI18n()
  const isAr = locale === 'ar-EG'

  /* Real, approved reviews written by real students — never invented quotes.
     When the platform has none yet the section simply does not render. */
  const query = useQuery({
    queryKey: qk.reviews.list({ PageSize: 6 }),
    queryFn: () => reviewsApi.list({ PageSize: 6 }),
    staleTime: 5 * 60_000,
  })

  const reviews = (query.data?.items ?? []).filter((r) => r.comment?.trim())

  if (query.isPending) {
    return (
      <section className="section-y bg-surface">
        <div className="container-page">
          <CardGridSkeleton count={3} />
        </div>
      </section>
    )
  }

  if (!reviews.length) return null

  return (
    <section className="section-y bg-surface">
      <div className="container-page">
        <SectionHeading
          eyebrow={isAr ? 'آراء الطلاب' : 'Student reviews'}
          title={isAr ? 'تقييمات من طلاب فعليين' : 'Reviews from real students'}
          description={
            isAr
              ? 'كل تقييم هنا كتبه طالب مشترك فعلًا مع المدرّس، وبيتراجع قبل ما يتنشر.'
              : 'Every review here was written by a student actually enrolled with the teacher, and is moderated before it appears.'
          }
          align="center"
        />

        <RevealGroup className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 6).map((review) => (
            <RevealItem key={review.id} className="h-full">
              <ReviewCard review={review} showTeacher />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                               Pricing preview                              */
/* -------------------------------------------------------------------------- */

export function PricingPreview() {
  const { t, locale } = useI18n()
  const lang: 'ar' | 'en' = locale === 'ar-EG' ? 'ar' : 'en'
  const [yearly, setYearly] = React.useState(false)

  // Same source as the pricing page: the live plan catalogue.
  const plansQuery = useQuery({
    queryKey: qk.billing.plans,
    queryFn: billingApi.plans,
    staleTime: 10 * 60 * 1000,
  })
  const plans = React.useMemo(
    () => sortPlans((plansQuery.data ?? []).filter((p) => p.isActive !== false)),
    [plansQuery.data],
  )
  const highlightId = React.useMemo(() => recommendedPlanId(plans), [plans])
  const anyYearly = plans.some((p) => yearlySaving(p) > 0)

  // Nothing to show and nothing to promise — skip the whole band.
  if (!plansQuery.isPending && plans.length === 0) return null

  return (
    <section className="section-y bg-surface">
      <div className="container-page">
        <SectionHeading
          eyebrow={t('nav.pricing')}
          title={
            locale === 'ar-EG' ? 'باقة واحدة تكفي شغلك كله' : 'One plan that covers your whole practice'
          }
          description={
            locale === 'ar-EG'
              ? 'مفيش نسبة من اشتراكات طلابك. اشتراك شهري ثابت وبس، وتقدر توقفه أي وقت.'
              : 'No commission on your students. A flat monthly subscription you can cancel any time.'
          }
          align="center"
        />

        {anyYearly && (
          <Reveal className="mt-8 flex items-center justify-center gap-3">
            <span className={cn('text-body-sm font-medium', !yearly && 'font-bold text-foreground')}>
              {t('billing.monthly')}
            </span>
            <Switch checked={yearly} onCheckedChange={setYearly} aria-label={t('billing.yearly')} />
            <span className={cn('text-body-sm font-medium', yearly && 'font-bold text-foreground')}>
              {t('billing.yearly')}
            </span>
          </Reveal>
        )}

        {plansQuery.isPending ? (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="flex h-full flex-col gap-4 p-6">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-10 w-36" />
                <div className="mt-2 space-y-2">
                  {[0, 1, 2, 3].map((r) => (
                    <Skeleton key={r} className="h-4 w-11/12" />
                  ))}
                </div>
                <Skeleton className="mt-auto h-11 w-full" />
              </Card>
            ))}
          </div>
        ) : (
          <RevealGroup className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <RevealItem key={plan.id} className="h-full">
                <PlanCard
                  plan={plan}
                  cycle={yearly ? 'yearly' : 'monthly'}
                  lang={lang}
                  popular={plan.id === highlightId}
                />
              </RevealItem>
            ))}
          </RevealGroup>
        )}

        <Reveal className="mt-8 text-center">
          <Link to="/pricing" className="link-underline text-body-sm font-semibold text-primary">
            {locale === 'ar-EG' ? 'شوف مقارنة الباقات بالتفصيل' : 'Compare plans in detail'}
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                                    FAQ                                     */
/* -------------------------------------------------------------------------- */

export function HomeFaq() {
  const { t, locale } = useI18n()
  const homeFaq = useHomeFaq()

  return (
    <section className="section-y">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[0.8fr,1.2fr] lg:gap-16">
          <Reveal>
            <span className="eyebrow">{t('nav.faq')}</span>
            <h2 className="mt-5 text-display-lg text-foreground">
              {locale === 'ar-EG' ? 'أسئلة بتتسأل كتير' : 'Questions we hear a lot'}
            </h2>
            <p className="mt-4 text-body-lg text-muted-foreground">
              {locale === 'ar-EG'
                ? 'لو ملقتش إجابة سؤالك هنا، كلّمنا على واتساب وهنرد عليك بنفسنا.'
                : 'If your question is not here, message us on WhatsApp and we will answer personally.'}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/faq">{t('common.viewAll')}</Link>
              </Button>
              <WhatsAppButton phone={SITE.phone} intent="support" variant="whatsapp-outline">
                {locale === 'ar-EG' ? 'اسأل على واتساب' : 'Ask on WhatsApp'}
              </WhatsAppButton>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <FaqAccordion items={homeFaq} defaultOpen={homeFaq[0]?.id} />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------- */
/*                               Offers strip                                 */
/* -------------------------------------------------------------------------- */

/**
 * Discount codes are teacher-scoped in the API, so the marketing site has no
 * public feed to read. The strip stays out of the homepage until one exists.
 */
export function OffersStrip() {
  const { locale } = useI18n()

  return (
    <section className="border-y border-brand/25 bg-primary-soft py-12 dark:border-brand/30">
      <div className="container-page">
        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <Reveal>
            <span className="eyebrow">
              {locale === 'ar-EG' ? 'أكواد الخصم' : 'Discount codes'}
            </span>
            <h2 className="mt-4 text-heading-lg text-foreground">
              {locale === 'ar-EG'
                ? 'مدرّسك ممكن يبعتلك كود خصم'
                : 'Your teacher can send you a discount code'}
            </h2>
            <p className="mt-2 max-w-md text-body-sm text-muted-foreground">
              {locale === 'ar-EG'
                ? 'اكتب الكود وقت الاشتراك وهتشوف السعر بيتغيّر قدامك على طول.'
                : 'Enter it when you enroll and watch the price update instantly.'}
            </p>
          </Reveal>

          <Button asChild size="lg">
            <Link to="/groups">
              {locale === 'ar-EG' ? 'تصفّح المجموعات' : 'Browse groups'}
              <ArrowRight className="size-4 flip-rtl" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

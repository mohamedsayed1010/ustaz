import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck } from 'lucide-react'
import { groupsApi, teachersApi } from '@/api/endpoints/catalog'
import { qk } from '@/lib/query-client'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { SectionRule } from '@/components/illustrations/CoverArt'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { RoleDot } from '@/components/dashboard/kit'
import { useI18n } from '@/i18n'
import { transitions } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface AuthShellProps {
  title: string
  description: string
  children: React.ReactNode
  /** Rendered under the form — "already have an account?" style links. */
  footer?: React.ReactNode
  /** Which side panel story to show. */
  highlight?: 'teacher' | 'student' | 'parent'
  className?: string
}

const AUDIENCE = {
  teacher: { ar: 'للمدرّسين', en: 'For teachers' },
  student: { ar: 'للطلاب', en: 'For students' },
  parent: { ar: 'لأولياء الأمور', en: 'For parents' },
} as const

const HIGHLIGHTS = {
  teacher: {
    heading: {
      ar: 'بروفايلك جاهز في أقل من نص ساعة',
      en: 'Your profile is live in under half an hour',
    },
    points: {
      ar: [
        'مساحة عمل خاصة بيك بمجموعاتك وكورساتك',
        'مجموعاتك ومواعيدك وأسعارك في مكان واحد',
        'حضور وواجبات وامتحانات ودرجات في نظام واحد',
        'لوحة تحكم بتقولك مستوى شغلك بالأرقام',
      ],
      en: [
        'Your own workspace for groups and courses',
        'Schedules, seats, and pricing in one place',
        'Attendance, homework, exams, and grades together',
        'A dashboard that shows your work in numbers',
      ],
    },
  },
  student: {
    heading: {
      ar: 'لاقي مدرّسك في دقايق مش في أسابيع',
      en: 'Find your teacher in minutes, not weeks',
    },
    points: {
      ar: [
        'قارن بين المدرّسين بالتقييمات والخبرة',
        'شوف المواعيد والأسعار قبل ما تسأل حد',
        'كل حصصك من كل مدرّسينك في جدول واحد',
        'واجباتك وامتحاناتك ودرجاتك مكان واحد',
      ],
      en: [
        'Compare teachers by rating and experience',
        'See times and prices before you ask anyone',
        'Every class from every teacher in one schedule',
        'Homework, exams, and grades in one place',
      ],
    },
  },
  parent: {
    heading: {
      ar: 'تابع مستوى ابنك من غير ما تسأل حد',
      en: "Follow your child's progress without asking anyone",
    },
    points: {
      ar: [
        'حضور كل حصة وغيابها أول بأول',
        'درجات الامتحانات والواجبات من غير وسيط',
        'جدول حصص ابنك وكل مواعيده في مكان واحد',
        'مدفوعاتك وفواتيرك موثّقة ومحفوظة',
      ],
      en: [
        'Attendance for every class, as it happens',
        'Exam and homework marks straight from the teacher',
        "Your child's timetable and every date in one place",
        'Payments and receipts recorded and kept',
      ],
    },
  },
} as const

export function AuthShell({
  title,
  description,
  children,
  footer,
  highlight = 'teacher',
  className,
}: AuthShellProps) {
  const { locale } = useI18n()
  const lang: 'ar' | 'en' = locale === 'ar-EG' ? 'ar' : 'en'
  const story = HIGHLIGHTS[highlight]

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr,minmax(0,34rem)]">
      {/* ------------------------------ Brand panel ------------------------------ */}
      <aside className="relative hidden overflow-hidden bg-spotlight p-12 text-spotlight-foreground lg:flex lg:flex-col">

        {/* One measure for logo, copy and figures so the column reads as a column. */}
        <div className="relative flex w-full max-w-xl flex-1 flex-col">
          <Link to="/" aria-label="أستاذ — الرئيسية">
            <Logo size="lg" tone="mono" className="text-spotlight-foreground" />
          </Link>

          <div className="my-auto py-12">
            <p className="mb-6 flex items-center gap-2 text-caption font-semibold text-spotlight-foreground/70">
              <RoleDot role={highlight} className="size-2.5" />
              {AUDIENCE[highlight][lang]}
            </p>
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={transitions.slow}
              className="text-display-lg text-spotlight-foreground"
            >
              {story.heading[lang]}
            </motion.h2>

            <SectionRule className="my-8 max-w-xs text-spotlight-foreground" />

            <motion.ul
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
              className="space-y-4"
            >
              {story.points[lang].map((point) => (
                <motion.li
                  key={point}
                  variants={{
                    hidden: { opacity: 0, x: 18 },
                    visible: { opacity: 1, x: 0, transition: transitions.base },
                  }}
                  className="flex items-start gap-3 text-body text-spotlight-foreground/80"
                >
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-spotlight-foreground/70" aria-hidden />
                  {point}
                </motion.li>
              ))}
            </motion.ul>
          </div>

          <PlatformFigures lang={lang} />
        </div>
      </aside>

      {/* -------------------------------- Form side ------------------------------- */}
      <main className={cn('relative flex flex-col bg-background', className)}>

        <header className="relative flex items-center justify-between gap-4 p-5 sm:p-8">
          <Link to="/" className="lg:hidden" aria-label="أستاذ — الرئيسية">
            <Logo size="sm" />
          </Link>
          <Link
            to="/"
            className="hidden items-center gap-1.5 text-body-sm text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
          >
            <ArrowLeft className="size-4 flip-rtl" />
            {locale === 'ar-EG' ? 'رجوع للموقع' : 'Back to site'}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <div className="relative flex flex-1 items-center justify-center px-5 pb-12 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitions.base}
            className="w-full max-w-md"
          >
            <h1 className="text-display-lg text-foreground">{title}</h1>
            <p className="mt-3 text-body text-muted-foreground">{description}</p>

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-8">{footer}</div>}
          </motion.div>
        </div>
      </main>
    </div>
  )
}

/**
 * The only social proof on this screen, and it is counted rather than claimed:
 * the live number of teachers and groups on the platform. Renders nothing until
 * the API answers, and nothing at all if the platform is still empty — an
 * invented quote would be worse than no panel.
 */
function PlatformFigures({ lang }: { lang: 'ar' | 'en' }) {
  const { formatNumber } = useI18n()

  const teachers = useQuery({
    queryKey: qk.teachers.list({ PageSize: 1 }),
    queryFn: () => teachersApi.list({ PageSize: 1 }),
    staleTime: 10 * 60_000,
  })
  const groups = useQuery({
    queryKey: qk.groups.list({ PageSize: 1 }),
    queryFn: () => groupsApi.list({ PageSize: 1 }),
    staleTime: 10 * 60_000,
  })

  const figures = [
    {
      value: teachers.data?.totalCount ?? 0,
      label: lang === 'ar' ? 'مدرّس على المنصة' : 'teachers on the platform',
    },
    {
      value: groups.data?.totalCount ?? 0,
      label: lang === 'ar' ? 'مجموعة بمواعيد معلنة' : 'groups with published times',
    },
  ].filter((f) => f.value > 0)

  if (!figures.length) return null

  return (
    <motion.dl
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transitions.slow, delay: 0.3 }}
      className="relative grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-spotlight-foreground/15 bg-spotlight-foreground/15"
    >
      {figures.map((figure) => (
        <div key={figure.label} className="bg-spotlight p-6">
          <dt className="sr-only">{figure.label}</dt>
          <dd>
            <span className="tnum block font-display text-display-lg leading-none text-spotlight-foreground">
              {formatNumber(figure.value)}
            </span>
            <span className="mt-2 block text-caption text-spotlight-foreground/65">
              {figure.label}
            </span>
          </dd>
        </div>
      ))}
    </motion.dl>
  )
}

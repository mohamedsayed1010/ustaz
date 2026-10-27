import { Link } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { scheduleApi, teachersApi } from '@/api/endpoints/catalog'
import { qk } from '@/lib/query-client'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/illustrations/PersonAvatar'
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton'
import { LoopStage } from '@/components/home/LoopStage'
import { avatarTraitsFor, imageUrl } from '@/lib/identity'
import { EASE_PREMIUM } from '@/lib/motion'
import { SITE } from '@/lib/constants'

/**
 * The homepage opening — a midnight-navy stage in both themes
 * (a navy band — see .stage in globals.css). Copy enters in reading order
 * (eyebrow, headline word by word, promise, actions); the loop on the other
 * side assembles itself beside it and then keeps quietly working.
 */
export function Hero() {
  const { t, locale, formatNumber } = useI18n()
  const ar = locale === 'ar-EG'
  const reduce = useReducedMotion() ?? false

  const featured = useQuery({
    queryKey: qk.teachers.list({ PageSize: 5, Sort: 'featured' }),
    queryFn: () => teachersApi.list({ PageSize: 5, Sort: 'featured' }),
  })

  const upcoming = useQuery({
    queryKey: qk.schedule.upcoming,
    queryFn: () => scheduleApi.upcoming(1),
  })

  const teachers = featured.data?.items ?? []

  /* Headline as words, so it can arrive word by word. Arabic letters join
     inside a word, so splitting on spaces never breaks a ligature. */
  const lead = ar ? 'كل اللي محتاجه عشان تبني' : 'Everything you need to build your'
  const mark = ar ? 'اسمك' : 'name'
  const tail = ar ? 'كمدرّس.' : 'as a teacher.'
  const words = [...lead.split(' ').map((w) => ({ w, mark: false })), { w: mark, mark: true }, ...tail.split(' ').map((w) => ({ w, mark: false }))]

  const sequence: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.06, delayChildren: 0.05 } },
  }
  const rise: Variants = reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_PREMIUM } },
      }
  const word: Variants = reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: '0.45em' },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_PREMIUM } },
      }

  return (
    <section className="stage relative overflow-hidden">

      <div className="container-page relative">
        <div className="grid items-center gap-10 pb-14 pt-12 sm:pb-20 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:pb-24 lg:pt-20">
          {/* ---------------------------- Copy ---------------------------- */}
          <motion.div variants={sequence} initial="hidden" animate="visible" className="max-w-xl">
            <motion.p variants={rise} className="eyebrow">
              {ar ? 'المدرّس، الطالب، وولي الأمر — في مكان واحد' : 'Teacher, student and parent — in one place'}
            </motion.p>

            <motion.h1
              variants={sequence}
              className="mt-6 text-display-2xl text-stage-foreground"
              aria-label={`${lead} ${mark} ${tail}`}
            >
              {words.map(({ w, mark: isMark }, i) => (
                <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom" aria-hidden>
                  <motion.span variants={word} className="relative inline-block">
                    {isMark ? (
                      /* emphasis is a soft-orange highlighter band that draws in behind
                         the word while the word inks itself deep navy (.hero-mark) */
                      <span className="hero-mark relative isolate inline-block px-[0.14em] pt-[0.14em]">
                        <motion.span
                          aria-hidden
                          className="absolute inset-0 -z-10 origin-[var(--o)] rounded-[0.16em] bg-brand"
                          style={{ '--o': ar ? 'right' : 'left' } as React.CSSProperties}
                          initial={reduce ? false : { scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.7, delay: 1.1, ease: EASE_PREMIUM }}
                        />
                        {w}
                      </span>
                    ) : (
                      w
                    )}
                  </motion.span>
                  {i < words.length - 1 && ' '}
                </span>
              ))}
            </motion.h1>

            <motion.p variants={rise} className="mt-6 max-w-lg text-body-lg text-stage-muted">
              {ar
                ? 'اعرض خبرتك ونظّم مجموعاتك — وكل حضور وواجب ودرجة بتسجّلها بتوصل للطالب ولولي أمره في نفس اللحظة.'
                : 'Show your experience and run your groups — and every attendance mark, assignment and grade you record reaches the student and their parent the moment you save it.'}
            </motion.p>

            <motion.div variants={rise} className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="group">
                <Link to="/register">
                  {ar ? 'ابدأ مجانًا' : 'Start free'}
                  <ArrowRight className="flip-rtl transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="inverse">
                <Link to="/teachers">{t('nav.teachers')}</Link>
              </Button>
              <WhatsAppButton
                phone={SITE.phone}
                intent="send-inquiry"
                size="lg"
                variant="ghost"
                className="text-stage-foreground hover:bg-stage-foreground/[0.08] hover:text-stage-foreground"
              >
                {ar ? 'كلّمنا على واتساب' : 'Message us on WhatsApp'}
              </WhatsAppButton>
            </motion.div>

            {teachers.length > 0 && (
              <motion.div
                variants={rise}
                className="mt-10 flex items-center gap-3 border-t border-stage-line pt-6"
              >
                <div className="flex -space-x-2.5 rtl:space-x-reverse">
                  {teachers.slice(0, 4).map((teacher) => (
                    <Avatar
                      key={teacher.id}
                      traits={avatarTraitsFor(teacher.id ?? '')}
                      seed={teacher.id ?? ''}
                      name={teacher.displayName ?? ''}
                      src={imageUrl(teacher.profileImageUrl)}
                      size="sm"
                      className="ring-2 ring-stage"
                    />
                  ))}
                </div>
                <p className="text-body-sm text-stage-muted">
                  <span className="tnum font-semibold text-stage-foreground">
                    {formatNumber(featured.data?.totalCount ?? 0)} {t('common.teachers')}
                  </span>{' '}
                  {ar ? 'بنوا بروفايلهم على أستاذ' : 'have built their profile on USTAZ'}
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* --------------------------- The loop --------------------------- */}
          <LoopStage teacher={teachers[0]} nextSession={upcoming.data?.[0]} />
        </div>
      </div>
    </section>
  )
}

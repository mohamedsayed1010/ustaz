import * as React from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'framer-motion'
import { ArrowRight, Heart, MapPin, Quote, ShieldCheck, Smartphone, Wallet } from 'lucide-react'
import { useAboutTimeline, useAboutValues } from '@/data/content'
import { useI18n } from '@/i18n'
import { usePageTitle } from '@/hooks/use-page-title'
import { PageHeader } from '@/components/common/PageHeader'
import { PanelHeading } from '@/components/common/SectionHeading'
import { Reveal, RevealGroup, RevealItem } from '@/components/common/Reveal'
import { StatsBand } from '@/components/home/sections'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/brand/Logo'
import { SectionRule } from '@/components/illustrations/CoverArt'
import { WhatsAppButton } from '@/components/whatsapp/WhatsAppButton'
import { SITE } from '@/lib/constants'
import { useEnteredView, useMotionSafe } from '@/hooks/use-motion'
import { cn } from '@/lib/utils'

const VALUE_ICONS = [Heart, Wallet, Smartphone, ShieldCheck]

export default function AboutPage() {
  const { locale } = useI18n()
  const isAr = locale === 'ar-EG'
  const aboutValues = useAboutValues()
  const aboutTimeline = useAboutTimeline()

  usePageTitle(
    isAr ? 'عن أستاذ' : 'About USTAZ',
    isAr
      ? 'إحنا مين وليه بنبني منصة أستاذ للمدرّسين المصريين.'
      : 'Who we are, and why we build USTAZ for Egypt’s teachers.',
  )

  return (
    <>
      <PageHeader
        eyebrow={isAr ? 'عن المنصة' : 'About us'}
        title={
          isAr
            ? 'بنبني أدوات تخلي المدرّس يبان بأحسن صورة'
            : 'We build tools that show a teacher at their best'
        }
        description={
          isAr
            ? 'أستاذ بدأت من ملاحظة واحدة: أحسن المدرّسين في مصر مالهمش أي وجود رقمي محترم — غير جروب واتساب وبوست على فيسبوك.'
            : 'USTAZ began with one observation: Egypt’s best teachers had no real digital presence — just a WhatsApp group and a Facebook post.'
        }
        crumbs={[
          { label: isAr ? 'الرئيسية' : 'Home', href: '/' },
          { label: isAr ? 'عن أستاذ' : 'About' },
        ]}
      />

      {/* Story */}
      <section className="section-y">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-[1.15fr,1fr] lg:gap-16">
            <Reveal>
              <PanelHeading title={isAr ? 'القصة' : 'The story'} />
              <div className="mt-5 space-y-4 text-body-lg leading-[2] text-foreground/85">
                {(isAr
                  ? [
                      'في مصر، المدرّس الكويس بيتعرف بالسمعة: طالب بيقول لطالب، وولي أمر بيقول لولي أمر. السمعة دي ثروة حقيقية، بس مفيش مكان بتتجمّع فيه.',
                      'النتيجة إن مدرّس عنده ٢٠ سنة خبرة وآلاف الطلبة، لما حد يسأل عنه بيلاقي رقم تليفون وبوست قديم. والطالب اللي بيدوّر على مدرّس بيفضل يسأل أصحابه واحد واحد.',
                      'أستاذ بتحل المشكلة دي من الناحيتين: بتدّي المدرّس موقع شخصي محترم بيعرض خبرته وطريقته ومجموعاته ومواعيده، وبتدّي الطالب مكان يقارن فيه ويختار بثقة.',
                    ]
                  : [
                      'In Egypt a good teacher is known by reputation: one student tells another, one parent tells the next. That reputation is real wealth, but it has nowhere to gather.',
                      'So a teacher with twenty years of experience and thousands of students is represented, when anyone asks, by a phone number and an old post. And the student looking for a teacher keeps asking friends one at a time.',
                      'USTAZ solves that from both sides: it gives the teacher a proper page showing their experience, approach, groups, and times — and gives the student somewhere to compare and choose with confidence.',
                    ]
                ).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <SectionRule className="my-8 max-w-sm" />

              <blockquote className="relative rounded-xl border border-border bg-card p-6">
                <Quote className="absolute -top-3 start-5 size-10 rotate-180 text-brand/20" aria-hidden />
                <p className="relative text-body-lg leading-[1.95] text-foreground/90">
                  {isAr
                    ? 'إحنا مش بنبيع كورسات وماخدناش نسبة من اشتراك أي طالب. إحنا بنبيع للمدرّس أداة تخليه يشتغل أحسن — وبس.'
                    : 'We do not sell courses, and we have never taken a cut of any student’s fee. We sell teachers a tool that helps them work better — that is all.'}
                </p>
                <footer className="relative mt-4 flex items-center gap-2 text-caption text-muted-foreground">
                  <Logo variant="mark" size="sm" />
                  {isAr ? 'فريق أستاذ' : 'The USTAZ team'}
                </footer>
              </blockquote>
            </Reveal>

            <Reveal delay={0.08}>
              <Card className="relative overflow-hidden p-8">
                <div className="relative">
                  <Logo size="xl" />

                  <p className="mt-8 text-body leading-[1.95] text-muted-foreground">
                    {isAr ? (
                      <>
                        اسم المنصة هو أبسط كلمة بيقولها طالب مصري لمدرّسه:{' '}
                        <strong className="text-foreground">أستاذ</strong>. وده بالظبط اللي بنحاول
                        نحميه — العلاقة الشخصية دي، مش نستبدلها بمنصة باردة.
                      </>
                    ) : (
                      <>
                        The name is the simplest word an Egyptian student says to their teacher:{' '}
                        <strong className="text-foreground">ustaz</strong>. That relationship is
                        exactly what we are trying to protect, not replace with a cold platform.
                      </>
                    )}
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-muted/40 p-4">
                      <p className="text-caption text-muted-foreground">
                        {isAr ? 'الشعار' : 'The mark'}
                      </p>
                      <p className="mt-1.5 text-body-sm leading-relaxed text-foreground/90">
                        {isAr
                          ? 'تلات نقط متوصّلة: المدرّس فوق، والطالب وولي الأمر تحت — ومع بعض بيرسموا حرف «أ».'
                          : 'Three connected nodes: the teacher on top, the student and parent below — together they draw the letter A / أ.'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/40 p-4">
                      <p className="text-caption text-muted-foreground">
                        {isAr ? 'المقر' : 'Office'}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-body-sm text-foreground/90">
                        <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                        {isAr ? SITE.addressAr : SITE.addressEn}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Stats — read live from the platform rather than hard-coded. */}
      <StatsBand />

      {/* Values */}
      <section className="section-y">
        <div className="container-page">
          <PanelHeading
            title={isAr ? 'المبادئ اللي بنشتغل بيها' : 'The principles we work by'}
            description={
              isAr
                ? 'القرارات الصعبة بنرجّعها دايمًا للأربع نقاط دول.'
                : 'We take the hard decisions back to these four points every time.'
            }
          />

          <RevealGroup className="mt-8 grid gap-5 sm:grid-cols-2">
            {aboutValues.map((v, i) => {
              const Icon = VALUE_ICONS[i % VALUE_ICONS.length]
              return (
                <RevealItem key={v.id}>
                  <Card className="h-full p-6">
                    <span className="grid size-11 place-items-center rounded-xl border border-primary/20 bg-primary-soft text-primary">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-5 font-display text-heading-sm text-foreground">{v.title}</h3>
                    <p className="mt-2.5 text-body-sm leading-[1.9] text-muted-foreground">
                      {v.description}
                    </p>
                  </Card>
                </RevealItem>
              )
            })}
          </RevealGroup>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-y bg-surface">
        <div className="container-page">
          <PanelHeading
            title={isAr ? 'المحطات' : 'Milestones'}
            description={
              isAr ? 'من فكرة لمنصة كاملة للمدرّس.' : 'From an observation to a full platform.'
            }
          />

          <MilestoneRail items={aboutTimeline} />
        </div>
      </section>

      {/* CTA */}
      <section className="section-y">
        <div className="container-page">
          <Reveal>
            <Card className="relative overflow-hidden border-transparent bg-spotlight p-8 text-spotlight-foreground sm:p-12">
              <div className="relative grid gap-8 lg:grid-cols-[1.2fr,1fr] lg:items-center">
                <div>
                  <h2 className="text-display-lg text-spotlight-foreground">
                    {isAr
                      ? 'عايز تعرف أكتر أو عندك اقتراح؟'
                      : 'Want to know more, or have an idea?'}
                  </h2>
                  <p className="mt-4 max-w-lg text-body-lg text-spotlight-foreground/75">
                    {isAr
                      ? 'إحنا بنبني المنتج ده مع المدرّسين مش لوحدنا. لو عندك ملاحظة أو فكرة، كلّمنا مباشرة.'
                      : 'We build this with teachers, not on our own. If you have a thought or a suggestion, tell us directly.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Button asChild size="lg">
                    <Link to="/contact">
                      {isAr ? 'تواصل معانا' : 'Contact us'}
                      <ArrowRight className="size-4 flip-rtl" />
                    </Link>
                  </Button>
                  <WhatsAppButton phone={SITE.phone} intent="support" size="lg">
                    {isAr ? 'واتساب' : 'WhatsApp'}
                  </WhatsAppButton>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>
    </>
  )
}

type TimelineItem = ReturnType<typeof useAboutTimeline>[number]

/**
 * Milestones on a rail that fills as you read. The orange line is tied to
 * scroll position — it is a reading gauge, not a decoration — and each year
 * marker switches on as the line reaches it.
 */
function MilestoneRail({ items }: { items: TimelineItem[] }) {
  const { reduce } = useMotionSafe()
  const ref = React.useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 70%', 'end 70%'] })
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 })

  return (
    <div ref={ref} className="relative mt-10">
      <span className="absolute inset-y-0 start-[1.375rem] w-px bg-border sm:start-1/2" aria-hidden />
      <motion.span
        aria-hidden
        className="absolute inset-y-0 start-[calc(1.375rem-0.5px)] w-0.5 origin-top bg-brand sm:start-[calc(50%-0.5px)]"
        style={{ scaleY: reduce ? 1 : fill }}
      />

      <ol className="space-y-8">
        {items.map((item, i) => (
          <Milestone key={item.id} item={item} flip={i % 2 === 1} reduce={reduce} />
        ))}
      </ol>
    </div>
  )
}

function Milestone({ item, flip, reduce }: { item: TimelineItem; flip: boolean; reduce: boolean }) {
  const ref = React.useRef<HTMLLIElement>(null)
  /* lights when the marker crosses the same line the rail is filling to */
  const reached = useEnteredView(ref, '0px 0px -30% 0px') || reduce

  return (
    <li ref={ref}>
      <div
        className={
          flip
            ? 'relative flex gap-6 sm:ms-auto sm:w-1/2 sm:flex-row-reverse sm:ps-10 sm:text-end'
            : 'relative flex gap-6 sm:w-1/2 sm:pe-10'
        }
      >
        <span
          className={cn(
            'tnum relative z-10 grid size-11 shrink-0 place-items-center rounded-full border text-caption font-semibold shadow-soft transition-colors duration-500 sm:absolute sm:top-0',
            /* the marker sits on the centre rail: the inner edge of whichever half it's in */
            flip ? 'sm:-start-5' : 'sm:-end-[1.375rem]',
            reached ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-card text-muted-foreground',
          )}
        >
          {item.year.slice(-2)}
        </span>

        <motion.div
          className="flex-1 sm:ms-8"
          initial={reduce ? false : { opacity: 0, x: flip ? -16 : 16 }}
          animate={reached ? { opacity: 1, x: 0 } : undefined}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card className="p-5">
            <Badge size="sm" className="tnum">
              {item.year}
            </Badge>
            <h3 className="mt-3 font-display text-body font-bold text-foreground">{item.title}</h3>
            <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </Card>
        </motion.div>
      </div>
    </li>
  )
}

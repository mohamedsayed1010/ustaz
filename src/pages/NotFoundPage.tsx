import * as React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionRule } from '@/components/illustrations/CoverArt'
import { usePageTitle } from '@/hooks/use-page-title'
import { MAIN_NAV } from '@/lib/constants'
import { EASE_DRAW } from '@/lib/motion'
import { useMotionSafe } from '@/hooks/use-motion'

export default function NotFoundPage() {
  usePageTitle('الصفحة مش موجودة')
  const { pathname } = useLocation()
  /* This page is also the catch-all inside the role consoles, where nothing decorative moves. */
  const inConsole = /^\/(student|teacher|parent|admin)(\/|$)/.test(pathname)
  const [mended, setMended] = React.useState(false)
  const mend = inConsole
    ? {}
    : {
        onMouseEnter: () => setMended(true),
        onMouseLeave: () => setMended(false),
        onFocus: () => setMended(true),
        onBlur: () => setMended(false),
      }

  return (
    <section className="relative flex min-h-[70dvh] items-center overflow-hidden py-section">

      <div className="container-page relative">
        <div className="mx-auto max-w-2xl text-center">
          <BrokenLoop mended={mended} still={inConsole} />

          <p className="tnum mt-6 font-display text-[clamp(4rem,14vw,8rem)] font-semibold leading-none text-primary">
            404
          </p>

          <h1 className="mt-2 text-display-lg text-foreground">الصفحة دي مش موجودة</h1>

          <p className="mt-4 text-body-lg text-muted-foreground">
            يمكن اللينك اتغيّر أو اتكتب غلط. تقدر ترجع للرئيسية أو تدوّر على اللي محتاجه من هنا.
          </p>

          <SectionRule className="mx-auto mt-8 max-w-xs" />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" {...mend}>
              <Link to="/">
                <Home className="size-4" />
                الرجوع للرئيسية
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/teachers">
                <Search className="size-4" />
                دوّر على مدرّس
              </Link>
            </Button>
          </div>

          <div className="mt-12">
            <p className="text-caption text-muted-foreground">أو جرّب الصفحات دي</p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {MAIN_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-body-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                  >
                    {item.label}
                    <ArrowLeft className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * The USTAZ loop with one link missing — teacher, student and parent are all
 * there, but the way back to the teacher stops short. Pointing at the way home
 * closes it. A small, honest picture of "this link goes nowhere".
 */
function BrokenLoop({ mended, still }: { mended: boolean; still: boolean }) {
  const reduce = useMotionSafe().reduce || still
  const T = { x: 120, y: 22 }
  const S = { x: 34, y: 150 }
  const P = { x: 206, y: 150 }
  const edge = (a: typeof T, b: typeof T) => `M${a.x} ${a.y} L${b.x} ${b.y}`
  const draw = (delay: number) =>
    reduce
      ? { initial: false as const, animate: { pathLength: 1 } }
      : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.7, delay, ease: EASE_DRAW } }

  return (
    <svg viewBox="0 0 240 172" className="mx-auto h-36 w-auto overflow-visible" aria-hidden>
      <path d={edge(T, S)} stroke="hsl(var(--border))" strokeWidth={6} strokeLinecap="round" fill="none" />
      <path d={edge(S, P)} stroke="hsl(var(--border))" strokeWidth={6} strokeLinecap="round" fill="none" />
      <path d={edge(P, T)} stroke="hsl(var(--border))" strokeWidth={6} strokeLinecap="round" strokeDasharray="1 10" fill="none" />

      <motion.path d={edge(T, S)} stroke="hsl(var(--role-teacher))" strokeWidth={2} strokeLinecap="round" fill="none" {...draw(0.1)} />
      <motion.path d={edge(S, P)} stroke="hsl(var(--role-student))" strokeWidth={2} strokeLinecap="round" fill="none" {...draw(0.7)} />
      {/* the broken link — stops short, and completes while the way home is pointed at */}
      <motion.path
        d={edge(P, T)}
        stroke="hsl(var(--role-parent))"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: mended ? 1 : 0.42 }}
        transition={reduce ? { duration: 0 } : { duration: mended ? 0.5 : 0.7, delay: mended ? 0 : 1.3, ease: EASE_DRAW }}
      />

      {([
        [S, 'var(--role-student)', 0.1],
        [P, 'var(--role-parent)', 0.7],
      ] as const).map(([n, c, d]) => (
        <motion.circle
          key={c}
          cx={n.x}
          cy={n.y}
          r={9}
          fill={`hsl(${c})`}
          initial={reduce ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18, delay: d + 0.5 }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      ))}
      {/* the teacher waits, dimmed, until the loop is whole again */}
      <motion.circle
        cx={T.x}
        cy={T.y}
        r={11}
        fill="hsl(var(--role-teacher))"
        initial={reduce ? false : { scale: 0 }}
        animate={{ scale: mended ? 1.12 : 1, opacity: mended ? 1 : 0.45 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
    </svg>
  )
}

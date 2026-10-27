import * as React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { BadgeCheck, Bell, CalendarCheck, ClipboardCheck, GraduationCap } from 'lucide-react'
import type { ScheduleSlotDto, TeacherListItemDto } from '@/api/schema'
import { LogoMark } from '@/components/brand/Logo'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { EASE_PREMIUM } from '@/lib/motion'

/**
 * The hero's visual: USTAZ's idea drawn as a working diagram.
 *
 * Three nodes — teacher, student, parent — sit on a curved triangle around a
 * slowly turning timeline ring. Small packets of information travel the loop
 * in one direction: what the teacher records reaches the student, what the
 * student does reaches the parent, and the parent's questions return to the
 * teacher. The teacher and the next class shown in the cards are live API
 * data; the rest is labelled by kind ("grade recorded"), never by invented
 * values.
 *
 * Motion budget: one entrance sequence (paths draw, nodes settle, cards rise),
 * then only cheap continuous motion — SVG packets on their paths, a 120s ring
 * rotation, a breathing halo per node. Everything is transform/opacity, and
 * all of it is dropped under prefers-reduced-motion.
 */

const W = 600
const H = 600
const CENTER = { x: 300, y: 292 }

type RoleKey = 'teacher' | 'student' | 'parent'

const ROLE_STROKE: Record<RoleKey, string> = {
  teacher: 'hsl(var(--role-teacher))',
  student: 'hsl(var(--role-student))',
  parent: 'hsl(var(--role-parent))',
}

const ROLE_BG: Record<RoleKey, string> = {
  teacher: 'bg-role-teacher',
  student: 'bg-role-student',
  parent: 'bg-role-parent',
}

/** A quadratic curve from a to b that bows away from the loop's centre. */
function bow(a: { x: number; y: number }, b: { x: number; y: number }, amount = 46) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = mx - CENTER.x
  const dy = my - CENTER.y
  const len = Math.hypot(dx, dy) || 1
  const cx = mx + (dx / len) * amount
  const cy = my + (dy / len) * amount
  return {
    d: `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`,
    /* The curve's own midpoint (t = 0.5) — where its flow label sits. */
    mid: { x: 0.25 * a.x + 0.5 * cx + 0.25 * b.x, y: 0.25 * a.y + 0.5 * cy + 0.25 * b.y },
  }
}

const pct = (v: number, total: number) => `${(v / total) * 100}%`

export function LoopStage({
  teacher,
  nextSession,
}: {
  teacher?: TeacherListItemDto
  nextSession?: ScheduleSlotDto
}) {
  const { locale, isRtl } = useI18n()
  const ar = locale === 'ar-EG'
  const reduce = useReducedMotion() ?? false
  const uid = React.useId().replace(/:/g, '')

  /* The loop reads with the language: in Arabic the student sits on the right. */
  const nodes = React.useMemo(() => {
    const left = { x: 92, y: 446 }
    const right = { x: 508, y: 446 }
    return {
      teacher: { x: 300, y: 150 },
      student: isRtl ? right : left,
      parent: isRtl ? left : right,
    }
  }, [isRtl])

  const edges = React.useMemo(
    () => [
      { id: 'ts', from: 'teacher' as RoleKey, ...bow(nodes.teacher, nodes.student) },
      { id: 'sp', from: 'student' as RoleKey, ...bow(nodes.student, nodes.parent, 30) },
      { id: 'pt', from: 'parent' as RoleKey, ...bow(nodes.parent, nodes.teacher) },
    ],
    [nodes],
  )

  const flowLabels: Record<string, string> = ar
    ? { ts: 'درجات · واجبات', sp: 'حضور · تقدّم', pt: 'رسائل · مدفوعات' }
    : { ts: 'Grades · homework', sp: 'Attendance · progress', pt: 'Messages · payments' }

  /* Entrance clock, in seconds. */
  const T = { grid: 0.2, ring: 0.35, edge: [0.55, 0.85, 1.15], node: [0.6, 0.95, 1.25], card: [0.8, 1.15, 1.45], label: 1.75 }
  const anim = (delay: number, from: Record<string, number>) =>
    reduce
      ? { initial: false as const }
      : {
          initial: { opacity: 0, ...from },
          animate: { opacity: 1, x: 0, y: 0, scale: 1 },
          transition: { duration: 0.7, delay, ease: EASE_PREMIUM },
        }

  return (
    <div className="mx-auto w-full max-w-[40rem]">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${W} / ${H}` }}
      >
        {/* the one light on the stage: a soft, cool halo behind the loop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[6%] rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 48%, hsl(var(--stage-glow) / var(--stage-glow-alpha, 0.13)), transparent 66%)',
          }}
        />

        {/* ------------------------------ SVG layer ----------------------------- */}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 size-full overflow-visible"
          role="img"
          aria-label={
            ar
              ? 'رسم يوضح دايرة أستاذ: المدرّس يسجّل، الطالب يتعلّم، وولي الأمر يتابع، والمعلومات بتتنقل بينهم'
              : 'Diagram of the USTAZ loop: the teacher records, the student learns, the parent follows, and information flows between them'
          }
        >
          <defs>
            {edges.map((e) => (
              <path key={e.id} id={`${uid}-${e.id}`} d={e.d} />
            ))}
          </defs>

          {/* timeline ring — ticks turn once every two minutes */}
          <motion.g {...anim(T.ring, { scale: 0.92 })} style={{ transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}>
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={112}
              fill="none"
              stroke="hsl(var(--stage-line))"
              strokeWidth={1}
            />
            <g
              className={cn(!reduce && 'animate-orbit-spin')}
              style={{ transformBox: 'view-box', transformOrigin: `${CENTER.x}px ${CENTER.y}px` }}
            >
              {Array.from({ length: 48 }, (_, i) => {
                const a = (i / 48) * Math.PI * 2
                const long = i % 4 === 0
                const r1 = long ? 117 : 120
                const r2 = 124
                return (
                  <line
                    key={i}
                    x1={CENTER.x + Math.cos(a) * r1}
                    y1={CENTER.y + Math.sin(a) * r1}
                    x2={CENTER.x + Math.cos(a) * r2}
                    y2={CENTER.y + Math.sin(a) * r2}
                    stroke="hsl(var(--stage-muted))"
                    strokeOpacity={long ? 0.55 : 0.25}
                    strokeWidth={1}
                  />
                )
              })}
            </g>
            <circle
              cx={CENTER.x}
              cy={CENTER.y}
              r={68}
              fill="none"
              stroke="hsl(var(--stage-line))"
              strokeDasharray="2 6"
            />
          </motion.g>

          {/* the three edges — drawn once, then carry traffic */}
          {edges.map((e, i) => (
            <g key={e.id}>
              <path d={e.d} fill="none" stroke="hsl(var(--stage-line))" strokeWidth={6} strokeLinecap="round" />
              <motion.path
                d={e.d}
                fill="none"
                stroke={ROLE_STROKE[e.from]}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeOpacity={0.85}
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, delay: T.edge[i], ease: EASE_PREMIUM }}
              />
            </g>
          ))}

          {/* packets — information in transit. SMIL keeps this off the JS thread. */}
          {!reduce &&
            edges.flatMap((e, i) =>
              [0, 1].map((k) => (
                <g key={`${e.id}-${k}`} opacity={0}>
                  <animate
                    attributeName="opacity"
                    values="0;1;1;0"
                    keyTimes="0;0.1;0.85;1"
                    dur="3.6s"
                    begin={`${2.1 + i * 1.2 + k * 1.8}s`}
                    repeatCount="indefinite"
                  />
                  <circle r={4.5} fill={ROLE_STROKE[e.from]} />
                  <circle r={9} fill="none" stroke={ROLE_STROKE[e.from]} strokeOpacity={0.35} />
                  <animateMotion
                    dur="3.6s"
                    begin={`${2.1 + i * 1.2 + k * 1.8}s`}
                    repeatCount="indefinite"
                    keyPoints="0;1"
                    keyTimes="0;1"
                    calcMode="spline"
                    keySplines="0.45 0 0.35 1"
                  >
                    <mpath href={`#${uid}-${e.id}`} />
                  </animateMotion>
                </g>
              )),
            )}
        </svg>

        {/* ------------------------------ HTML layer ---------------------------- */}

        {/* the core — the USTAZ mark the loop turns around */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: pct(CENTER.x, W), top: pct(CENTER.y, H) }}
        >
          <motion.div
            {...anim(T.node[0], { scale: 0.7 })}
            className="grid size-14 place-items-center rounded-2xl border border-stage-line bg-stage-raised sm:size-20"
          >
            <LogoMark className="size-9 sm:size-12" />
          </motion.div>
        </div>

        {/* flow labels on each edge */}
        {edges.map((e) => (
          <span
            key={e.id}
            className="absolute hidden -translate-x-1/2 -translate-y-1/2 md:block"
            /* the bottom edge's label sits just inside the loop, clear of the cards */
            style={{ left: pct(e.mid.x, W), top: pct(e.id === 'sp' ? e.mid.y - 52 : e.mid.y, H) }}
          >
            <motion.span
              {...anim(T.label, { y: 6 })}
              className="block whitespace-nowrap rounded-sm border border-stage-line bg-stage px-2 py-1 text-[0.6875rem] font-medium text-stage-muted"
            >
              {flowLabels[e.id]}
            </motion.span>
          </span>
        ))}

        {/* nodes */}
        {(['teacher', 'student', 'parent'] as RoleKey[]).map((role, i) => (
          <NodeDot key={role} role={role} at={nodes[role]} delay={T.node[i]} reduce={reduce} />
        ))}

        {/* cards */}
        <NodeCard at={nodes.teacher} placement="above" delay={T.card[0]} reduce={reduce}>
          <TeacherCard teacher={teacher} reduce={reduce} />
        </NodeCard>
        <NodeCard at={nodes.student} placement="below" delay={T.card[1]} reduce={reduce}>
          <StudentCard session={nextSession} reduce={reduce} />
        </NodeCard>
        <NodeCard at={nodes.parent} placement="below" delay={T.card[2]} reduce={reduce}>
          <ParentCard reduce={reduce} />
        </NodeCard>
      </div>

      {/* Phones: the diagram stays clean and the three cards read as a legend. */}
      <motion.ol
        className="mt-2 divide-y divide-stage-line overflow-hidden rounded-lg border border-stage-line bg-stage-raised sm:hidden"
        {...anim(T.card[0], { y: 10 })}
      >
        <li className="p-3.5">
          <TeacherCard teacher={teacher} reduce={reduce} />
        </li>
        <li className="p-3.5">
          <StudentCard session={nextSession} reduce={reduce} />
        </li>
        <li className="p-3.5">
          <ParentCard reduce={reduce} />
        </li>
      </motion.ol>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function NodeDot({
  role,
  at,
  delay,
  reduce,
}: {
  role: RoleKey
  at: { x: number; y: number }
  delay: number
  reduce: boolean
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: pct(at.x, W), top: pct(at.y, H) }}
    >
      <motion.span
        className="relative grid size-6 place-items-center rounded-full border border-stage-line bg-stage"
        initial={reduce ? false : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18, delay }}
      >
        {!reduce && (
          <span
            className={cn('absolute inset-0 rounded-full animate-node-breathe', ROLE_BG[role])}
            style={{ animationDelay: `${delay + 1}s` }}
            aria-hidden
          />
        )}
        <span className={cn('relative size-2.5 rounded-full', ROLE_BG[role])} />
      </motion.span>
    </div>
  )
}

/**
 * Anchors a card to a node. Edge nodes grow inward so the card never leaves
 * the stage; the top node's card is centred above it.
 */
function NodeCard({
  at,
  placement,
  delay,
  reduce,
  children,
}: {
  at: { x: number; y: number }
  placement: 'above' | 'below'
  delay: number
  reduce: boolean
  children: React.ReactNode
}) {
  const side = at.x < W * 0.4 ? 'left' : at.x > W * 0.6 ? 'right' : 'center'
  const style: React.CSSProperties =
    side === 'left'
      ? { left: `calc(${pct(at.x, W)} - 1rem)` }
      : side === 'right'
        ? { right: `calc(${pct(W - at.x, W)} - 1rem)` }
        : { left: pct(at.x, W), transform: 'translateX(-50%)' }
  if (placement === 'above') style.bottom = `calc(${pct(H - at.y, H)} + 1.25rem)`
  else style.top = `calc(${pct(at.y, H)} + 1.25rem)`

  return (
    <div className="absolute hidden w-[min(13rem,39%)] sm:block" style={style}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: placement === 'above' ? -10 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: EASE_PREMIUM }}
        className="rounded-lg border border-stage-line bg-stage-raised p-2.5 text-start sm:p-3"
      >
        {children}
      </motion.div>
    </div>
  )
}

function CardLabel({ role, children }: { role: RoleKey; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-stage-muted">
      <span className={cn('size-1.5 shrink-0 rounded-full', ROLE_BG[role])} aria-hidden />
      {children}
    </p>
  )
}

/** Cycles through a list on a timer; frozen on the first item when motion is reduced. */
function useCycle(length: number, ms: number, reduce: boolean) {
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    if (reduce || length < 2) return
    const id = window.setInterval(() => setI((n) => (n + 1) % length), ms)
    return () => window.clearInterval(id)
  }, [length, ms, reduce])
  return i
}

function TeacherCard({ teacher, reduce }: { teacher?: TeacherListItemDto; reduce: boolean }) {
  const { locale, pick } = useI18n()
  const ar = locale === 'ar-EG'
  const kinds = [
    { icon: CalendarCheck, label: ar ? 'حضور' : 'Attendance' },
    { icon: ClipboardCheck, label: ar ? 'واجب' : 'Homework' },
    { icon: GraduationCap, label: ar ? 'درجة' : 'Grade' },
  ]
  const active = useCycle(kinds.length, 1800, reduce)
  const subject = teacher?.subjects?.[0]

  return (
    <>
      <CardLabel role="teacher">{ar ? 'المدرّس يسجّل' : 'The teacher records'}</CardLabel>
      {teacher ? (
        <Link
          to={`/teachers/${teacher.id}`}
          className="mt-1.5 flex items-center gap-1 truncate text-caption font-semibold text-stage-foreground hover:text-primary sm:text-body-sm"
        >
          <span className="truncate">{teacher.displayName}</span>
          {teacher.isVerified && <BadgeCheck className="size-3.5 shrink-0 text-role-student" aria-hidden />}
        </Link>
      ) : (
        <p className="mt-1.5 text-caption font-semibold text-stage-foreground sm:text-body-sm">
          {ar ? 'من غير ورق' : 'Without paper'}
        </p>
      )}
      {subject && (
        <p className="truncate text-[0.6875rem] text-stage-muted">
          {pick(subject.nameAr, subject.nameEn)}
        </p>
      )}
      <ul className="mt-2 flex gap-1">
        {kinds.map(({ icon: Icon, label }, i) => (
          <li
            key={label}
            className={cn(
              'inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold transition-colors duration-500',
              i === active
                ? 'bg-role-teacher text-brand-foreground'
                : 'bg-stage-foreground/[0.06] text-stage-muted',
            )}
          >
            <Icon className="size-3" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </>
  )
}

function StudentCard({ session, reduce }: { session?: ScheduleSlotDto; reduce: boolean }) {
  const { locale, formatRelativeDay, formatTime } = useI18n()
  const ar = locale === 'ar-EG'
  return (
    <>
      <CardLabel role="student">{ar ? 'الطالب يتعلّم' : 'The student learns'}</CardLabel>
      <p className="mt-1.5 truncate text-caption font-semibold text-stage-foreground sm:text-body-sm">
        {session?.groupName ?? (ar ? 'جدول واحد لكل المدرّسين' : 'One timetable, every teacher')}
      </p>
      {session && (
        <p className="tnum truncate text-[0.6875rem] text-stage-muted">
          {[
            session.nextOccurrenceUtc ? formatRelativeDay(session.nextOccurrenceUtc) : session.dayName,
            session.startTime ? formatTime(session.startTime) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      {/* a week of study, as rhythm rather than numbers */}
      <div className="mt-2 flex h-6 items-end gap-1" aria-hidden>
        {[0.5, 0.8, 0.6, 1, 0.7, 0.9, 0.4].map((h, i) => (
          <span
            key={i}
            className={cn(
              'w-full origin-bottom rounded-[2px] bg-role-student',
              !reduce && 'animate-bar-rise',
            )}
            style={{ height: `${h * 100}%`, opacity: 0.35 + h * 0.6, animationDelay: `${i * 0.28}s` }}
          />
        ))}
      </div>
    </>
  )
}

function ParentCard({ reduce }: { reduce: boolean }) {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  const events = ar
    ? ['الحضور اتسجّل', 'درجة جديدة اترصدت', 'واجب اتسلّم', 'إعلان من المدرّس']
    : ['Attendance recorded', 'New grade posted', 'Homework handed in', 'Note from the teacher']
  const i = useCycle(events.length, 2600, reduce)

  return (
    <>
      <CardLabel role="parent">{ar ? 'ولي الأمر يتابع' : 'The parent follows'}</CardLabel>
      <div className="relative mt-1.5 h-5 overflow-hidden sm:h-6">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={i}
            initial={reduce ? false : { y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_PREMIUM }}
            className="flex items-center gap-1.5 truncate text-caption font-semibold text-stage-foreground sm:text-body-sm"
          >
            <Bell className="size-3.5 shrink-0 text-role-parent" aria-hidden />
            <span className="truncate">{events[i]}</span>
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="text-[0.6875rem] text-stage-muted">
        {ar ? 'نفس اللي المدرّس سجّله، لحظتها' : 'Exactly what the teacher saved, as it happens'}
      </p>
    </>
  )
}

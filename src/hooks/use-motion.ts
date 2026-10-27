import * as React from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

/*
 * Shared lifecycle for the story sections on public pages. Each section keeps
 * its own choreography; these hooks only own the plumbing every one of them
 * needs — reduced motion, viewport activation, and a step clock that runs once,
 * pauses off-screen and hands control to the reader the moment they interact.
 *
 * Nothing here is used inside the dashboards.
 */

type ViewMargin = NonNullable<NonNullable<Parameters<typeof useInView>[1]>['margin']>

/** `true` when the reader asked the OS for less motion. Never `null`. */
export function useMotionSafe(): { reduce: boolean } {
  return { reduce: useReducedMotion() ?? false }
}

/** Fires once, a little before the element is fully on screen. */
export function useEnteredView<T extends Element>(
  ref: React.RefObject<T>,
  margin: ViewMargin = '0px 0px -18% 0px',
): boolean {
  return useInView(ref, { once: true, margin })
}

/** Live visibility — for pausing anything that ticks while off-screen. */
export function useOnScreen<T extends Element>(ref: React.RefObject<T>): boolean {
  return useInView(ref, { margin: '0px 0px -10% 0px' })
}

export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches)
  const [matches, setMatches] = React.useState(get)
  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

interface StepSequenceOptions {
  /** Number of steps. The clock walks 0 → count-1 once and stops. */
  count: number
  /** Milliseconds each step holds before the next one. */
  interval: number
  /** Whether the clock may run (usually "has entered view"). */
  start: boolean
  /** Whether the section is on screen right now; the clock pauses when not. */
  visible?: boolean
  /** With reduced motion the clock never runs and jumps to this step. */
  reduce: boolean
  /** Step shown when reduced motion skips the sequence. Defaults to the last. */
  restingStep?: number
  /** Step shown before the clock starts. Defaults to -1 ("nothing yet"). */
  initialStep?: number
}

/**
 * A one-pass step clock for guided sequences.
 *
 * - Starts when `start` turns true, advances every `interval` ms, stops at the
 *   last step (no infinite loops).
 * - Pauses while `visible` is false and resumes where it left off.
 * - `select(i)` jumps straight to a step and permanently stops the clock, so a
 *   reader who clicks is never fought by the autoplay.
 * - Under reduced motion it never ticks; it rests on `restingStep`.
 */
export function useStepSequence({
  count,
  interval,
  start,
  visible = true,
  reduce,
  restingStep,
  initialStep = -1,
}: StepSequenceOptions) {
  const resting = restingStep ?? count - 1
  const [step, setStep] = React.useState(reduce ? resting : initialStep)
  const [manual, setManual] = React.useState(false)

  React.useEffect(() => {
    if (reduce && !manual) setStep(resting)
  }, [reduce, manual, resting])

  const running = !reduce && !manual && start && visible && step < count - 1

  React.useEffect(() => {
    if (!running) return
    /* The first step lands almost at once; later ones wait a full interval. */
    const id = window.setTimeout(
      () => setStep((s) => Math.min(s + 1, count - 1)),
      step < 0 ? 120 : interval,
    )
    return () => window.clearTimeout(id)
  }, [running, step, interval, count])

  const select = React.useCallback((i: number) => {
    setManual(true)
    setStep(i)
  }, [])

  return { step, select, manual, done: step >= count - 1 }
}

import type { TimerPhase } from '../../../shared/core/duration'
import { formatClock, timerPhase } from '../../../shared/core/duration'

/**
 * Stage timer — the pure part. Given when a timer was started and how long it
 * runs, work out what both screens should show. No `Date.now()` in here: the
 * caller passes `now`, which is what makes it testable and keeps the stage and
 * presenter views agreeing on the same instant.
 */

export interface TimerState {
  /** Total length in seconds. */
  durationSeconds: number
  /** Seconds remaining at which the display turns amber. 0 disables it. */
  warnSeconds: number
  /** Epoch ms when the timer was started, or null when it has never run. */
  startedAt: number | null
  /** Milliseconds already elapsed before the current run (from pauses). */
  elapsedBefore: number
  running: boolean
  /**
   * Show time counted up from zero rather than down to it. Only the big
   * number changes: the warning and overrun colours still key off the time
   * remaining, because that is what the speaker needs to know either way.
   *
   * Part of the shared state rather than a view preference, so the stage
   * screen and the presenter never disagree about what they are showing.
   */
  countUp: boolean
}

export interface TimerReading {
  remainingMs: number
  elapsedMs: number
  /** Counting down: `4:59`, or `-0:12` once it overruns. Counting up: `0:12`. */
  clock: string
  phase: TimerPhase
  /** 0–1, for a progress bar. Clamped, so overrun stays at 1. */
  progress: number
  over: boolean
}

export function readTimer(state: TimerState, now: number): TimerReading {
  const elapsed = state.running && state.startedAt !== null
    ? state.elapsedBefore + (now - state.startedAt)
    : state.elapsedBefore

  const totalMs = Math.max(0, state.durationSeconds) * 1000
  const remainingMs = totalMs - elapsed

  // Counting up with no duration set is an open-ended stopwatch. Without this
  // it would read as instantly overrun — nothing to run out of, yet zero left.
  const openEnded = state.countUp && totalMs === 0

  return {
    remainingMs,
    elapsedMs: elapsed,
    clock: formatClock(state.countUp ? elapsed : remainingMs),
    phase: openEnded ? 'normal' : timerPhase(remainingMs, state.warnSeconds),
    progress: openEnded ? 0 : totalMs === 0 ? 1 : Math.min(1, Math.max(0, elapsed / totalMs)),
    over: openEnded ? false : remainingMs <= 0,
  }
}

export function startTimer(state: TimerState, now: number): TimerState {
  if (state.running)
    return state
  return { ...state, running: true, startedAt: now }
}

export function pauseTimer(state: TimerState, now: number): TimerState {
  if (!state.running || state.startedAt === null)
    return state
  return {
    ...state,
    running: false,
    startedAt: null,
    elapsedBefore: state.elapsedBefore + (now - state.startedAt),
  }
}

export function resetTimer(state: TimerState): TimerState {
  return { ...state, running: false, startedAt: null, elapsedBefore: 0 }
}

/** Add or remove time mid-run — the "give them two more minutes" button. */
export function adjustTimer(state: TimerState, deltaSeconds: number): TimerState {
  return { ...state, durationSeconds: Math.max(0, state.durationSeconds + deltaSeconds) }
}

/** Flip between counting down to the target and up from zero. */
export function setCountUp(state: TimerState, countUp: boolean): TimerState {
  return { ...state, countUp }
}

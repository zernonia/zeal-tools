import type { TimerState } from './index'
import { describe, expect, it } from 'vitest'
import { adjustTimer, pauseTimer, readTimer, resetTimer, setCountUp, startTimer } from './index'

const base: TimerState = {
  durationSeconds: 300,
  warnSeconds: 60,
  startedAt: null,
  elapsedBefore: 0,
  running: false,
  countUp: false,
}

describe('readTimer', () => {
  it('shows the full duration before starting', () => {
    expect(readTimer(base, 1_000).clock).toBe('5:00')
    expect(readTimer(base, 1_000).progress).toBe(0)
  })

  it('counts down while running', () => {
    const running = startTimer(base, 10_000)
    expect(readTimer(running, 70_000).clock).toBe('4:00')
  })

  it('is frozen while paused', () => {
    const paused = pauseTimer(startTimer(base, 0), 60_000)
    expect(readTimer(paused, 60_000).clock).toBe('4:00')
    // time passing must not move a paused clock
    expect(readTimer(paused, 999_000).clock).toBe('4:00')
  })

  it('enters warn inside the threshold and over past zero', () => {
    const running = startTimer(base, 0)
    expect(readTimer(running, 200_000).phase).toBe('normal')
    expect(readTimer(running, 250_000).phase).toBe('warn')
    expect(readTimer(running, 300_000).phase).toBe('over')
  })

  it('counts up once it overruns', () => {
    const running = startTimer(base, 0)
    expect(readTimer(running, 312_000).clock).toBe('-0:12')
    expect(readTimer(running, 312_000).over).toBe(true)
    expect(readTimer(running, 312_000).progress).toBe(1)
  })
})

describe('transitions', () => {
  it('accumulates elapsed time across pause and resume', () => {
    let state = startTimer(base, 0)
    state = pauseTimer(state, 60_000)
    state = startTimer(state, 100_000)
    // 60s ran before the pause, 30s since resuming
    expect(readTimer(state, 130_000).clock).toBe('3:30')
  })

  it('ignores redundant starts and pauses', () => {
    const started = startTimer(base, 0)
    expect(startTimer(started, 50_000)).toBe(started)
    expect(pauseTimer(base, 50_000)).toBe(base)
  })

  it('reset returns to a full, stopped clock', () => {
    const state = resetTimer(pauseTimer(startTimer(base, 0), 90_000))
    expect(state.running).toBe(false)
    expect(readTimer(state, 500_000).clock).toBe('5:00')
  })

  it('adjusts duration without going negative', () => {
    expect(adjustTimer(base, 120).durationSeconds).toBe(420)
    expect(adjustTimer(base, -9999).durationSeconds).toBe(0)
  })
})

describe('counting up', () => {
  const up = { ...base, countUp: true }

  it('starts at zero rather than at the full duration', () => {
    expect(readTimer(up, 1_000).clock).toBe('0:00')
    expect(readTimer(base, 1_000).clock).toBe('5:00')
  })

  it('shows time elapsed while it runs', () => {
    const running = { ...up, running: true, startedAt: 1_000 }
    expect(readTimer(running, 1_000 + 90_000).clock).toBe('1:30')
  })

  it('keeps counting up past the target instead of going negative', () => {
    // Counting down shows -0:30 here; counting up should read 5:30, because a
    // speaker who has overrun wants to know how long they have been talking.
    const running = { ...up, running: true, startedAt: 0 }
    expect(readTimer(running, 330_000).clock).toBe('5:30')
    expect(readTimer({ ...running, countUp: false }, 330_000).clock).toBe('-0:30')
  })

  it('still turns amber and red on the time remaining', () => {
    // The colours track the target even though the number counts up — that is
    // the half of the display the speaker actually needs.
    const running = { ...up, running: true, startedAt: 0 }
    expect(readTimer(running, 200_000).phase).toBe('normal')
    expect(readTimer(running, 260_000).phase).toBe('warn')
    expect(readTimer(running, 301_000).phase).toBe('over')
  })

  it('reports elapsed alongside remaining in both directions', () => {
    const running = { ...up, running: true, startedAt: 0 }
    const reading = readTimer(running, 120_000)
    expect(reading.elapsedMs).toBe(120_000)
    expect(reading.remainingMs).toBe(180_000)
    expect(readTimer({ ...running, countUp: false }, 120_000).elapsedMs).toBe(120_000)
  })

  it('is an open-ended stopwatch when no duration is set', () => {
    // Without this it would read as overrun the instant it started: nothing to
    // run out of, yet zero remaining.
    const stopwatch = { ...up, durationSeconds: 0, running: true, startedAt: 0 }
    const reading = readTimer(stopwatch, 45_000)
    expect(reading.clock).toBe('0:45')
    expect(reading.phase).toBe('normal')
    expect(reading.over).toBe(false)
    expect(reading.progress).toBe(0)
  })

  it('still counts a zero-duration countdown as over', () => {
    const zero = { ...base, durationSeconds: 0, running: true, startedAt: 0 }
    expect(readTimer(zero, 1_000).over).toBe(true)
  })
})

describe('setCountUp', () => {
  it('flips the direction without touching the run', () => {
    const running = { ...base, running: true, startedAt: 1_000, elapsedBefore: 5_000 }
    const flipped = setCountUp(running, true)
    expect(flipped.countUp).toBe(true)
    expect(flipped.running).toBe(true)
    expect(flipped.startedAt).toBe(1_000)
    expect(flipped.elapsedBefore).toBe(5_000)
  })

  it('does not mutate the state it is given', () => {
    const next = setCountUp(base, true)
    expect(base.countUp).toBe(false)
    expect(next).not.toBe(base)
  })
})

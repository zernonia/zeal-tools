import type { TimerState } from './index'
import { describe, expect, it } from 'vitest'
import { adjustTimer, pauseTimer, readTimer, resetTimer, startTimer } from './index'

const base: TimerState = {
  durationSeconds: 300,
  warnSeconds: 60,
  startedAt: null,
  elapsedBefore: 0,
  running: false,
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

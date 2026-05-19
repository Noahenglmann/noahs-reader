import { useState } from 'react'
import type { StreakData } from '../types'
import { saveStreak, todayStr } from '../lib/storage'

interface StreakProps {
  streak: StreakData
  onStreakChange: (streak: StreakData) => void
}

export function Streak({ streak, onStreakChange }: StreakProps) {
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(String(streak.dailyGoal))

  const today = todayStr()
  const goalMet = streak.wordsReadToday >= streak.dailyGoal
  const progressPct = Math.min(100, (streak.wordsReadToday / streak.dailyGoal) * 100)

  function saveGoal() {
    const goal = Math.max(100, Math.min(100000, parseInt(goalInput, 10) || 2000))
    const updated = { ...streak, dailyGoal: goal }
    saveStreak(updated)
    onStreakChange(updated)
    setEditingGoal(false)
    setGoalInput(String(goal))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="safe-top shrink-0 px-5 pb-4 pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Daily Streak</h1>
        <p className="mt-1 text-sm text-muted">Keep your reading habit alive</p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* Streak flame */}
        <div className="mb-6 flex flex-col items-center rounded-3xl bg-surface-raised py-8">
          <span className="text-6xl">{streak.currentStreak > 0 ? '🔥' : '💤'}</span>
          <p className="mt-3 text-4xl font-bold text-streak">{streak.currentStreak}</p>
          <p className="text-sm text-muted">day streak</p>
          {streak.longestStreak > 0 && (
            <p className="mt-2 text-xs text-muted">
              Best: {streak.longestStreak} days
            </p>
          )}
        </div>

        {/* Today's progress */}
        <section className="mb-6 rounded-2xl bg-surface-raised p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">Today&apos;s goal</h2>
            {goalMet && (
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
                ✓ Done
              </span>
            )}
          </div>

          {editingGoal ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                min={100}
                max={100000}
                step={100}
                className="flex-1 rounded-xl bg-surface-overlay px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                type="button"
                onClick={saveGoal}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setGoalInput(String(streak.dailyGoal))
                setEditingGoal(true)
              }}
              className="text-left"
            >
              <p className="text-3xl font-bold">
                {streak.dailyGoal.toLocaleString()}
                <span className="ml-2 text-base font-normal text-muted">words / day</span>
              </p>
              <p className="mt-1 text-xs text-muted">Tap to customize</p>
            </button>
          )}

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-overlay">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                goalMet ? 'bg-accent' : 'bg-streak'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-muted">
            {streak.wordsReadToday.toLocaleString()} / {streak.dailyGoal.toLocaleString()} words
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-raised p-4 text-center">
            <p className="text-2xl font-bold">{streak.totalWordsRead.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted">Total words read</p>
          </div>
          <div className="rounded-2xl bg-surface-raised p-4 text-center">
            <p className="text-2xl font-bold">
              {streak.lastReadDate === today ? '✓' : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">Read today</p>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-muted/70">
          Words count while you read in the RSVP reader. Hit your daily goal to grow your streak.
        </p>
      </div>
    </div>
  )
}

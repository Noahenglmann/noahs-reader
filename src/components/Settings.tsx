import { useState } from 'react'
import type { AppSettings } from '../types'
import { saveSettings } from '../lib/storage'
import { useSpeech } from '../hooks/useSpeech'

interface SettingsProps {
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
}

export function Settings({ settings, onSettingsChange }: SettingsProps) {
  const { voices } = useSpeech()
  const [wpm, setWpm] = useState(settings.wpm)
  const [readAloud, setReadAloud] = useState(settings.readAloud)
  const [smartPauses, setSmartPauses] = useState(settings.smartPauses)
  const [bionicReading, setBionicReading] = useState(settings.bionicReading)
  const [speechRate, setSpeechRate] = useState(settings.speechRate)
  const [speechVoiceUri, setSpeechVoiceUri] = useState(settings.speechVoiceUri)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const updated: AppSettings = {
      wpm: Math.max(100, Math.min(800, wpm)),
      googleApiKey: '', // No longer used - API key is hardcoded
      readAloud,
      smartPauses,
      bionicReading,
      speechRate: Math.max(0.5, Math.min(2, speechRate)),
      speechVoiceUri,
    }
    saveSettings(updated)
    onSettingsChange(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="safe-top shrink-0 px-5 pb-4 pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <section className="mb-6 rounded-2xl bg-surface-raised p-5">
          <label className="text-sm font-medium text-muted font-serif">Default reading speed</label>
          <div className="mt-4 flex items-center gap-4">
            <input
              type="range"
              min={100}
              max={800}
              step={25}
              value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              style={{'--value': `${((wpm - 100) / 700) * 100}%`} as React.CSSProperties}
              className="flex-1"
            />
            <span className="w-16 text-right font-serif font-semibold text-accent">{wpm}</span>
          </div>
        </section>

        <section className="bubble-card mb-6">
          <h2 className="text-sm font-medium text-muted font-serif">Reader features</h2>
          <label className="mt-4 flex items-center justify-between">
            <span className="text-sm font-serif">Read aloud by default</span>
            <input
              type="checkbox"
              checked={readAloud}
              onChange={(e) => setReadAloud(e.target.checked)}
            />
          </label>
          <label className="mt-3 flex items-center justify-between">
            <span className="text-sm font-serif">Smart pauses at punctuation</span>
            <input
              type="checkbox"
              checked={smartPauses}
              onChange={(e) => setSmartPauses(e.target.checked)}
            />
          </label>
          <label className="mt-3 flex items-center justify-between">
            <span className="text-sm font-serif">Bionic reading (classic view)</span>
            <input
              type="checkbox"
              checked={bionicReading}
              onChange={(e) => setBionicReading(e.target.checked)}
            />
          </label>
          <div className="mt-4">
            <label className="text-xs text-muted font-serif">Speech rate</label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
              style={{'--value': `${((speechRate - 0.5) / 1.5) * 100}%`} as React.CSSProperties}
              className="mt-2 w-full"
            />
          </div>
          {voices.length > 0 && (
            <div className="mt-3">
              <label className="text-xs text-muted font-serif">Voice</label>
              <select
                value={speechVoiceUri}
                onChange={(e) => setSpeechVoiceUri(e.target.value)}
                className="mt-2 w-full rounded-2xl bg-surface-overlay/50 px-4 py-2 text-sm border border-surface-overlay hover:border-accent/50 transition-colors font-serif"
              >
                <option value="">System default</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={handleSave}
          className="w-full bubble-card bg-accent text-white py-3 font-serif font-semibold hover:scale-105 transition-transform active:scale-95"
        >
          {saved ? 'Saved' : 'Save settings'}
        </button>

        <section className="bubble-card mt-8 text-sm text-muted">
          <h2 className="mb-2 font-serif font-semibold text-text">About Noah&apos;s Reader</h2>
          <p>
            <strong>Play</strong> — fullscreen RSVP, one word at a time with optional
            read-aloud. <strong>Pause</strong> — classic page view with your current word
            highlighted.
          </p>
          <p className="mt-3">
            Also includes ORP highlighting, smart punctuation pauses, bionic reading,
            time-remaining estimates, and daily streaks.
          </p>
        </section>
      </div>
    </div>
  )
}

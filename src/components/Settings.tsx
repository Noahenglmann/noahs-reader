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
  const [apiKey, setApiKey] = useState(settings.googleApiKey)
  const [readAloud, setReadAloud] = useState(settings.readAloud)
  const [smartPauses, setSmartPauses] = useState(settings.smartPauses)
  const [bionicReading, setBionicReading] = useState(settings.bionicReading)
  const [speechRate, setSpeechRate] = useState(settings.speechRate)
  const [speechVoiceUri, setSpeechVoiceUri] = useState(settings.speechVoiceUri)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const updated: AppSettings = {
      wpm: Math.max(100, Math.min(800, wpm)),
      googleApiKey: apiKey.trim(),
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
          <label className="text-sm font-medium text-muted">Default reading speed</label>
          <div className="mt-3 flex items-center gap-4">
            <input
              type="range"
              min={100}
              max={800}
              step={25}
              value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="w-16 text-right font-semibold">{wpm} WPM</span>
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-surface-raised p-5">
          <h2 className="text-sm font-medium text-muted">Reader features</h2>
          <label className="mt-4 flex items-center justify-between">
            <span className="text-sm">Read aloud by default</span>
            <input
              type="checkbox"
              checked={readAloud}
              onChange={(e) => setReadAloud(e.target.checked)}
              className="accent-accent"
            />
          </label>
          <label className="mt-3 flex items-center justify-between">
            <span className="text-sm">Smart pauses at punctuation</span>
            <input
              type="checkbox"
              checked={smartPauses}
              onChange={(e) => setSmartPauses(e.target.checked)}
              className="accent-accent"
            />
          </label>
          <label className="mt-3 flex items-center justify-between">
            <span className="text-sm">Bionic reading (classic view)</span>
            <input
              type="checkbox"
              checked={bionicReading}
              onChange={(e) => setBionicReading(e.target.checked)}
              className="accent-accent"
            />
          </label>
          <div className="mt-4">
            <label className="text-xs text-muted">Speech rate</label>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
              className="mt-1 w-full accent-accent"
            />
          </div>
          {voices.length > 0 && (
            <div className="mt-3">
              <label className="text-xs text-muted">Voice</label>
              <select
                value={speechVoiceUri}
                onChange={(e) => setSpeechVoiceUri(e.target.value)}
                className="mt-1 w-full rounded-xl bg-surface-overlay px-3 py-2 text-sm"
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

        <section className="mb-6 rounded-2xl bg-surface-raised p-5">
          <label htmlFor="api-key" className="text-sm font-medium text-muted">
            Google API key
          </label>
          <p className="mt-1 mb-3 text-xs text-muted">
            Required to load books from your Drive library (synced automatically on
            open).{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              Get a free key
            </a>{' '}
            and enable the Google Drive API.
          </p>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza…"
            className="w-full rounded-xl bg-surface-overlay px-4 py-3 text-sm outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-accent/50"
          />
        </section>

        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-white"
        >
          {saved ? 'Saved!' : 'Save settings'}
        </button>

        <section className="mt-8 rounded-2xl bg-surface-raised p-5 text-sm text-muted">
          <h2 className="mb-2 font-medium text-text">About Noah&apos;s Reader</h2>
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

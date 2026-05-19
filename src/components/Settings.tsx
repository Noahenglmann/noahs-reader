import { useState } from 'react'
import type { AppSettings } from '../types'
import { saveSettings } from '../lib/storage'

interface SettingsProps {
  settings: AppSettings
  onSettingsChange: (settings: AppSettings) => void
}

export function Settings({ settings, onSettingsChange }: SettingsProps) {
  const [wpm, setWpm] = useState(settings.wpm)
  const [apiKey, setApiKey] = useState(settings.googleApiKey)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const updated: AppSettings = {
      wpm: Math.max(100, Math.min(800, wpm)),
      googleApiKey: apiKey.trim(),
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
          <label htmlFor="api-key" className="text-sm font-medium text-muted">
            Google API key
          </label>
          <p className="mt-1 mb-3 text-xs text-muted">
            Required to import entire Drive folders. Get a free key from the{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              Google Cloud Console
            </a>
            . Enable the Google Drive API.
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
            RSVP speed reading — one word at a time, centered on screen with an
            optimal recognition point highlight. Built for flow-state reading on
            your phone.
          </p>
          <p className="mt-3">
            Supports EPUB, PDF, and MOBI. Import single files from Google Drive
            (public link) or upload locally.
          </p>
        </section>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings, Book } from '../types'
import { useReader } from '../hooks/useReader'
import { useSpeech } from '../hooks/useSpeech'
import { extractWords } from '../lib/parsers'
import {
  getBookData,
  getProgress,
  saveProgress,
  recordWordsRead,
  getSettings,
} from '../lib/storage'
import { formatTimeRemaining, wordsPerPageForScreen } from '../lib/readingUtils'
import { ClassicView } from './ClassicView'
import { RsvpView } from './RsvpView'

type ReaderMode = 'classic' | 'rsvp'

interface ReaderProps {
  book: Book
  onClose: () => void
  onStreakUpdate: () => void
}

export function Reader({ book, onClose, onStreakUpdate }: ReaderProps) {
  const [words, setWords] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<AppSettings>(getSettings)
  const [mode, setMode] = useState<ReaderMode>('classic')
  const [readAloud, setReadAloud] = useState(settings.readAloud)
  const [wpm, setWpm] = useState(settings.wpm)
  const [fontSize, setFontSize] = useState(18)
  const containerRef = useRef<HTMLDivElement>(null)

  const wordsPerPage = wordsPerPageForScreen()
  const { supported: speechSupported, speakWord, cancel: cancelSpeech } = useSpeech()

  const startIndex = getProgress(book.id)?.wordIndex ?? 0

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getBookData(book.dataKey)
        if (!data) throw new Error('Book data not found')
        const { words: extracted } = await extractWords(data, book.format, book.title)
        if (!cancelled) setWords(extracted)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load book')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [book])

  const handleWordRead = useCallback(
    (count: number) => {
      recordWordsRead(count)
      onStreakUpdate()
    },
    [onStreakUpdate],
  )

  const reader = useReader({
    words,
    startIndex,
    wpm,
    smartPauses: settings.smartPauses,
    onWordRead: handleWordRead,
  })

  // TTS: speak current word when in RSVP mode with read-aloud on
  useEffect(() => {
    if (mode !== 'rsvp' || !reader.playing || !readAloud) return
    speakWord(reader.currentWord, settings.speechRate, settings.speechVoiceUri || undefined)
  }, [
    reader.index,
    reader.currentWord,
    mode,
    reader.playing,
    readAloud,
    speakWord,
    settings.speechRate,
    settings.speechVoiceUri,
  ])

  useEffect(() => {
    if (!reader.playing) cancelSpeech()
  }, [reader.playing, cancelSpeech])

  // Save progress periodically
  useEffect(() => {
    const id = setInterval(() => {
      saveProgress({
        bookId: book.id,
        wordIndex: reader.index,
        updatedAt: Date.now(),
      })
    }, 3000)
    return () => clearInterval(id)
  }, [book.id, reader.index])

  useEffect(() => {
    return () => {
      saveProgress({
        bookId: book.id,
        wordIndex: reader.index,
        updatedAt: Date.now(),
      })
      cancelSpeech()
    }
  }, [book.id, reader.index, cancelSpeech])

  const enterRsvp = useCallback(async () => {
    setMode('rsvp')
    const el = containerRef.current
    if (el?.requestFullscreen) {
      try {
        await el.requestFullscreen()
      } catch {
        /* fullscreen optional */
      }
    }
    reader.play()
  }, [reader])

  const exitRsvp = useCallback(async () => {
    reader.pause()
    cancelSpeech()
    setMode('classic')
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        /* ignore */
      }
    }
  }, [reader, cancelSpeech])

  const handlePlayPause = useCallback(() => {
    if (mode === 'rsvp' && reader.playing) {
      exitRsvp()
    } else {
      enterRsvp()
    }
  }, [mode, reader.playing, enterRsvp, exitRsvp])

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && mode === 'rsvp') {
        reader.pause()
        cancelSpeech()
        setMode('classic')
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [mode, reader, cancelSpeech])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface">
        <p className="text-muted animate-pulse">Preparing your book…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-surface px-8">
        <p className="text-center text-red-400">{error}</p>
        <button type="button" onClick={onClose} className="text-accent">
          Go back
        </button>
      </div>
    )
  }

  const timeLeft = formatTimeRemaining(reader.wordsLeft, wpm)

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col bg-surface select-none ${
        mode === 'rsvp' ? 'bg-black' : ''
      }`}
    >
      {/* Header — hidden in fullscreen RSVP for immersion */}
      {mode === 'classic' && (
        <header className="safe-top flex shrink-0 items-center justify-between px-5 py-3">
          <button type="button" onClick={onClose} className="text-sm text-muted">
            ← Back
          </button>
          <h2 className="max-w-[50%] truncate text-sm font-medium">{book.title}</h2>
          <span className="text-xs text-muted">{timeLeft} left</span>
        </header>
      )}

      {/* Main content */}
      <div className="min-h-0 flex-1">
        {mode === 'rsvp' ? (
          <RsvpView word={reader.currentWord} progress={reader.progress} />
        ) : (
          <ClassicView
            words={words}
            currentIndex={reader.index}
            wordsPerPage={wordsPerPage}
            bionicReading={settings.bionicReading}
            fontSize={fontSize}
            onWordTap={reader.seek}
            onPageNav={(dir) => {
              const target = dir === -1
                ? Math.max(0, reader.index - wordsPerPage)
                : Math.min(words.length - 1, reader.index + wordsPerPage)
              reader.seek(target)
            }}
          />
        )}
      </div>

      {/* Bottom controls — always visible */}
      <div className="safe-bottom shrink-0 border-t border-surface-overlay bg-surface-raised/95 px-5 pb-5 pt-3 backdrop-blur-lg">
        <div className="mb-3 flex items-center justify-between text-xs text-muted">
          <span>
            {reader.index + 1} / {words.length}
          </span>
          <span>{wpm} WPM · {timeLeft}</span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => reader.skip(-10)}
            className="rounded-full bg-surface-overlay px-3 py-2 text-sm"
            aria-label="Skip back 10 words"
          >
            −10
          </button>

          <button
            type="button"
            onClick={handlePlayPause}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-semibold text-white shadow-lg shadow-accent/30"
            aria-label={mode === 'rsvp' && reader.playing ? 'Pause' : 'Play'}
          >
            {mode === 'rsvp' && reader.playing ? '❚❚' : '▶'}
          </button>

          <button
            type="button"
            onClick={() => reader.skip(10)}
            className="rounded-full bg-surface-overlay px-3 py-2 text-sm"
            aria-label="Skip forward 10 words"
          >
            +10
          </button>
        </div>

        <input
          type="range"
          min={100}
          max={800}
          step={25}
          value={wpm}
          onChange={(e) => setWpm(Number(e.target.value))}
          className="mt-3 w-full accent-accent"
          aria-label="Reading speed"
        />

        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
          {speechSupported && (
            <button
              type="button"
              onClick={() => setReadAloud((r) => !r)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                readAloud
                  ? 'bg-accent/20 text-accent'
                  : 'bg-surface-overlay text-muted'
              }`}
            >
              {readAloud ? '🔊 Read aloud on' : '🔇 Read aloud off'}
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setSettings((s) => ({ ...s, bionicReading: !s.bionicReading }))
            }
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              settings.bionicReading
                ? 'bg-accent/20 text-accent'
                : 'bg-surface-overlay text-muted'
            }`}
          >
            Bionic {settings.bionicReading ? 'on' : 'off'}
          </button>

          <div className="flex items-center gap-1 text-xs text-muted">
            <span>Aa</span>
            <input
              type="range"
              min={14}
              max={24}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-16 accent-accent"
              aria-label="Font size"
            />
          </div>

          {mode === 'rsvp' && (
            <button
              type="button"
              onClick={exitRsvp}
              className="rounded-full bg-surface-overlay px-3 py-1.5 text-xs text-muted"
            >
              Page view
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import type { Book } from '../types'
import { useReader } from '../hooks/useReader'
import { extractWords } from '../lib/parsers'
import { getBookData, getProgress, saveProgress, recordWordsRead } from '../lib/storage'
import { getSettings } from '../lib/storage'

interface ReaderProps {
  book: Book
  onClose: () => void
  onStreakUpdate: () => void
}

export function Reader({ book, onClose, onStreakUpdate }: ReaderProps) {
  const [words, setWords] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wpm, setWpm] = useState(getSettings().wpm)
  const [showControls, setShowControls] = useState(false)

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
    onWordRead: handleWordRead,
  })

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
    }
  }, [book.id, reader.index])

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

  const { currentWord, orpIndex, playing, progress, toggle, skip } = reader

  const before = currentWord.slice(0, orpIndex)
  const orp = currentWord[orpIndex] ?? ''
  const after = currentWord.slice(orpIndex + 1)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-surface select-none"
      onClick={() => {
        toggle()
        setShowControls(false)
      }}
    >
      {/* Progress bar */}
      <div className="safe-top h-1 w-full bg-surface-overlay">
        <div
          className="h-full bg-accent transition-all duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Word display */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="relative text-center">
          {/* ORP guide line */}
          <div className="absolute left-1/2 top-1/2 h-12 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-orp/30" />
          <div
            className="font-semibold tracking-wide"
            style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)' }}
          >
            <span className="text-text/70">{before}</span>
            <span className="text-orp">{orp}</span>
            <span className="text-text/70">{after}</span>
          </div>
        </div>
      </div>

      {/* Bottom controls — tap-hold area */}
      <div
        className="safe-bottom px-6 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {reader.index + 1} / {words.length}
          </span>
          <span>{wpm} WPM</span>
        </div>

        <div
          className={`mt-4 flex items-center justify-center gap-6 transition-opacity ${
            showControls || !playing ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={() => skip(-10)}
            className="rounded-full bg-surface-overlay px-4 py-2 text-sm"
          >
            −10
          </button>
          <button
            type="button"
            onClick={toggle}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-white"
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            onClick={() => skip(10)}
            className="rounded-full bg-surface-overlay px-4 py-2 text-sm"
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
          onClick={(e) => e.stopPropagation()}
          className="mt-4 w-full accent-accent"
        />

        <div className="mt-3 flex justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowControls((s) => !s)}
            className="text-xs text-muted"
          >
            {showControls ? 'Hide' : 'Show'} controls
          </button>
          <button type="button" onClick={onClose} className="text-xs text-muted">
            Exit reader
          </button>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { getOrpIndex } from '../lib/tokenize'

interface UseReaderOptions {
  words: string[]
  startIndex: number
  wpm: number
  onWordRead?: (count: number) => void
  onComplete?: () => void
}

export function useReader({
  words,
  startIndex,
  wpm,
  onWordRead,
  onComplete,
}: UseReaderOptions) {
  const [index, setIndex] = useState(startIndex)
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const batchRef = useRef(0)

  const msPerWord = 60000 / wpm

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const flushBatch = useCallback(() => {
    if (batchRef.current > 0) {
      onWordRead?.(batchRef.current)
      batchRef.current = 0
    }
  }, [onWordRead])

  useEffect(() => {
    setIndex(startIndex)
    setPlaying(false)
    clearTimer()
  }, [words, startIndex, clearTimer])

  useEffect(() => {
    if (!playing || words.length === 0) {
      clearTimer()
      return
    }

    intervalRef.current = setInterval(() => {
      setIndex((prev) => {
        if (prev >= words.length - 1) {
          setPlaying(false)
          flushBatch()
          onComplete?.()
          return prev
        }
        batchRef.current += 1
        if (batchRef.current >= 10) flushBatch()
        return prev + 1
      })
    }, msPerWord)

    return clearTimer
  }, [playing, words.length, msPerWord, clearTimer, flushBatch, onComplete])

  useEffect(() => () => {
    flushBatch()
    clearTimer()
  }, [flushBatch, clearTimer])

  const toggle = () => setPlaying((p) => !p)
  const pause = () => setPlaying(false)
  const play = () => setPlaying(true)
  const skip = (delta: number) => {
    setIndex((prev) => Math.max(0, Math.min(words.length - 1, prev + delta)))
  }
  const seek = (newIndex: number) => {
    setIndex(Math.max(0, Math.min(words.length - 1, newIndex)))
  }

  const currentWord = words[index] ?? ''
  const orpIndex = getOrpIndex(currentWord)
  const progress = words.length > 0 ? index / words.length : 0

  return {
    index,
    currentWord,
    orpIndex,
    playing,
    progress,
    toggle,
    pause,
    play,
    skip,
    seek,
  }
}

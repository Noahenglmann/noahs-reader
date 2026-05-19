import { useCallback, useEffect, useRef, useState } from 'react'
import { getOrpIndex } from '../lib/tokenize'
import { wordDelayMs } from '../lib/readingUtils'

interface UseReaderOptions {
  words: string[]
  startIndex: number
  wpm: number
  smartPauses?: boolean
  onWordRead?: (count: number) => void
  onComplete?: () => void
}

export function useReader({
  words,
  startIndex,
  wpm,
  smartPauses = true,
  onWordRead,
  onComplete,
}: UseReaderOptions) {
  const [index, setIndex] = useState(startIndex)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const batchRef = useRef(0)
  const indexRef = useRef(startIndex)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const flushBatch = useCallback(() => {
    if (batchRef.current > 0) {
      onWordRead?.(batchRef.current)
      batchRef.current = 0
    }
  }, [onWordRead])

  useEffect(() => {
    indexRef.current = index
  }, [index])

  useEffect(() => {
    setIndex(startIndex)
    indexRef.current = startIndex
    setPlaying(false)
    clearTimer()
  }, [words, startIndex, clearTimer])

  const scheduleNext = useCallback(() => {
    clearTimer()
    const current = indexRef.current
    if (current >= words.length - 1) {
      setPlaying(false)
      flushBatch()
      onComplete?.()
      return
    }

    const word = words[current] ?? ''
    const delay = wordDelayMs(word, wpm, smartPauses)

    timerRef.current = setTimeout(() => {
      setIndex((prev) => {
        const next = prev + 1
        indexRef.current = next
        batchRef.current += 1
        if (batchRef.current >= 10) flushBatch()
        return next
      })
    }, delay)
  }, [words, wpm, smartPauses, clearTimer, flushBatch, onComplete])

  useEffect(() => {
    if (!playing || words.length === 0) {
      clearTimer()
      return
    }
    scheduleNext()
    return clearTimer
  }, [playing, index, words, scheduleNext, clearTimer])

  useEffect(() => () => {
    flushBatch()
    clearTimer()
  }, [flushBatch, clearTimer])

  const play = useCallback(() => setPlaying(true), [])
  const pause = useCallback(() => {
    setPlaying(false)
    clearTimer()
    flushBatch()
  }, [clearTimer, flushBatch])

  const toggle = useCallback(() => {
    setPlaying((p) => !p)
  }, [])

  const skip = (delta: number) => {
    setIndex((prev) => {
      const next = Math.max(0, Math.min(words.length - 1, prev + delta))
      indexRef.current = next
      return next
    })
  }

  const seek = (newIndex: number) => {
    const next = Math.max(0, Math.min(words.length - 1, newIndex))
    indexRef.current = next
    setIndex(next)
  }

  const currentWord = words[index] ?? ''
  const orpIndex = getOrpIndex(currentWord)
  const progress = words.length > 0 ? index / words.length : 0
  const wordsLeft = words.length - index

  return {
    index,
    currentWord,
    orpIndex,
    playing,
    progress,
    wordsLeft,
    toggle,
    pause,
    play,
    skip,
    seek,
  }
}

import { useEffect, useRef } from 'react'
import { bionicWord, getPageRange } from '../lib/readingUtils'

interface ClassicViewProps {
  words: string[]
  currentIndex: number
  wordsPerPage: number
  bionicReading: boolean
  fontSize: number
  onWordTap: (index: number) => void
  onPageNav: (direction: -1 | 1) => void
}

export function ClassicView({
  words,
  currentIndex,
  wordsPerPage,
  bionicReading,
  fontSize,
  onWordTap,
  onPageNav,
}: ClassicViewProps) {
  const highlightRef = useRef<HTMLSpanElement>(null)
  const { start, end, page, totalPages } = getPageRange(
    currentIndex,
    wordsPerPage,
    words.length,
  )

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIndex])

  const pageWords = words.slice(start, end)

  return (
    <div className="flex h-full flex-col">
      <div className="safe-top flex shrink-0 items-center justify-between gap-2 px-5 py-2 text-xs text-muted">
        <button
          type="button"
          onClick={() => onPageNav(-1)}
          disabled={page === 0}
          className="rounded-lg bg-surface-overlay px-2 py-1 disabled:opacity-30"
        >
          ← Prev
        </button>
        <span>
          Page {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageNav(1)}
          disabled={page >= totalPages - 1}
          className="rounded-lg bg-surface-overlay px-2 py-1 disabled:opacity-30"
        >
          Next →
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <p
          className="leading-relaxed text-text/90"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
        >
          {pageWords.map((word, i) => {
            const globalIndex = start + i
            const isCurrent = globalIndex === currentIndex
            const isPast = globalIndex < currentIndex

            if (bionicReading && !isCurrent) {
              const { bold, rest } = bionicWord(word)
              return (
                <span
                  key={globalIndex}
                  ref={isCurrent ? highlightRef : undefined}
                  role="button"
                  tabIndex={0}
                  onClick={() => onWordTap(globalIndex)}
                  onKeyDown={(e) => e.key === 'Enter' && onWordTap(globalIndex)}
                  className={`mr-1 inline cursor-pointer rounded-sm px-0.5 transition-colors ${
                    isCurrent
                      ? 'bg-accent/30 font-semibold text-accent ring-2 ring-accent/50'
                      : isPast
                        ? 'text-muted/60'
                        : 'hover:bg-surface-overlay'
                  }`}
                >
                  <strong className="font-semibold text-text">{bold}</strong>
                  {rest}{' '}
                </span>
              )
            }

            return (
              <span
                key={globalIndex}
                ref={isCurrent ? highlightRef : undefined}
                role="button"
                tabIndex={0}
                onClick={() => onWordTap(globalIndex)}
                onKeyDown={(e) => e.key === 'Enter' && onWordTap(globalIndex)}
                className={`mr-1 inline cursor-pointer rounded-sm px-0.5 transition-colors ${
                  isCurrent
                    ? 'bg-accent/30 font-semibold text-accent ring-2 ring-accent/50'
                    : isPast
                      ? 'text-muted/60'
                      : 'hover:bg-surface-overlay'
                }`}
              >
                {word}{' '}
              </span>
            )
          })}
        </p>
      </div>
    </div>
  )
}

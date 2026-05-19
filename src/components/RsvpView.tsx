import { getOrpIndex } from '../lib/tokenize'

interface RsvpViewProps {
  word: string
  progress: number
}

export function RsvpView({ word, progress }: RsvpViewProps) {
  const orpIndex = getOrpIndex(word)
  const before = word.slice(0, orpIndex)
  const orp = word[orpIndex] ?? ''
  const after = word.slice(orpIndex + 1)

  return (
    <div className="flex h-full flex-col">
      <div className="safe-top h-1 w-full bg-surface-overlay">
        <div
          className="h-full bg-accent transition-all duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="relative text-center">
          <div className="absolute left-1/2 top-1/2 h-14 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-orp/40" />
          <div
            className="font-semibold tracking-wide"
            style={{ fontSize: 'clamp(2.25rem, 10vw, 4rem)' }}
          >
            <span className="text-text/70">{before}</span>
            <span className="text-orp">{orp}</span>
            <span className="text-text/70">{after}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

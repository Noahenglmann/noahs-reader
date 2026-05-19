const PUNCTUATION_PAUSE: Record<string, number> = {
  '.': 1.8,
  '!': 1.8,
  '?': 1.8,
  ':': 1.4,
  ';': 1.4,
  ',': 1.25,
  '—': 1.3,
  '–': 1.3,
}

/** Ms delay for a word at given WPM, with optional smart punctuation pauses */
export function wordDelayMs(
  word: string,
  wpm: number,
  smartPauses: boolean,
): number {
  const base = 60000 / wpm
  if (!smartPauses) return base

  let multiplier = 1
  const last = word.slice(-1)
  if (PUNCTUATION_PAUSE[last]) multiplier = PUNCTUATION_PAUSE[last]
  if (word.length >= 12) multiplier = Math.max(multiplier, 1.2)

  return base * multiplier
}

export function wordsPerPageForScreen(): number {
  if (typeof window === 'undefined') return 180
  const h = window.innerHeight
  if (h < 600) return 120
  if (h < 750) return 150
  return 180
}

export function getPageRange(
  wordIndex: number,
  wordsPerPage: number,
  totalWords: number,
): { start: number; end: number; page: number; totalPages: number } {
  const page = Math.floor(wordIndex / wordsPerPage)
  const totalPages = Math.max(1, Math.ceil(totalWords / wordsPerPage))
  const start = page * wordsPerPage
  const end = Math.min(start + wordsPerPage, totalWords)
  return { start, end, page, totalPages }
}

export function formatTimeRemaining(wordsLeft: number, wpm: number): string {
  if (wpm <= 0 || wordsLeft <= 0) return '0 min'
  const minutes = wordsLeft / wpm
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${Math.ceil(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.ceil(minutes % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Bionic: bold first ~40% of letters in a word */
export function bionicWord(word: string): { bold: string; rest: string } {
  const match = word.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+)(.*)$/)
  if (!match) return { bold: word, rest: '' }
  const [, prefix, core, suffix] = match
  const boldLen = Math.max(1, Math.ceil(core.length * 0.4))
  return {
    bold: prefix + core.slice(0, boldLen),
    rest: core.slice(boldLen) + suffix,
  }
}

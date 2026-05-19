/** Split text into words for RSVP display, preserving punctuation attached to words */
export function tokenize(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
}

export function countWords(text: string): number {
  return tokenize(text).length
}

/** Optimal Recognition Point — index of letter to highlight for faster reading */
export function getOrpIndex(word: string): number {
  const clean = word.replace(/[^a-zA-Z0-9]/g, '')
  if (clean.length <= 1) return 0
  if (clean.length <= 5) return 1
  if (clean.length <= 9) return 2
  if (clean.length <= 13) return 3
  return 4
}

export type BookFormat = 'epub' | 'pdf' | 'mobi'

export interface Book {
  id: string
  title: string
  format: BookFormat
  /** IndexedDB key for cached ArrayBuffer */
  dataKey: string
  wordCount: number
  addedAt: number
  driveFileId?: string
}

export interface ReadingProgress {
  bookId: string
  wordIndex: number
  updatedAt: number
}

export interface StreakData {
  dailyGoal: number
  wordsReadToday: number
  lastReadDate: string // YYYY-MM-DD
  currentStreak: number
  longestStreak: number
  totalWordsRead: number
}

export interface AppSettings {
  wpm: number
  googleApiKey: string
  readAloud: boolean
  smartPauses: boolean
  bionicReading: boolean
  speechRate: number
  speechVoiceUri: string
}

export type Tab = 'library' | 'streak' | 'settings'

import type { Book, ReadingProgress, StreakData, AppSettings } from '../types'

const DB_NAME = 'readrr-db'
const DB_VERSION = 1
const STORE_BOOKS = 'books'
const STORE_DATA = 'bookData'

const DEFAULT_STREAK: StreakData = {
  dailyGoal: 2000,
  wordsReadToday: 0,
  lastReadDate: '',
  currentStreak: 0,
  longestStreak: 0,
  totalWordsRead: 0,
}

const DEFAULT_SETTINGS: AppSettings = {
  wpm: 300,
  googleApiKey: '',
  readAloud: false,
  smartPauses: true,
  bionicReading: false,
  speechRate: 1,
  speechVoiceUri: '',
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_BOOKS)) {
        db.createObjectStore(STORE_BOOKS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_DATA)) {
        db.createObjectStore(STORE_DATA)
      }
    }
  })
}

export async function saveBookData(key: string, data: ArrayBuffer): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATA, 'readwrite')
    tx.objectStore(STORE_DATA).put(data, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getBookData(key: string): Promise<ArrayBuffer | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATA, 'readonly')
    const req = tx.objectStore(STORE_DATA).get(key)
    req.onsuccess = () => resolve((req.result as ArrayBuffer) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteBookData(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DATA, 'readwrite')
    tx.objectStore(STORE_DATA).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getBooks(): Book[] {
  return lsGet<Book[]>('readrr-books', [])
}

export function saveBooks(books: Book[]): void {
  lsSet('readrr-books', books)
}

export function getProgress(bookId: string): ReadingProgress | null {
  const all = lsGet<Record<string, ReadingProgress>>('readrr-progress', {})
  return all[bookId] ?? null
}

export function saveProgress(progress: ReadingProgress): void {
  const all = lsGet<Record<string, ReadingProgress>>('readrr-progress', {})
  all[progress.bookId] = progress
  lsSet('readrr-progress', all)
}

export function getStreak(): StreakData {
  return lsGet<StreakData>('readrr-streak', DEFAULT_STREAK)
}

export function saveStreak(streak: StreakData): void {
  lsSet('readrr-streak', streak)
}

export function getSettings(): AppSettings {
  const stored = lsGet<AppSettings>('readrr-settings', DEFAULT_SETTINGS)
  return { ...DEFAULT_SETTINGS, ...stored }
}

export function saveSettings(settings: AppSettings): void {
  lsSet('readrr-settings', settings)
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function recordWordsRead(count: number): StreakData {
  const streak = getStreak()
  const today = todayStr()

  if (streak.lastReadDate !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().slice(0, 10)

    const metGoalYesterday =
      streak.lastReadDate === yesterdayStr && streak.wordsReadToday >= streak.dailyGoal

    if (metGoalYesterday) {
      streak.currentStreak = Math.max(1, streak.currentStreak + 1)
    } else if (streak.lastReadDate) {
      streak.currentStreak = 0
    }

    streak.wordsReadToday = 0
    streak.lastReadDate = today
  }

  streak.wordsReadToday += count
  streak.totalWordsRead += count

  if (streak.wordsReadToday >= streak.dailyGoal) {
    if (streak.currentStreak === 0) streak.currentStreak = 1
    streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak)
  }

  saveStreak(streak)
  return streak
}

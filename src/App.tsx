import { useCallback, useState } from 'react'
import type { Book, StreakData, AppSettings, Tab } from './types'
import { getBooks, getStreak, getSettings } from './lib/storage'
import { Library } from './components/Library'
import { Streak } from './components/Streak'
import { Settings } from './components/Settings'
import { Reader } from './components/Reader'
import { NavBottom } from './components/NavBottom'

export default function App() {
  const [tab, setTab] = useState<Tab>('library')
  const [books, setBooks] = useState<Book[]>(getBooks)
  const [streak, setStreak] = useState<StreakData>(getStreak)
  const [settings, setSettings] = useState<AppSettings>(getSettings)
  const [activeBook, setActiveBook] = useState<Book | null>(null)

  const handleStreakUpdate = useCallback(() => {
    setStreak(getStreak())
  }, [])

  if (activeBook) {
    return (
      <Reader
        book={activeBook}
        onClose={() => setActiveBook(null)}
        onStreakUpdate={handleStreakUpdate}
      />
    )
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      <main className="flex-1 overflow-hidden">
        {tab === 'library' && (
          <Library
            books={books}
            onBooksChange={setBooks}
            onOpenBook={setActiveBook}
          />
        )}
        {tab === 'streak' && (
          <Streak streak={streak} onStreakChange={setStreak} />
        )}
        {tab === 'settings' && (
          <Settings settings={settings} onSettingsChange={setSettings} />
        )}
      </main>
      <NavBottom active={tab} onChange={setTab} />
    </div>
  )
}

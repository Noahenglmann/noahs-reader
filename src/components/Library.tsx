import { useState } from 'react'
import type { Book } from '../types'
import { deleteBookData, getBooks, saveBooks, getProgress } from '../lib/storage'
import { BookBrowser } from './BookBrowser'

interface LibraryProps {
  books: Book[]
  onBooksChange: (books: Book[]) => void
  onOpenBook: (book: Book) => void
}

export function Library({ books, onBooksChange, onOpenBook }: LibraryProps) {
  const [showBrowser, setShowBrowser] = useState(false)

  async function handleDelete(book: Book) {
    await deleteBookData(book.dataKey)
    const updated = books.filter((b) => b.id !== book.id)
    saveBooks(updated)
    onBooksChange(updated)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="safe-top shrink-0 px-5 pb-4 pt-2">
        <h1 className="text-2xl font-serif font-bold tracking-tight">Noah's Reader</h1>
        <p className="mt-1 text-sm text-muted font-serif">Your personal library</p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl font-serif font-light mb-6">Library</div>
            <p className="text-muted font-serif mb-6">No books imported yet</p>
            <button
              type="button"
              onClick={() => setShowBrowser(true)}
              className="bubble-card bg-accent text-white px-6 py-3 font-serif font-semibold hover:scale-105 transition-transform active:scale-95"
            >
              Browse Google Drive
            </button>
          </div>
        )}

        {books.length > 0 && (
          <>
            <div className="mb-4 flex justify-between items-center">
              <span className="text-sm text-muted font-serif">
                {books.length} book{books.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => setShowBrowser(true)}
                className="text-xs text-accent font-serif font-semibold hover:underline transition-colors"
              >
                Add more
              </button>
            </div>
            <ul className="space-y-3">
              {books.map((book) => (
                <li
                  key={book.id}
                  className="bubble-card flex items-center gap-4 cursor-pointer hover:scale-105 transition-transform active:scale-95"
                >
                  <button
                    type="button"
                    onClick={() => onOpenBook(book)}
                    className="flex flex-1 flex-col items-start text-left"
                  >
                    <span className="font-serif text-lg font-semibold leading-snug">
                      {book.title}
                    </span>
                    <span className="mt-1.5 text-sm text-muted font-serif">
                      {book.format.toUpperCase()} · {book.wordCount.toLocaleString()} words
                      {(() => {
                        const p = getProgress(book.id)
                        if (!p || p.wordIndex === 0) return null
                        const pct = Math.round((p.wordIndex / book.wordCount) * 100)
                        return ` · ${pct}% read`
                      })()}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(book)}
                    className="shrink-0 text-accent hover:text-red-400 transition-colors text-2xl active:scale-75"
                    aria-label="Remove from library"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {showBrowser && (
        <BookBrowser
          onClose={() => setShowBrowser(false)}
          onImport={(updated) => {
            onBooksChange(updated)
            setShowBrowser(false)
          }}
        />
      )}
    </div>
  )
}

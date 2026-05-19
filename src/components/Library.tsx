import { useCallback, useEffect, useRef, useState } from 'react'
import type { Book } from '../types'
import {
  downloadDriveFile,
  listAllBooksRecursive,
  getGoogleApiKey,
} from '../lib/drive'
import { DRIVE_LIBRARY_FOLDER_ID } from '../lib/driveConfig'
import { detectFormat, extractWords } from '../lib/parsers'
import {
  getBooks,
  saveBooks,
  saveBookData,
  deleteBookData,
  getSettings,
  getProgress,
} from '../lib/storage'

interface LibraryProps {
  books: Book[]
  onBooksChange: (books: Book[]) => void
  onOpenBook: (book: Book) => void
}

export function Library({ books, onBooksChange, onOpenBook }: LibraryProps) {
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState('')
  const syncedRef = useRef(false)

  async function importFile(
    data: ArrayBuffer,
    name: string,
    driveFileId: string,
  ) {
    const format = detectFormat(name)
    if (!format) {
      throw new Error(`Unsupported format: ${name}`)
    }

    const { words, title } = await extractWords(data, format, name)
    const id = crypto.randomUUID()
    const dataKey = `book-${id}`

    await saveBookData(dataKey, data)

    const book: Book = {
      id,
      title,
      format,
      dataKey,
      wordCount: words.length,
      addedAt: Date.now(),
      driveFileId,
    }

    const updated = [...getBooks(), book]
    saveBooks(updated)
    onBooksChange(updated)
    return book
  }

  const syncLibrary = useCallback(async () => {
    const apiKey = getGoogleApiKey(getSettings().googleApiKey)
    if (!apiKey) {
      setStatus('Add a Google API key in Settings to load your library.')
      return
    }

    setSyncing(true)
    setStatus('Loading your library…')

    try {
      const driveFiles = await listAllBooksRecursive(DRIVE_LIBRARY_FOLDER_ID, apiKey)
      const existing = getBooks()
      const existingIds = new Set(
        existing.map((b) => b.driveFileId).filter(Boolean),
      )

      const toImport = driveFiles.filter((f) => !existingIds.has(f.id))

      if (driveFiles.length === 0) {
        setStatus('No books found in your Drive folder yet.')
        return
      }

      if (toImport.length === 0) {
        setStatus(`${existing.length} book${existing.length !== 1 ? 's' : ''} ready`)
        return
      }

      let added = 0
      for (const file of toImport) {
        setStatus(`Downloading ${file.name}… (${added + 1}/${toImport.length})`)
        const data = await downloadDriveFile(file.id)
        await importFile(data, file.name, file.id)
        added++
      }

      const total = getBooks().length
      setStatus(`Added ${added} new book${added !== 1 ? 's' : ''} · ${total} total`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Could not load library')
    } finally {
      setSyncing(false)
    }
  }, [onBooksChange])

  useEffect(() => {
    if (syncedRef.current) return
    syncedRef.current = true
    syncLibrary()
  }, [syncLibrary])

  async function handleDelete(book: Book) {
    await deleteBookData(book.dataKey)
    const updated = books.filter((b) => b.id !== book.id)
    saveBooks(updated)
    onBooksChange(updated)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="safe-top shrink-0 px-5 pb-4 pt-2">
        <h1 className="text-2xl font-serif font-bold tracking-tight">Noah&apos;s Reader</h1>
        <p className="mt-1 text-sm text-muted font-serif">Your books from Google Drive</p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {status && (
          <p
            className={`mb-4 text-center text-sm ${
              status.includes('fail') ||
              status.includes('required') ||
              status.includes('Could not')
                ? 'text-red-400'
                : 'text-muted'
            }`}
          >
            {syncing ? '… ' : ''}
            {status}
          </p>
        )}

        {syncing && books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl animate-pulse">📚</p>
            <p className="mt-4 text-muted">Syncing your library…</p>
          </div>
        )}

        {!syncing && books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl">📚</p>
            <p className="mt-4 text-muted">No books yet</p>
            <button
              type="button"
              onClick={syncLibrary}
              className="mt-4 rounded-xl bg-accent px-5 py-2 text-sm font-medium text-white"
            >
              Retry sync
            </button>
          </div>
        )}

        {books.length > 0 && (
          <>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={syncLibrary}
                disabled={syncing}
                className="text-xs text-accent font-serif font-semibold disabled:opacity-40 hover:scale-110 transition-transform"
              >
                {syncing ? 'Syncing…' : 'Refresh'}
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
                    <span className="font-serif text-lg font-semibold leading-snug">{book.title}</span>
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
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

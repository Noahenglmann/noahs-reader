import { useEffect, useState } from 'react'
import type { Book } from '../types'
import {
  listAllBooksRecursive,
  getGoogleApiKey,
  downloadDriveFile,
  formatFromMime,
} from '../lib/drive'
import { DRIVE_LIBRARY_FOLDER_ID } from '../lib/driveConfig'
import { detectFormat, extractWords } from '../lib/parsers'
import {
  getBooks,
  saveBooks,
  saveBookData,
  getSettings,
} from '../lib/storage'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
}

interface BookBrowserProps {
  onClose: () => void
  onImport: (books: Book[]) => void
}

export function BookBrowser({ onClose, onImport }: BookBrowserProps) {
  const [availableBooks, setAvailableBooks] = useState<DriveFile[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('')

  useEffect(() => {
    async function loadBooks() {
      try {
        setLoading(true)
        const apiKey = getGoogleApiKey(getSettings().googleApiKey)
        if (!apiKey) {
          setError('API key not configured')
          return
        }

        const driveFiles = await listAllBooksRecursive(DRIVE_LIBRARY_FOLDER_ID, apiKey)
        const existing = getBooks()
        const existingIds = new Set(existing.map((b) => b.driveFileId).filter(Boolean))

        // Filter out already imported books
        const newBooks = driveFiles.filter((f) => !existingIds.has(f.id))

        if (newBooks.length === 0) {
          setError('No new books found in your Drive folder')
        } else {
          setAvailableBooks(newBooks)
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Failed to load books from Drive',
        )
      } finally {
        setLoading(false)
      }
    }

    loadBooks()
  }, [])

  function toggleBook(id: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  function toggleAll() {
    if (selectedIds.size === availableBooks.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(availableBooks.map((b) => b.id)))
    }
  }

  async function handleImport() {
    if (selectedIds.size === 0) return

    setImporting(true)
    const booksToImport = availableBooks.filter((b) => selectedIds.has(b.id))
    const importedBooks: Book[] = []

    try {
      let count = 0
      for (const file of booksToImport) {
        const format = formatFromMime(file.mimeType, file.name)
        if (!format) continue

        count++
        setImportProgress(
          `Importing: ${file.name.substring(0, 30)}... (${count}/${selectedIds.size})`,
        )

        try {
          const data = await downloadDriveFile(file.id)
          const { words, title } = await extractWords(data, format, file.name)
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
            driveFileId: file.id,
          }

          importedBooks.push(book)
        } catch (e) {
          console.error(`Failed to import ${file.name}:`, e)
          setImportProgress(
            `Error importing ${file.name.substring(0, 20)}... - skipping`,
          )
          await new Promise((r) => setTimeout(r, 1000))
        }
      }

      if (importedBooks.length > 0) {
        const existing = getBooks()
        const updated = [...existing, ...importedBooks]
        saveBooks(updated)
        onImport(updated)
      }

      setImportProgress(
        `Successfully imported ${importedBooks.length} book${importedBooks.length !== 1 ? 's' : ''}`,
      )
      setTimeout(onClose, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="w-full bg-surface-raised rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 px-5 pt-4 pb-3 border-b border-surface-overlay/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-serif font-bold">Available Books</h2>
            <button
              onClick={onClose}
              className="text-2xl text-muted hover:text-text"
            >
              ×
            </button>
          </div>
          {!importing && availableBooks.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-accent font-serif hover:underline"
            >
              {selectedIds.size === availableBooks.length
                ? 'Deselect all'
                : `Select all (${availableBooks.length})`}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && <p className="text-center text-muted font-serif">Loading books...</p>}
          {error && !loading && (
            <p className="text-center text-red-400 font-serif">{error}</p>
          )}
          {!loading && !error && availableBooks.length === 0 && (
            <p className="text-center text-muted font-serif">No books found</p>
          )}

          {!loading && !error && !importing && (
            <ul className="space-y-2">
              {availableBooks.map((file) => (
                <li
                  key={file.id}
                  className="bubble-card flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-overlay/50 transition-colors"
                  onClick={() => toggleBook(file.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(file.id)}
                    onChange={() => toggleBook(file.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-semibold truncate">{file.name}</p>
                    <p className="text-xs text-muted font-serif">
                      {file.mimeType
                        .split('/')
                        .pop()
                        ?.toUpperCase() || 'Unknown'}
                      {file.size && ` · ${(parseInt(file.size) / 1024 / 1024).toFixed(1)}MB`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {importing && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-center text-muted font-serif">{importProgress}</p>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-surface-overlay/40 flex gap-3">
          <button
            onClick={onClose}
            disabled={importing}
            className="flex-1 bubble-card py-2 font-serif font-semibold text-muted hover:text-text transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedIds.size === 0 || importing}
            className="flex-1 bubble-card bg-accent text-white py-2 font-serif font-semibold hover:scale-105 transition-transform active:scale-95 disabled:opacity-40"
          >
            {importing
              ? 'Importing...'
              : `Import (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

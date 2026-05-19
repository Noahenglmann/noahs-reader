import { useRef, useState } from 'react'
import type { Book } from '../types'
import {
  parseDriveUrl,
  downloadDriveFile,
  listFolderFiles,
  getDriveFileMeta,
} from '../lib/drive'
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
  const [driveUrl, setDriveUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function importFile(
    data: ArrayBuffer,
    name: string,
    driveFileId?: string,
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

  async function handleDriveImport() {
    const parsed = parseDriveUrl(driveUrl)
    if (!parsed) {
      setStatus('Invalid Google Drive link')
      return
    }

    setLoading(true)
    setStatus('')

    try {
      const settings = getSettings()

      if (parsed.type === 'file') {
        setStatus('Downloading…')
        const data = await downloadDriveFile(parsed.id)
        let name = 'book.epub'
        if (settings.googleApiKey) {
          const meta = await getDriveFileMeta(parsed.id, settings.googleApiKey)
          name = meta.name
        }
        const book = await importFile(data, name, parsed.id)
        setStatus(`Added "${book.title}"`)
        setDriveUrl('')
      } else {
        setStatus('Listing folder…')
        const files = await listFolderFiles(parsed.id, settings.googleApiKey)
        if (files.length === 0) {
          setStatus('No EPUB, PDF, or MOBI files found in folder')
          return
        }
        let added = 0
        for (const file of files) {
          setStatus(`Downloading ${file.name}…`)
          const data = await downloadDriveFile(file.id)
          await importFile(data, file.name, file.id)
          added++
        }
        setStatus(`Added ${added} book${added !== 1 ? 's' : ''}`)
        setDriveUrl('')
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files?.length) return
    setLoading(true)
    setStatus('')

    try {
      for (const file of Array.from(files)) {
        const format = detectFormat(file.name)
        if (!format) {
          setStatus(`Skipped ${file.name} (unsupported format)`)
          continue
        }
        const data = await file.arrayBuffer()
        const book = await importFile(data, file.name)
        setStatus(`Added "${book.title}"`)
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(book: Book) {
    await deleteBookData(book.dataKey)
    const updated = books.filter((b) => b.id !== book.id)
    saveBooks(updated)
    onBooksChange(updated)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="safe-top shrink-0 px-5 pb-4 pt-2">
        <h1 className="text-2xl font-bold tracking-tight">Noah&apos;s Reader</h1>
        <p className="mt-1 text-sm text-muted">
          EPUB, PDF & MOBI — from Drive or your device
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* Google Drive import */}
        <section className="mb-6 rounded-2xl bg-surface-raised p-4">
          <h2 className="mb-2 text-sm font-medium text-muted">Google Drive</h2>
          <input
            type="url"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            placeholder="Paste Drive file or folder link"
            className="w-full rounded-xl bg-surface-overlay px-4 py-3 text-sm outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-accent/50"
          />
          <button
            type="button"
            onClick={handleDriveImport}
            disabled={loading || !driveUrl.trim()}
            className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {loading ? 'Importing…' : 'Import from Drive'}
          </button>
          <p className="mt-2 text-xs text-muted">
            Files must be shared as &quot;Anyone with the link&quot;. Folders need a
            Google API key in Settings.
          </p>
        </section>

        {/* Local upload */}
        <section className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".epub,.pdf,.mobi,.azw,.azw3"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="w-full rounded-xl border border-dashed border-muted/40 py-4 text-sm text-muted"
          >
            Upload from device
          </button>
        </section>

        {status && (
          <p
            className={`mb-4 text-center text-sm ${
              status.includes('fail') || status.includes('Invalid') || status.includes('Unsupported')
                ? 'text-red-400'
                : 'text-accent'
            }`}
          >
            {status}
          </p>
        )}

        {/* Book list */}
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl">📚</p>
            <p className="mt-4 text-muted">No books yet</p>
            <p className="mt-1 text-sm text-muted/70">
              Import from Google Drive or upload a file
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {books.map((book) => (
              <li
                key={book.id}
                className="flex items-center gap-3 rounded-2xl bg-surface-raised p-4"
              >
                <button
                  type="button"
                  onClick={() => onOpenBook(book)}
                  className="flex flex-1 flex-col items-start text-left"
                >
                  <span className="font-medium leading-snug">{book.title}</span>
                  <span className="mt-1 text-xs text-muted">
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
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-400/80"
                  aria-label="Delete book"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

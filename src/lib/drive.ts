import type { BookFormat } from '../types'
import { detectFormat } from './parsers'
import { GOOGLE_API_KEY } from './driveConfig'

export interface DriveFile {
  id: string
  name: string
  mimeType: string
}

const BOOK_MIMES: Record<string, BookFormat> = {
  'application/epub+zip': 'epub',
  'application/pdf': 'pdf',
  'application/x-mobipocket-ebook': 'mobi',
  'application/vnd.amazon.ebook': 'mobi',
}

export function parseDriveUrl(url: string): { type: 'file' | 'folder'; id: string } | null {
  const trimmed = url.trim()

  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return { type: 'file', id: fileMatch[1] }

  const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (openMatch && trimmed.includes('drive.google.com')) {
    return { type: trimmed.includes('folders') ? 'folder' : 'file', id: openMatch[1] }
  }

  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (folderMatch) return { type: 'folder', id: folderMatch[1] }

  return null
}

export function formatFromFilename(name: string): BookFormat | null {
  return detectFormat(name)
}

export function formatFromMime(mime: string, name: string): BookFormat | null {
  return BOOK_MIMES[mime] ?? formatFromFilename(name)
}

/** Direct download URL for publicly shared Drive files */
export function driveDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}

/** Fetch file bytes from a public Google Drive link */
export async function downloadDriveFile(fileId: string): Promise<ArrayBuffer> {
  let url = driveDownloadUrl(fileId)
  let response = await fetch(url, { redirect: 'follow' })

  // Large files return a virus-scan confirmation page
  const html = await response.clone().text().catch(() => '')
  if (html.includes('confirm=')) {
    const tokenMatch = html.match(/confirm=([0-9A-Za-z_-]+)/)
    if (tokenMatch) {
      url = `${driveDownloadUrl(fileId)}&confirm=${tokenMatch[1]}`
      response = await fetch(url, { redirect: 'follow' })
    }
  }

  if (!response.ok) {
    throw new Error(
      'Could not download file. Make sure it is shared as "Anyone with the link".',
    )
  }

  return response.arrayBuffer()
}

const FOLDER_MIME = 'application/vnd.google-apps.folder'

async function listFolderContents(
  folderId: string,
  apiKey: string,
): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken,files(id,name,mimeType,size)',
      key: apiKey,
      pageSize: '100',
    })
    if (pageToken) params.set('pageToken', pageToken)

    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?${params}`,
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ??
            'Failed to list folder. Check your folder sharing settings - folder must be shared as "Anyone with the link".',
        )
      }

      const data = (await res.json()) as {
        files: DriveFile[]
        nextPageToken?: string
      }
      files.push(...data.files)
      pageToken = data.nextPageToken
    } catch (e) {
      throw e instanceof Error ? e : new Error('Network error accessing Google Drive')
    }
  } while (pageToken)

  return files
}

/** List book files in a folder (non-recursive) */
export async function listFolderFiles(
  folderId: string,
  apiKey: string,
): Promise<DriveFile[]> {
  if (!apiKey) {
    throw new Error(
      'A Google API key is required. Add VITE_GOOGLE_API_KEY or set one in Settings.',
    )
  }
  const files = await listFolderContents(folderId, apiKey)
  return files.filter((f) => formatFromMime(f.mimeType, f.name) !== null)
}

/** Recursively find all EPUB/PDF/MOBI files under a folder */
export async function listAllBooksRecursive(
  rootFolderId: string,
  apiKey: string,
): Promise<DriveFile[]> {
  if (!apiKey) {
    throw new Error(
      'A Google API key is required. Add VITE_GOOGLE_API_KEY or set one in Settings.',
    )
  }

  const books: DriveFile[] = []
  const queue = [rootFolderId]

  while (queue.length > 0) {
    const folderId = queue.shift()!
    const items = await listFolderContents(folderId, apiKey)

    for (const item of items) {
      if (item.mimeType === FOLDER_MIME) {
        queue.push(item.id)
      } else if (formatFromMime(item.mimeType, item.name)) {
        books.push(item)
      }
    }
  }

  return books
}

export function getGoogleApiKey(_settingsKey: string): string {
  // Always use hardcoded API key - user input no longer needed
  return GOOGLE_API_KEY
}

export async function getDriveFileMeta(
  fileId: string,
  apiKey: string,
): Promise<{ name: string; mimeType: string }> {
  const params = new URLSearchParams({
    fields: 'name,mimeType',
    key: apiKey,
  })
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?${params}`,
  )
  if (!res.ok) {
    return { name: 'Book', mimeType: '' }
  }
  return res.json()
}

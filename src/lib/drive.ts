import type { BookFormat } from '../types'
import { detectFormat } from './parsers'

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

/** List files in a public folder via Google Drive API */
export async function listFolderFiles(
  folderId: string,
  apiKey: string,
): Promise<DriveFile[]> {
  if (!apiKey) {
    throw new Error(
      'A Google API key is required to import folders. Add one in Settings.',
    )
  }

  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken,files(id,name,mimeType)',
      key: apiKey,
      pageSize: '100',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ??
          'Failed to list folder. Check your API key and folder sharing.',
      )
    }

    const data = (await res.json()) as {
      files: DriveFile[]
      nextPageToken?: string
    }
    files.push(...data.files)
    pageToken = data.nextPageToken
  } while (pageToken)

  return files.filter((f) => formatFromMime(f.mimeType, f.name) !== null)
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

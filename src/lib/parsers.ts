import ePub from 'epubjs'
import * as pdfjs from 'pdfjs-dist'
import { initMobiFile } from '@lingo-reader/mobi-parser'
import type { BookFormat } from '../types'
import { tokenize } from './tokenize'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export function detectFormat(filename: string): BookFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'epub') return 'epub'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'mobi' || ext === 'azw' || ext === 'azw3') return 'mobi'
  return null
}

export async function extractWords(
  data: ArrayBuffer,
  format: BookFormat,
  title?: string,
): Promise<{ words: string[]; title: string }> {
  switch (format) {
    case 'epub':
      return extractEpub(data, title)
    case 'pdf':
      return extractPdf(data, title)
    case 'mobi':
      return extractMobi(data, title)
  }
}

async function extractEpub(
  data: ArrayBuffer,
  fallbackTitle?: string,
): Promise<{ words: string[]; title: string }> {
  const book = ePub(data)
  await book.ready

  const metaTitle = book.packaging?.metadata?.title
  const bookTitle = (typeof metaTitle === 'string' ? metaTitle : fallbackTitle) ?? 'Untitled'

  const allWords: string[] = []
  const spine = await book.loaded.spine

  for (const item of spine.items) {
    const section = book.section(item.href)
    if (!section) continue
    const contents = await section.load(book.load.bind(book))
    const doc = contents as Document
    const text = doc.body?.textContent ?? ''
    allWords.push(...tokenize(text))
    section.unload()
  }

  return { words: allWords, title: bookTitle }
}

async function extractPdf(
  data: ArrayBuffer,
  fallbackTitle?: string,
): Promise<{ words: string[]; title: string }> {
  const pdf = await pdfjs.getDocument({ data }).promise
  const meta = await pdf.getMetadata().catch(() => null)
  const info = meta?.info as { Title?: string } | undefined
  const bookTitle = info?.Title || fallbackTitle || 'Untitled'

  const allWords: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    allWords.push(...tokenize(text))
  }

  return { words: allWords, title: bookTitle }
}

async function extractMobi(
  data: ArrayBuffer,
  fallbackTitle?: string,
): Promise<{ words: string[]; title: string }> {
  const mobi = await initMobiFile(new Uint8Array(data))
  const metadata = mobi.getMetadata()
  const bookTitle = metadata?.title || fallbackTitle || 'Untitled'

  const allWords: string[] = []
  const spine = mobi.getSpine()

  for (const chapter of spine) {
    const loaded = mobi.loadChapter(chapter.id)
    if (!loaded) continue
    const text = loaded.html.replace(/<[^>]+>/g, ' ')
    allWords.push(...tokenize(text))
  }

  mobi.destroy()
  return { words: allWords, title: bookTitle }
}

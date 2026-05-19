declare module 'epubjs' {
  interface EpubBook {
    ready: Promise<void>
    packaging?: { metadata?: { title?: string } }
    loaded: {
      spine: Promise<{ items: { href: string }[] }>
    }
    section(href: string): {
      load(loadFn: (url: string) => Promise<unknown>): Promise<Document>
      unload(): void
    } | null
    load(url: string): Promise<unknown>
  }
  function ePub(data: ArrayBuffer): EpubBook
  export default ePub
}

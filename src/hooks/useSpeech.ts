import { useCallback, useEffect, useRef, useState } from 'react'

export function useSpeech() {
  const [supported, setSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'speechSynthesis' in window
    setSupported(ok)
    if (!ok) return

    const load = () => setVoices(speechSynthesis.getVoices())
    load()
    speechSynthesis.addEventListener('voiceschanged', load)
    return () => speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const cancel = useCallback(() => {
    speechSynthesis.cancel()
    utterRef.current = null
  }, [])

  const speakWord = useCallback(
    (word: string, rate: number, voiceUri?: string) => {
      if (!supported || !word.trim()) return
      cancel()

      const utter = new SpeechSynthesisUtterance(word.replace(/[^\w\s'-]/g, ''))
      utter.rate = Math.max(0.5, Math.min(2, rate))
      utter.pitch = 1
      if (voiceUri) {
        const voice = voices.find((v) => v.voiceURI === voiceUri)
        if (voice) utter.voice = voice
      }
      utterRef.current = utter
      speechSynthesis.speak(utter)
    },
    [supported, voices, cancel],
  )

  useEffect(() => () => cancel(), [cancel])

  return { supported, voices, speakWord, cancel }
}

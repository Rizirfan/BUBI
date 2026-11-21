import { useEffect, useRef, useState } from 'react'
import { EmojiPicker } from './EmojiPicker'
import { useSettingsStore } from '@/features/settings/store'

export function Composer({
  onSend,
}: {
  onSend: (text: string, emojiIds: string[]) => void
}) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const { sendOnEnter } = useSettingsStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed, [])
    setText('')
    setShowEmoji(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  // Click outside to close emoji picker
  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(ev.target as Node)) {
        setShowEmoji(false)
      }
    }
    if (showEmoji) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmoji])

  function insertEmoji(emoji: string) {
    setText((prev) => {
      const cursor = textareaRef.current?.selectionStart ?? prev.length
      const before = prev.slice(0, cursor)
      const after = prev.slice(cursor)
      return `${before}${emoji}${after}`
    })
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  return (
    <div className="relative px-3 sm:px-4 py-2.5 bg-[var(--surface)] border-t border-[var(--border)] pb-[calc(10px+var(--safe-bottom))]">
      {/* Real Emoji Picker Popover */}
      {showEmoji && (
        <div ref={pickerRef} className="absolute bottom-full left-3 sm:left-4 mb-2 z-40">
          <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 max-w-4xl mx-auto">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition text-base ${
            showEmoji
              ? 'bg-blue-600 text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
          }`}
          aria-label="Emojis"
          title="Emojis"
        >
          😀
        </button>

        {/* Text Area */}
        <div className="flex-1 bg-[var(--surface-hover)] border border-[var(--border)] rounded-2xl px-3.5 py-1.5 focus-within:border-blue-500 transition">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (sendOnEnter && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              } else if (!sendOnEnter && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder="Message…"
            className="w-full resize-none bg-transparent text-[var(--text)] text-sm leading-relaxed placeholder-[var(--text-muted)] outline-none max-h-28 py-0.5 scrollbar-none"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!text.trim()}
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition ${
            text.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
              : 'bg-[var(--surface-hover)] text-[var(--text-muted)] opacity-50 cursor-not-allowed'
          }`}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { EmojiPicker } from './EmojiPicker'

export function Composer({
  onSend,
}: {
  onSend: (text: string, emojiIds: string[]) => void
}) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    const emojiIds = [...trimmed.matchAll(/\[:([a-z0-9_-]+):\]/g)].map((m) => m[1])
    onSend(trimmed, emojiIds)
    setText('')
    setShowEmoji(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  // Auto-resize textarea up to max height
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
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

  function insertEmoji(id: string) {
    setText((prev) => {
      const cursor = textareaRef.current?.selectionStart ?? prev.length
      const before = prev.slice(0, cursor)
      const after = prev.slice(cursor)
      return `${before}[:${id}:]${after}`
    })
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  return (
    <div className="relative px-3 sm:px-4 py-3 bg-[#0d0e14]/90 backdrop-blur-xl border-t border-white/8 pb-[calc(12px+var(--safe-bottom))]">
      {/* Emoji Picker Popover */}
      {showEmoji && (
        <div ref={pickerRef} className="absolute bottom-full left-3 sm:left-4 mb-3 z-40">
          <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 max-w-4xl mx-auto">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            showEmoji
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-100 border border-white/5'
          }`}
          aria-label="Toggle emoji picker"
          title="Custom Vector Emojis"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
        </button>

        {/* Text Input Container */}
        <div className="flex-1 min-h-[42px] max-h-36 bg-[#161722] border border-white/10 rounded-2xl px-3.5 py-1.5 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all flex items-center">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder="Message…"
            className="w-full resize-none bg-transparent text-white text-[14.5px] leading-relaxed placeholder-zinc-500 outline-none max-h-32 py-1 scrollbar-none"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!text.trim()}
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            text.trim()
              ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/30 hover:brightness-110 active:scale-95'
              : 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}

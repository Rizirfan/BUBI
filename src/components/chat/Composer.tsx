import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { EmojiPicker } from './EmojiPicker'
import { useSettingsStore } from '@/features/settings/store'

export function Composer({
  onSend,
  onTypingFocus,
}: {
  onSend: (text: string, emojiIds: string[]) => void
  onTypingFocus?: () => void
}) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const { sendOnEnter } = useSettingsStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Dynamically calculate and adjust the text bar height based on content
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    // Temporarily reset height to 0 to accurately detect scrollHeight
    el.style.height = '0px'
    const scrollH = el.scrollHeight
    // Dynamic bounded expansion: min single-line height = 36px, max height = 140px (~5 lines)
    const nextHeight = Math.max(36, Math.min(scrollH, 140))
    el.style.height = `${nextHeight}px`
    el.style.overflowY = scrollH > 140 ? 'auto' : 'hidden'
  }, [])

  // Auto-grow and shrink dynamically whenever text changes (typed, pasted, emoji, deleted, or cleared)
  useLayoutEffect(() => {
    adjustHeight()
  }, [text, adjustHeight])

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed, [])
    setText('')
    setShowEmoji(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = '36px'
      textareaRef.current.style.overflowY = 'hidden'
    }
  }

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
      adjustHeight()
    }, 50)
  }

  return (
    <div className="shrink-0 sticky bottom-0 z-20 w-full px-3 sm:px-4 py-2 bg-[var(--header-bg)]/95 backdrop-blur-md border-t border-[var(--border)] pb-[calc(8px+var(--safe-bottom))] shadow-xs transition-all">
      {/* Real Emoji Picker Popover */}
      {showEmoji && (
        <div ref={pickerRef} className="absolute bottom-full left-3 sm:left-4 mb-2 z-40">
          <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 max-w-4xl mx-auto">
        {/* Emoji Button - aligned cleanly with bottom line */}
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition text-xl cursor-pointer ${
            showEmoji
              ? 'text-[var(--wa-green)] bg-[var(--surface-hover)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
          }`}
          aria-label="Emojis"
          title="Emojis"
        >
          😀
        </button>

        {/* Dynamic WhatsApp-style Expanding Text Pill */}
        <div className="flex-1 min-w-0 bg-[var(--surface-active)] border border-[var(--border)] focus-within:border-[var(--wa-green)] focus-within:ring-2 focus-within:ring-[var(--wa-green)]/20 rounded-2xl px-3.5 py-1 transition-all">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onInput={adjustHeight}
            onFocus={() => {
              onTypingFocus?.()
            }}
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
            placeholder="Type a message"
            className="w-full resize-none bg-transparent text-[var(--text)] text-[15px] leading-[22px] placeholder-[var(--text-muted)] outline-none py-1.5 block scrollbar-none transition-[height] duration-75"
            style={{ height: '36px', minHeight: '36px', maxHeight: '140px', overflowY: 'hidden' }}
          />
        </div>

        {/* WhatsApp Circular Green Send Button */}
        <button
          type="submit"
          disabled={!text.trim()}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
            text.trim()
              ? 'bg-[var(--wa-green)] text-white hover:bg-[var(--wa-green-hover)] active:scale-95 cursor-pointer shadow-orange-500/20'
              : 'bg-[var(--surface-active)] text-[var(--text-muted)] opacity-50 cursor-not-allowed'
          }`}
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}

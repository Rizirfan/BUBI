import { useState } from 'react'
import { EmojiPicker } from './EmojiPicker'

export function Composer({ onSend }: { onSend: (text: string, emojiIds: string[]) => void }) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)

  function submit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    const emojiIds = [...trimmed.matchAll(/\[:([a-z0-9_-]+):\]/g)].map(m => m[1])
    onSend(trimmed, emojiIds)
    setText('')
    setShowEmoji(false)
  }

  return (
    <div className="px-3 pt-2 pb-[calc(10px+var(--safe-bottom))] bg-white/85 backdrop-blur border-t border-black/10 relative">
      {showEmoji && (
        <div className="absolute bottom-full left-3 mb-2 z-30">
          <EmojiPicker onPick={(id) => setText(t => t + `[:${id}:]`)} onClose={() => setShowEmoji(false)} />
        </div>
      )}
      <form onSubmit={submit} className="flex items-end gap-2">
        <button type="button" onClick={() => setShowEmoji(v => !v)}
          className="shrink-0 w-9 h-9 rounded-full bg-[var(--surface-2)] text-[var(--muted)] flex items-center justify-center hover:bg-black/10" aria-label="Emoji picker">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none"/></svg>
        </button>
        <div className="flex-1 bg-[var(--bg)] border border-black/10 rounded-[20px] px-3 py-1.5 focus-within:ring-2 focus-within:ring-[var(--blue)]/20">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            rows={1}
            placeholder="Message"
            className="w-full resize-none bg-transparent outline-none py-1 max-h-32"
          />
        </div>
        <button type="submit" disabled={!text.trim()}
          className="shrink-0 w-9 h-9 rounded-full bg-[var(--blue)] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[var(--blue-pressed)] transition" aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        </button>
      </form>
    </div>
  )
}

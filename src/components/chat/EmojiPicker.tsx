import { useMemo, useState } from 'react'
import { EMOJI_CATEGORIES } from '@/features/emojis/emoji'

export function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void
  onClose: () => void
}) {
  const [activeCategory, setActiveCategory] = useState<string>('smileys')
  const [search, setSearch] = useState('')

  const displayedEmojis = useMemo(() => {
    if (!search.trim()) {
      const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory)
      return cat ? cat.emojis : []
    }
    // Search across all categories
    const q = search.trim()
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    return all.filter((e) => e.includes(q))
  }, [activeCategory, search])

  return (
    <div className="w-72 sm:w-80 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl p-3 animate-enter text-[var(--text)] select-none">
      {/* Search Input */}
      <div className="relative mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis…"
          className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-blue-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Icons (Like WhatsApp / Instagram) */}
      {!search && (
        <div className="flex items-center justify-around border-b border-[var(--border)] pb-2 mb-2">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition ${
                activeCategory === cat.id
                  ? 'bg-blue-600/20 text-blue-500'
                  : 'hover:bg-[var(--surface-hover)] opacity-70 hover:opacity-100'
              }`}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto p-1">
        {displayedEmojis.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onPick(emoji)}
            className="w-8 h-8 rounded-lg hover:bg-[var(--surface-hover)] flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

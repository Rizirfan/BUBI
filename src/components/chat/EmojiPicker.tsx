import { useMemo, useState } from 'react'
import { EMOJIS, EMOJI_CATEGORIES } from '@/features/emojis/emoji'

export function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emojiId: string) => void
  onClose: () => void
}) {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filteredEmojis = useMemo(() => {
    let list = EMOJIS
    if (activeCategory !== 'all') {
      list = list.filter((e) => e.category === activeCategory)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          e.keywords.some((k) => k.toLowerCase().includes(q)),
      )
    }
    return list
  }, [activeCategory, search])

  return (
    <div className="w-80 rounded-2xl bg-[#14151f]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-3.5 animate-enter text-white select-none">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-xs font-semibold text-zinc-300">Emojis</span>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition text-xs"
          aria-label="Close emoji picker"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-2.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis…"
          className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-indigo-500/60 focus:bg-white/8 transition"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 mb-2.5 overflow-x-auto pb-1 scrollbar-none">
        {EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
        {filteredEmojis.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onPick(e.id)}
            title={`${e.label} ([:${e.id}:])`}
            className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.09] border border-white/[0.04] hover:border-indigo-500/40 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <span
              className="w-8 h-8 transition-transform group-hover:scale-110"
              dangerouslySetInnerHTML={{ __html: e.svg }}
            />
            <span className="text-[10px] text-zinc-400 mt-1 truncate max-w-full font-medium">
              {e.label}
            </span>
          </button>
        ))}

        {filteredEmojis.length === 0 && (
          <div className="col-span-4 py-8 text-center text-xs text-zinc-500">
            No emojis match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </div>
  )
}

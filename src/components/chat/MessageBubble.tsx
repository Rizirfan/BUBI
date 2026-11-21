import { useMemo, useState } from 'react'
import type { Message, Reaction } from '@/types'
import { EMOJIS, EMOJI_MAP } from '@/features/emojis/emoji'

function renderText(text: string) {
  const parts: (string | { emojiId: string })[] = []
  const re = /\[:([a-z0-9_-]+):\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ emojiId: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function MessageBubble({
  message,
  mine,
  showTail,
  reactions,
  currentUserId,
  onToggleReaction,
}: {
  message: Message
  mine: boolean
  showTail: boolean
  reactions: Reaction[]
  currentUserId: string
  onToggleReaction: (emojiId: string) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const parts = useMemo(() => renderText(message.text), [message.text])

  const groupedReactions = useMemo(() => {
    const map = new Map<string, { emojiId: string; count: number; mine: boolean }>()
    for (const r of reactions) {
      const g = map.get(r.emojiId) || { emojiId: r.emojiId, count: 0, mine: false }
      g.count++
      if (r.userId === currentUserId) g.mine = true
      map.set(r.emojiId, g)
    }
    return [...map.values()]
  }, [reactions, currentUserId])

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} group mb-1`}>
      <div className="max-w-[85%] sm:max-w-[72%] md:max-w-[62%] relative">
        {/* Main Bubble */}
        <div
          className={`relative px-4 py-2.5 text-[14.5px] leading-relaxed break-words transition-all select-text ${
            mine
              ? 'bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-950/40'
              : 'bg-[#181924] border border-white/8 text-zinc-100 shadow-sm'
          } ${
            showTail
              ? mine
                ? 'rounded-2xl rounded-br-sm'
                : 'rounded-2xl rounded-bl-sm'
              : 'rounded-2xl'
          }`}
        >
          {parts.map((p, i) =>
            typeof p === 'string' ? (
              <span key={i} className="whitespace-pre-wrap">{p}</span>
            ) : (
              <span
                key={i}
                className="inline-block align-middle mx-1 w-5 h-5 hover:scale-125 transition-transform duration-150 cursor-pointer"
                dangerouslySetInnerHTML={{ __html: EMOJI_MAP[p.emojiId]?.svg || '' }}
                title={EMOJI_MAP[p.emojiId]?.label || p.emojiId}
              />
            ),
          )}
        </div>

        {/* Message Metadata & Hover Actions */}
        <div
          className={`flex items-center gap-1.5 mt-1 px-1 ${
            mine ? 'justify-end' : 'justify-start'
          }`}
        >
          {/* Status indicator */}
          {mine && (
            <div className="flex items-center gap-1 text-[11px] text-zinc-500">
              {message.status === 'pending' && (
                <span className="inline-flex items-center gap-1 text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Sending…
                </span>
              )}
              {message.status === 'failed' && (
                <span className="text-rose-400 font-medium">Failed</span>
              )}
              {message.status === 'sent' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-zinc-400">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
          )}

          {/* Quick Reaction Button */}
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded-full hover:bg-white/10 transition-all flex items-center gap-1"
            title="React"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
            <span className="text-[10px] font-medium">+react</span>
          </button>
        </div>

        {/* Grouped Reactions Display */}
        {groupedReactions.length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1 ${
              mine ? 'justify-end' : 'justify-start'
            }`}
          >
            {groupedReactions.map((g) => (
              <button
                key={g.emojiId}
                type="button"
                onClick={() => onToggleReaction(g.emojiId)}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-all active:scale-95 ${
                  g.mine
                    ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-200 shadow-sm shadow-indigo-500/10'
                    : 'bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10'
                }`}
                title={EMOJI_MAP[g.emojiId]?.label || g.emojiId}
              >
                <span
                  className="w-3.5 h-3.5 inline-block"
                  dangerouslySetInnerHTML={{ __html: EMOJI_MAP[g.emojiId]?.svg || '' }}
                />
                <span className="text-[11px] font-semibold">{g.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Reaction Dock Popover */}
        {pickerOpen && (
          <div
            className={`absolute z-30 mb-2 bottom-full ${
              mine ? 'right-0' : 'left-0'
            } animate-enter`}
          >
            <div className="flex items-center gap-1 bg-[#14151f]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1.5">
              {EMOJIS.slice(0, 6).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    onToggleReaction(e.id)
                    setPickerOpen(false)
                  }}
                  className="w-8 h-8 p-1 rounded-xl hover:bg-white/10 hover:scale-115 active:scale-95 transition-all cursor-pointer"
                  title={e.label}
                  dangerouslySetInnerHTML={{ __html: e.svg }}
                />
              ))}
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="px-2 py-1 text-[11px] text-zinc-400 hover:text-white rounded-lg hover:bg-white/5"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

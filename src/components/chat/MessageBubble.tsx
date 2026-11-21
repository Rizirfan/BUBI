import { useMemo, useState } from 'react'
import type { Message, Reaction } from '@/types'
import { EMOJIS, EMOJI_MAP } from '@/features/emojis/emoji'
import { EmojiPicker } from './EmojiPicker'

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

export function MessageBubble({ message, mine, showTail, reactions, currentUserId, onToggleReaction }: {
  message: Message
  mine: boolean
  showTail: boolean
  reactions: Reaction[]
  currentUserId: string
  onToggleReaction: (emojiId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const parts = useMemo(() => renderText(message.text), [message.text])
  const grouped = useMemo(() => {
    const map = new Map<string, { emojiId: string; count: number; mine: boolean }>()
    for (const r of reactions) {
      const g = map.get(r.emojiId) || { emojiId: r.emojiId, count: 0, mine: false }
      g.count++; if (r.userId === currentUserId) g.mine = true
      map.set(r.emojiId, g)
    }
    return [...map.values()]
  }, [reactions, currentUserId])

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-0.5`}>
      <div className={`max-w-[78%] md:max-w-[65%] relative group`}>
        <div className={`px-3.5 py-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words shadow-[0_1px_0_rgba(0,0,0,0.04)] ${
          mine ? 'bg-[var(--bubble-out)] text-[var(--bubble-out-text)]' : 'bg-[var(--bubble-in)] text-black'
        } ${showTail ? (mine ? 'rounded-[20px] rounded-br-[6px]' : 'rounded-[20px] rounded-bl-[6px]') : 'rounded-[20px]'}`}>
          {parts.map((p, i) => typeof p === 'string'
            ? <span key={i}>{p}</span>
            : <span key={i} className="inline-block align-middle mx-0.5 w-5 h-5" dangerouslySetInnerHTML={{ __html: EMOJI_MAP[p.emojiId]?.svg || '' }} title={EMOJI_MAP[p.emojiId]?.label || p.emojiId} />
          )}
        </div>

        <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
          {message.status === 'pending' && <span className="text-[10px] text-[var(--muted)]">Sending…</span>}
          {message.status === 'failed' && <span className="text-[10px] text-[var(--danger)]">Failed</span>}
          <button onClick={() => setOpen(v => !v)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[11px] text-[var(--muted)] px-1.5 py-0.5 rounded-full hover:bg-black/5 transition" aria-label="Add reaction">+react</button>
        </div>

        {grouped.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${mine ? 'justify-end' : 'justify-start'}`}>
            {grouped.map(g => (
              <button key={g.emojiId} onClick={() => onToggleReaction(g.emojiId)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${g.mine ? 'bg-[var(--blue)]/10 border-[var(--blue)]/30' : 'bg-white border-black/10'}`}>
                <span className="w-4 h-4 inline-block" dangerouslySetInnerHTML={{ __html: EMOJI_MAP[g.emojiId]?.svg || '' }} />
                <span>{g.count}</span>
              </button>
            ))}
          </div>
        )}

        {open && (
          <div className={`absolute z-20 mt-1 ${mine ? 'right-0' : 'left-0'}`}>
            <div className="bg-white rounded-2xl shadow-lg border border-black/10 p-2 flex gap-1">
              {EMOJIS.slice(0, 6).map(e => (
                <button key={e.id} onClick={() => { onToggleReaction(e.id); setOpen(false) }} className="w-8 h-8 p-1 rounded-lg hover:bg-black/5" title={e.label} dangerouslySetInnerHTML={{ __html: e.svg }} />
              ))}
              <button onClick={() => setOpen(false)} className="px-2 text-xs text-[var(--muted)]">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

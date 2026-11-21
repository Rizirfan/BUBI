import { useMemo, useState } from 'react'
import type { Message, Reaction } from '@/types'
import { QUICK_REACTIONS, isOnlyEmojis } from '@/features/emojis/emoji'

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
  onToggleReaction: (emoji: string) => void
}) {
  const [showReactionBar, setShowReactionBar] = useState(false)
  const [copied, setCopied] = useState(false)

  const groupedReactions = useMemo(() => {
    const map = new Map<string, { emoji: string; count: number; mine: boolean }>()
    for (const r of reactions) {
      const g = map.get(r.emojiId) || { emoji: r.emojiId, count: 0, mine: false }
      g.count++
      if (r.userId === currentUserId) g.mine = true
      map.set(r.emojiId, g)
    }
    return [...map.values()]
  }, [reactions, currentUserId])

  const onlyEmoji = isOnlyEmojis(message.text)

  function copyText() {
    navigator.clipboard.writeText(message.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div
      className={`flex ${mine ? 'justify-end' : 'justify-start'} group mb-1 relative`}
      onMouseEnter={() => setShowReactionBar(true)}
      onMouseLeave={() => setShowReactionBar(false)}
    >
      <div className="max-w-[85%] sm:max-w-[70%] md:max-w-[62%] relative">
        {/* Floating WhatsApp / Instagram Reaction Bar */}
        {showReactionBar && (
          <div
            className={`absolute z-30 -top-8.5 ${
              mine ? 'right-0' : 'left-0'
            } flex items-center gap-1 bg-[var(--header-bg)] border border-[var(--border)] rounded-full px-2 py-0.5 shadow-lg select-none`}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onToggleReaction(emoji)
                  setShowReactionBar(false)
                }}
                className="hover:scale-130 active:scale-95 transition-transform text-sm sm:text-base p-0.5 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
            {/* Copy button */}
            <button
              type="button"
              onClick={copyText}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] px-1.5 py-0.5 ml-1 border-l border-[var(--border)] cursor-pointer"
              title="Copy"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        )}

        {/* Message Bubble Body */}
        {onlyEmoji ? (
          <div className="py-1 px-2 select-text">
            <span className="text-3xl sm:text-4xl">{message.text}</span>
            <span className="text-[10px] text-[var(--text-muted)] ml-2 align-bottom">
              {formattedTime}
            </span>
          </div>
        ) : (
          <div
            className={`px-3 py-1.5 text-[14px] leading-relaxed break-words shadow-sm select-text ${
              mine
                ? '[background:var(--bubble-out)] text-[var(--bubble-out-text)] shadow-orange-950/10'
                : 'bg-[var(--bubble-in)] text-[var(--bubble-in-text)] border border-[var(--border)]'
            } ${
              showTail
                ? mine
                  ? 'rounded-lg rounded-tr-none'
                  : 'rounded-lg rounded-tl-none'
                : 'rounded-lg'
            }`}
          >
            <span className="whitespace-pre-wrap">{message.text}</span>

            {/* Embedded time & checkmarks */}
            <span className="inline-flex items-center gap-1 float-right ml-3 mt-1.5 text-[11px] select-none">
              <span className={mine ? 'text-white/80' : 'text-[var(--text-muted)]'}>
                {formattedTime}
              </span>
              {mine && (
                message.status === 'failed' ? (
                  <span className="text-red-200 text-xs font-bold" title="Failed to send">⚠️</span>
                ) : message.status === 'delivered' ? (
                  <span className="text-white font-bold text-xs" title="Delivered">
                    ✓✓
                  </span>
                ) : (
                  <span className="text-white/85 font-semibold text-xs" title="Sent">
                    ✓
                  </span>
                )
              )}
            </span>
          </div>
        )}

        {/* Reaction Counters (Attached under the bubble) */}
        {groupedReactions.length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-0.5 ${
              mine ? 'justify-end' : 'justify-start'
            }`}
          >
            {groupedReactions.map((g) => (
              <button
                key={g.emoji}
                type="button"
                onClick={() => onToggleReaction(g.emoji)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs shadow-xs transition border cursor-pointer ${
                  g.mine
                    ? 'bg-[var(--wa-green)]/20 border-[var(--wa-green)] text-[var(--wa-green)]'
                    : 'bg-[var(--header-bg)] border-[var(--border)] text-[var(--text)]'
                }`}
              >
                <span>{g.emoji}</span>
                <span className="text-[10px] font-semibold">{g.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

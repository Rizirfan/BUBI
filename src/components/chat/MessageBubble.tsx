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

  // Group reactions by emoji
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

  return (
    <div
      className={`flex ${mine ? 'justify-end' : 'justify-start'} group mb-1 relative`}
      onMouseEnter={() => setShowReactionBar(true)}
      onMouseLeave={() => setShowReactionBar(false)}
    >
      <div className="max-w-[85%] sm:max-w-[70%] relative">
        {/* Quick Reactions Bar (Instagram / WhatsApp style) */}
        {showReactionBar && (
          <div
            className={`absolute z-30 -top-8 ${
              mine ? 'right-0' : 'left-0'
            } flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-full px-2 py-0.5 shadow-md`}
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
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] px-1.5 py-0.5 ml-1 border-l border-[var(--border)]"
              title="Copy message"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        )}

        {/* Message Bubble Body */}
        {onlyEmoji ? (
          // Jumbo emoji display if message is only emojis (like WhatsApp)
          <div className="py-1 px-2 text-3xl sm:text-4xl select-text">
            {message.text}
          </div>
        ) : (
          <div
            className={`px-3.5 py-2 text-[14.5px] leading-relaxed break-words select-text ${
              mine
                ? 'bg-[var(--bubble-out)] text-[var(--bubble-out-text)]'
                : 'bg-[var(--bubble-in)] text-[var(--bubble-in-text)]'
            } ${
              showTail
                ? mine
                  ? 'rounded-2xl rounded-br-sm'
                  : 'rounded-2xl rounded-bl-sm'
                : 'rounded-2xl'
            }`}
          >
            <span className="whitespace-pre-wrap">{message.text}</span>
          </div>
        )}

        {/* Status / Timestamp */}
        {mine && message.status === 'pending' && (
          <div className="text-[10px] text-[var(--text-muted)] text-right mt-0.5 pr-1">
            Sending…
          </div>
        )}

        {/* Grouped Reactions List (WhatsApp style attached pills) */}
        {groupedReactions.length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1 ${
              mine ? 'justify-end' : 'justify-start'
            }`}
          >
            {groupedReactions.map((g) => (
              <button
                key={g.emoji}
                type="button"
                onClick={() => onToggleReaction(g.emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition border ${
                  g.mine
                    ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text)]'
                }`}
              >
                <span>{g.emoji}</span>
                <span className="text-[11px] font-medium">{g.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

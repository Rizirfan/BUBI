import { EMOJIS } from '@/features/emojis/emoji'

export function EmojiPicker({ onPick, onClose }: { onPick: (emojiId: string) => void; onClose: () => void }) {
  return (
    <div className="bg-white border border-black/10 rounded-2xl shadow-lg p-3 w-72">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">Custom emojis</div>
        <button onClick={onClose} className="text-xs text-[var(--muted)] px-2 py-1 rounded hover:bg-black/5">Close</button>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {EMOJIS.map(e => (
          <button key={e.id} onClick={() => onPick(e.id)} title={e.label}
            className="w-10 h-10 p-1.5 rounded-xl hover:bg-[var(--bg)] transition" dangerouslySetInnerHTML={{ __html: e.svg }} />
        ))}
      </div>
    </div>
  )
}

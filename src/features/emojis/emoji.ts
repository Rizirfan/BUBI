// Real Unicode emojis like WhatsApp & Instagram

export interface EmojiCategory {
  id: string
  label: string
  icon: string
  emojis: string[]
}

export const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥']

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '🥹',
      '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗',
      '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓',
      '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕',
      '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😮‍💨', '😤',
      '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
      '😥', '😓', '🫣', '🤗', '🫡', '🤔', '🫢', '🤭', '🤫', '🤥',
      '😶', '😐', '😑', '😬', '🫠', '🙄', '😯', '😦', '😮', '😲',
      '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮',
    ],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    icon: '👍',
    emojis: [
      '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤞',
      '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '💪',
      '🦾', '🦿', '🦵', '🦶', '👂', '👃', '🫀', '🧠', '🫵', '👀',
    ],
  },
  {
    id: 'hearts',
    label: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
      '✨', '🌟', '💫', '💥', '🔥', '💯', '💢', '💬', '💭', '💤',
    ],
  },
  {
    id: 'fun',
    label: 'Fun & Food',
    icon: '🎉',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '⚽', '🏀', '🎮', '🎲',
      '🎨', '🎤', '🎧', '🎸', '🚀', '💡', '📱', '💻', '📷', '🔑',
      '☕', '🍕', '🍔', '🍟', '🍦', '🍩', '🍰', '🍫', '🍿', '🍻',
    ],
  },
]

// Helper to check if string contains only 1 to 3 emojis
export function isOnlyEmojis(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  // Regex to test emoji-only strings
  const emojiRegex = /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\s)+$/u
  if (!emojiRegex.test(trimmed)) return false
  // Count emojis roughly
  const segments = [...new Intl.Segmenter().segment(trimmed)].filter(
    (s) => s.segment.trim().length > 0,
  )
  return segments.length >= 1 && segments.length <= 3
}

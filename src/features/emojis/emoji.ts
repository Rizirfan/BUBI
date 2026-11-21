export interface EmojiDef {
  id: string
  label: string
  category: 'moods' | 'reactions' | 'energy' | 'nature'
  svg: string
  keywords: string[]
}

// Custom unique vector emoji set - bespoke SVG icons with zero third-party dependencies.
export const EMOJIS: EmojiDef[] = [
  {
    id: 'spark',
    label: 'Spark',
    category: 'energy',
    keywords: ['happy', 'bright', 'glow', 'light'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#FFE8A3"/><path d="M32 12l5 12 12 5-12 5-5 12-5-12-12-5 12-5 5-12z" fill="#FF9F0A"/></svg>`,
  },
  {
    id: 'bloom',
    label: 'Bloom',
    category: 'moods',
    keywords: ['love', 'flower', 'pink', 'spring'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#FFE0EC"/><circle cx="32" cy="24" r="7" fill="#FF5FA2"/><circle cx="24" cy="32" r="7" fill="#FF7AB8"/><circle cx="40" cy="32" r="7" fill="#FF7AB8"/><circle cx="32" cy="40" r="7" fill="#FF5FA2"/><circle cx="32" cy="32" r="5" fill="#FFD166"/></svg>`,
  },
  {
    id: 'bolt',
    label: 'Bolt',
    category: 'energy',
    keywords: ['energy', 'fast', 'lightning', 'electric'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#E0F2FF"/><path d="M36 10L20 36h12l-4 18 20-28H36l0-16z" fill="#0A84FF"/></svg>`,
  },
  {
    id: 'mello',
    label: 'Mello',
    category: 'moods',
    keywords: ['calm', 'smile', 'chill', 'zen'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#E7F8EF"/><circle cx="32" cy="32" r="16" fill="#34C759"/><circle cx="26" cy="28" r="2.5" fill="#0B3D1E"/><circle cx="38" cy="28" r="2.5" fill="#0B3D1E"/><path d="M24 37c2.5 3 5 4.5 8 4.5s5.5-1.5 8-4.5" stroke="#0B3D1E" stroke-width="3" stroke-linecap="round" fill="none"/></svg>`,
  },
  {
    id: 'ember',
    label: 'Ember',
    category: 'energy',
    keywords: ['fire', 'lit', 'flame', 'hot'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#FFE8E0"/><path d="M34 10c2 8-2 11-5 15-4 5-5 10-1 16 1 2 3 4 6 5-7-1-14-7-14-16 0-8 6-13 10-20 1 0 3 0 4 0z" fill="#FF6B35"/><path d="M38 30c4 5 5 9 3 13-1 3-4 5-7 6 2-2 3-4 3-7 0-4-2-7-5-10 2-1 4-2 6-2z" fill="#FF9F0A"/></svg>`,
  },
  {
    id: 'nova',
    label: 'Nova',
    category: 'energy',
    keywords: ['wow', 'star', 'magic', 'purple'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#EEE6FF"/><path d="M32 14l4.5 9.5L46 28l-9.5 4.5L32 42l-4.5-9.5L18 28l9.5-4.5L32 14z" fill="#7C5CFF"/></svg>`,
  },
  {
    id: 'pebble',
    label: 'Pebble',
    category: 'nature',
    keywords: ['ok', 'solid', 'rock', 'grounded'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#F0F0F3"/><ellipse cx="32" cy="35" rx="16" ry="12" fill="#8E8E93"/><ellipse cx="28" cy="31" rx="8" ry="5" fill="#AEAEB2" opacity=".7"/></svg>`,
  },
  {
    id: 'wave',
    label: 'Wave',
    category: 'reactions',
    keywords: ['hello', 'hi', 'ocean', 'tide'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#E0FAFF"/><path d="M18 40c4 4 9 6 14 6s10-2 14-6" stroke="#32ADE6" stroke-width="4" stroke-linecap="round"/><path d="M22 30c3 3 6 4 10 4s7-1 10-4" stroke="#64D2FF" stroke-width="4" stroke-linecap="round"/><path d="M26 20c2 2 4 3 6 3s4-1 6-3" stroke="#0A84FF" stroke-width="4" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'leaf',
    label: 'Leaf',
    category: 'nature',
    keywords: ['fresh', 'nature', 'green', 'growth'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#E8F7E8"/><path d="M46 18C34 18 22 26 18 38c-2 6 2 10 8 8 12-4 20-16 20-28z" fill="#34C759"/><path d="M24 42c6-8 12-14 20-18" stroke="#1F8B3A" stroke-width="3" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'luna',
    label: 'Luna',
    category: 'nature',
    keywords: ['night', 'cool', 'moon', 'dream'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#E8ECFF"/><path d="M40 16a16 16 0 1 0 8 30 14 14 0 1 1-8-30z" fill="#5856D6"/></svg>`,
  },
  {
    id: 'pulse',
    label: 'Pulse',
    category: 'moods',
    keywords: ['heart', 'like', 'love', 'beat'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#FFE5EA"/><path d="M32 46s-14-8.5-14-18a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 9.5-14 18-14 18z" fill="#FF375F"/></svg>`,
  },
  {
    id: 'yes',
    label: 'Yes',
    category: 'reactions',
    keywords: ['check', 'ok', 'done', 'approved'],
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="20" fill="#E6FBF0"/><path d="M20 33l8 8 16-18" stroke="#30D158" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  },
]

export const EMOJI_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'moods', label: 'Moods' },
  { id: 'reactions', label: 'Reactions' },
  { id: 'energy', label: 'Energy' },
  { id: 'nature', label: 'Nature' },
] as const

export const EMOJI_MAP = Object.fromEntries(EMOJIS.map((e) => [e.id, e])) as Record<string, EmojiDef>

export function emojiSvgDataUrl(id: string): string | undefined {
  const e = EMOJI_MAP[id]
  if (!e) return undefined
  return `data:image/svg+xml;utf8,${encodeURIComponent(e.svg)}`
}

import { create } from 'zustand'

export interface SettingsState {
  theme: 'dark' | 'light'
  sendOnEnter: boolean
  setTheme: (theme: 'dark' | 'light') => void
  setSendOnEnter: (val: boolean) => void
}

function getStoredSettings() {
  try {
    const raw = localStorage.getItem('bubi_settings')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { theme: 'dark', sendOnEnter: true }
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = getStoredSettings()

  function apply(theme: 'dark' | 'light') {
    if (typeof document !== 'undefined') {
      if (theme === 'light') {
        document.documentElement.classList.add('light-theme')
      } else {
        document.documentElement.classList.remove('light-theme')
      }
    }
  }

  apply(initial.theme)

  return {
    theme: initial.theme || 'dark',
    sendOnEnter: initial.sendOnEnter ?? true,
    setTheme: (theme) => {
      apply(theme)
      const current = get()
      localStorage.setItem('bubi_settings', JSON.stringify({ ...current, theme }))
      set({ theme })
    },
    setSendOnEnter: (sendOnEnter) => {
      const current = get()
      localStorage.setItem('bubi_settings', JSON.stringify({ ...current, sendOnEnter }))
      set({ sendOnEnter })
    },
  }
})

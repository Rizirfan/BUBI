import { create } from 'zustand'

export interface SettingsState {
  theme: 'dark' | 'light'
  sendOnEnter: boolean
  soundEnabled: boolean
  setTheme: (theme: 'dark' | 'light') => void
  setSendOnEnter: (val: boolean) => void
  setSoundEnabled: (val: boolean) => void
}

function getStoredSettings() {
  try {
    const raw = localStorage.getItem('bubi_settings')
    if (raw) return JSON.parse(raw)
  } catch {}
  return { theme: 'light', sendOnEnter: true, soundEnabled: true }
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = getStoredSettings()

  function apply(theme: 'dark' | 'light') {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark-theme')
      } else {
        document.documentElement.classList.remove('dark-theme')
      }
    }
  }

  apply(initial.theme || 'light')

  return {
    theme: initial.theme || 'light',
    sendOnEnter: initial.sendOnEnter ?? true,
    soundEnabled: initial.soundEnabled ?? true,
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
    setSoundEnabled: (soundEnabled) => {
      const current = get()
      localStorage.setItem('bubi_settings', JSON.stringify({ ...current, soundEnabled }))
      set({ soundEnabled })
    },
  }
})

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/constants'

export type Theme = 'light' | 'dark'
/** What the user chose. `system` follows the operating system, live. */
export type ThemePreference = Theme | 'system'

interface ThemeContextValue {
  /** The theme actually on screen. */
  theme: Theme
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.theme)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* storage blocked */
  }
  return 'system'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)
  const [system, setSystem] = useState<Theme>(systemTheme)

  /* Follow the OS while the user hasn't picked a theme themselves. */
  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const onChange = () => setSystem(query.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const theme: Theme = preference === 'system' ? system : preference

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    root.style.colorScheme = theme
  }, [theme])

  /* Only an explicit choice is remembered, so "system" keeps tracking the OS. */
  useEffect(() => {
    try {
      if (preference === 'system') window.localStorage.removeItem(STORAGE_KEYS.theme)
      else window.localStorage.setItem(STORAGE_KEYS.theme, preference)
    } catch {
      /* storage blocked — the class is still applied for this session */
    }
  }, [preference])

  const setPreference = useCallback((next: ThemePreference) => setPreferenceState(next), [])
  const setTheme = useCallback((next: Theme) => setPreferenceState(next), [])
  const toggleTheme = useCallback(
    () => setPreferenceState(() => (theme === 'dark' ? 'light' : 'dark')),
    [theme],
  )

  const value = useMemo(
    () => ({ theme, preference, setPreference, setTheme, toggleTheme }),
    [theme, preference, setPreference, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}

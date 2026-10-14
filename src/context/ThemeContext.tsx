import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
export type ThemePreference = 'light' | 'dark' | 'system'
export const THEME_KEY = 'vlpv2:theme'
export const validTheme = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'
function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return validTheme(value) ? value : 'system'
  } catch {
    return 'system'
  }
}
export function applyTheme(value: ThemePreference) {
  if (value === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = value
}
const ThemeContext = createContext<{
  theme: ThemePreference
  setTheme: (value: ThemePreference) => void
}>({ theme: 'system', setTheme: () => {} })
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setPreference] = useState<ThemePreference>(readPreference)
  function setTheme(value: ThemePreference) {
    if (!validTheme(value)) return
    applyTheme(value)
    setPreference(value)
    try {
      localStorage.setItem(THEME_KEY, value)
    } catch {
      /* Theme still works for this tab when browser storage is restricted. */
    }
  }
  useEffect(() => {
    applyTheme(theme)
  }, [theme])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) {
        const value = readPreference()
        applyTheme(value)
        setPreference(value)
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
export const useTheme = () => useContext(ThemeContext)

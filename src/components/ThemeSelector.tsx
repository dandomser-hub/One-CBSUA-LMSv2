import { ChevronDown, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, ThemePreference } from '../context/ThemeContext'

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun
  return (
    <div className="relative inline-flex items-center">
      <Icon className="pointer-events-none absolute left-3 h-4 w-4 text-muted" aria-hidden="true" />
      <select
        aria-label="Color theme"
        value={theme}
        onChange={(event) => setTheme(event.target.value as ThemePreference)}
        className="appearance-none rounded-lg border border-border bg-surface text-foreground py-2 pl-9 pr-9 text-sm cursor-pointer"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 h-4 w-4 text-muted"
        aria-hidden="true"
      />
    </div>
  )
}

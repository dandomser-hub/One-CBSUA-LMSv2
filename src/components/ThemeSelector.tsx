import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, ThemePreference } from '../context/ThemeContext'
export default function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  return (
    <div
      role="group"
      aria-label="Color theme"
      className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1 text-sm"
    >
      {(
        [
          { value: 'light', label: 'Light', Icon: Sun },
          { value: 'dark', label: 'Dark', Icon: Moon },
          { value: 'system', label: 'System', Icon: Monitor },
        ] as const
      ).map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => setTheme(value as ThemePreference)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 transition-colors ${theme === value ? 'bg-primary text-primary-on' : 'text-muted hover:bg-surface-alt'}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

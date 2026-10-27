import { AnimatePresence, motion } from 'framer-motion'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '@/hooks/use-theme'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function useThemeOptions() {
  const { locale } = useI18n()
  const ar = locale === 'ar-EG'
  return {
    title: ar ? 'المظهر' : 'Appearance',
    options: [
      { value: 'light' as const, icon: Sun, label: ar ? 'فاتح' : 'Light' },
      { value: 'dark' as const, icon: Moon, label: ar ? 'داكن' : 'Dark' },
      { value: 'system' as const, icon: Monitor, label: ar ? 'زي الجهاز' : 'System' },
    ],
  }
}

/**
 * Header control. The icon shows the theme on screen; the menu offers light,
 * dark, or following the device — and says which one is active.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, preference, setPreference } = useTheme()
  const { title, options } = useThemeOptions()
  const active = options.find((o) => o.value === preference)!

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${title}: ${active.label}`}
          title={`${title}: ${active.label}`}
          className={cn(
            'relative grid size-9 place-items-center overflow-hidden rounded-md text-foreground transition-colors',
            'hover:bg-foreground/[0.06] data-[state=open]:bg-foreground/[0.06]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            className,
          )}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={theme}
              initial={{ y: 12, opacity: 0, rotate: -25 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -12, opacity: 0, rotate: 25 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="grid place-items-center"
            >
              {theme === 'dark' ? <Moon className="size-[1.0625rem]" /> : <Sun className="size-[1.0625rem]" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        {options.map(({ value, icon: Icon, label }) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setPreference(value)}
            aria-checked={preference === value}
            role="menuitemradio"
          >
            <Icon />
            <span className="flex-1">{label}</span>
            {preference === value && <Check className="!text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Settings-page control: the same three choices as a segmented radio group. */
export function ThemeSegmented({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  const { title, options } = useThemeOptions()

  return (
    <div
      role="radiogroup"
      aria-label={title}
      className={cn('inline-flex h-9 gap-0.5 rounded-md bg-foreground/[0.06] p-[3px]', className)}
    >
      {options.map(({ value, icon: Icon, label }) => {
        const on = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setPreference(value as ThemePreference)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[5px] px-2.5 text-caption font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              on ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}

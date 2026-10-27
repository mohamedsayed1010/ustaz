import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { transitions } from '@/lib/motion'

interface DashboardHeaderProps {
  title: string
  description?: string
  /** Small line above the title — a date, a role, a breadcrumb. */
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

/**
 * Page title row for every console screen. Quiet by design: one heading, one
 * line of context, the page's actions opposite — the content does the talking.
 */
export function DashboardHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
  children,
}: DashboardHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitions.base}
      className={cn('mb-6 lg:mb-8', className)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="data-label mb-2">{eyebrow}</div>}
          <h1 className="font-display text-heading-lg text-foreground">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-body-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </motion.header>
  )
}

/** Section wrapper inside a dashboard page. */
export function DashboardSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[0.9375rem] font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-caption text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

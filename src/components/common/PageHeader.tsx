import { motion } from 'framer-motion'
import { Breadcrumbs, type Crumb } from '@/components/common/controls'
import { cn } from '@/lib/utils'
import { transitions } from '@/lib/motion'

interface PageHeaderProps {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  crumbs?: Crumb[]
  /** Rendered under the description — search bars, chips, counters. */
  children?: React.ReactNode
  /** Rendered opposite the title on wide screens. */
  aside?: React.ReactNode
  className?: string
  compact?: boolean
}

/**
 * Shared header band for every directory and content page: a cool navy wash
 * under a thin soft-orange rule. Light enough that the search
 * bars and filters it often holds keep their ordinary contrast.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  crumbs,
  children,
  aside,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        'relative border-b border-border bg-navy-soft',
        compact ? 'py-8' : 'pb-10 pt-8 sm:pb-12 sm:pt-10',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 bg-brand"
      />
      <div className="container-page relative">
        {crumbs && <Breadcrumbs items={crumbs} className="mb-5" />}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitions.base}
            className="max-w-2xl"
          >
            {eyebrow && <span className="eyebrow mb-4 flex">{eyebrow}</span>}
            <h1 className={cn(compact ? 'text-display-lg' : 'text-display-xl', 'max-w-3xl text-foreground')}>
              {title}
            </h1>
            {description && (
              <p className="mt-4 max-w-2xl text-body-lg text-muted-foreground">{description}</p>
            )}
          </motion.div>

          {aside && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transitions.base, delay: 0.08 }}
              className="shrink-0"
            >
              {aside}
            </motion.div>
          )}
        </div>

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...transitions.base, delay: 0.12 }}
            className="mt-8"
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  )
}

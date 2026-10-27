import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { useCountUp } from '@/hooks/use-ui'
import { Card } from '@/components/ui/card'

/** Number that counts up once it scrolls into view. */
export function Counter({
  value,
  decimals = 0,
  prefix,
  suffix,
  className,
  format = true,
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  format?: boolean
}) {
  const { ref, value: current } = useCountUp(value, { decimals })
  const shown = decimals > 0 ? current.toFixed(decimals) : formatNumber(Math.round(current))

  return (
    <span ref={ref} className={cn('tnum', className)}>
      {prefix}
      {format ? shown : current}
      {suffix}
    </span>
  )
}

interface StatCardProps {
  label: string
  value: number
  /** e.g. "+12.4" — rendered as a delta pill. */
  delta?: number
  deltaSuffix?: string
  prefix?: string
  suffix?: string
  decimals?: number
  description?: string
  icon?: React.ReactNode
  className?: string
  /** Inverts the delta colouring for metrics where "down" is good. */
  invertDelta?: boolean
}

export function StatCard({
  label,
  value,
  delta,
  deltaSuffix = '%',
  prefix,
  suffix,
  decimals = 0,
  description,
  icon,
  className,
  invertDelta = false,
}: StatCardProps) {
  const positive = delta !== undefined && delta >= 0
  const good = invertDelta ? !positive : positive

  return (
    <Card className={cn('relative overflow-hidden p-5', className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon && <span className="shrink-0 [&_svg]:size-4">{icon}</span>}
        <p className="data-label truncate">{label}</p>
      </div>
      <p className="mt-3 font-display text-metric text-foreground">
        <Counter value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </p>

      {(delta !== undefined || description) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-caption font-semibold',
                good ? 'text-success-strong' : 'text-destructive-strong',
              )}
            >
              {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              <span className="tnum">
                {positive ? '+' : ''}
                {delta}
                {deltaSuffix}
              </span>
            </span>
          )}
          {description && <span className="text-caption text-muted-foreground">{description}</span>}
        </div>
      )}
    </Card>
  )
}

/** Big centred stat used in the homepage band — no card chrome. */
export function StatBlock({
  value,
  label,
  description,
  suffix,
  decimals = 0,
  icon,
}: {
  value: number
  label: string
  description?: string
  suffix?: string
  decimals?: number
  icon?: React.ReactNode
}) {
  return (
    <div className="border-s border-border ps-5">
      {icon && (
        <span className="mb-4 grid size-5 place-items-center text-accent-strong [&_svg]:size-5">
          {icon}
        </span>
      )}
      <p className="font-display text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-none text-foreground">
        <Counter value={value} decimals={decimals} suffix={suffix} />
      </p>
      <p className="mt-3 text-body-sm font-semibold text-foreground">{label}</p>
      {description && <p className="mt-1 text-caption text-muted-foreground">{description}</p>}
    </div>
  )
}

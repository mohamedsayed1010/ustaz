import { Link } from 'react-router-dom'
import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spot, type SpotName } from '@/components/illustrations/Spot'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  spot?: SpotName
  title: string
  description?: string
  action?: { label: string; href?: string; onClick?: () => void }
  secondaryAction?: { label: string; href?: string; onClick?: () => void }
  className?: string
  compact?: boolean
}

export function EmptyState({
  spot = 'search',
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border text-center',
        compact ? 'gap-3 px-6 py-9' : 'gap-4 px-6 py-14',
        className,
      )}
    >
      <Spot name={spot} className={compact ? 'h-16' : 'h-24'} />
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-body font-semibold text-foreground">{title}</h3>
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
      </div>

      {(action || secondaryAction) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2.5">
          {action &&
            (action.href ? (
              <Button asChild>
                <Link to={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button onClick={action.onClick}>{action.label}</Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Button variant="outline" asChild>
                <Link to={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  )
}

export function ErrorState({
  title = 'حصل خطأ غير متوقع',
  description = 'حاول تاني، ولو المشكلة فضلت موجودة كلّمنا وهنساعدك.',
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-6 py-14 text-center',
        className,
      )}
    >
      <Spot name="error" className="h-20" />
      <div className="max-w-md space-y-1.5">
        <h3 className="text-body font-semibold text-foreground">{title}</h3>
        <p className="text-body-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCcw className="size-4" />
          حاول تاني
        </Button>
      )}
    </div>
  )
}

export function LoadingState({
  label = 'بنحمّل البيانات…',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}
    >
      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
      <p className="text-body-sm text-muted-foreground">{label}</p>
    </div>
  )
}

/** Inline banner used for non-blocking notices inside pages. */
export function NoticeBanner({
  tone = 'info',
  title,
  children,
  className,
  icon,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  children: React.ReactNode
  className?: string
  icon?: React.ReactNode
}) {
  const tones = {
    info: 'border-s-info [&_[data-i]]:text-info-strong',
    success: 'border-s-success [&_[data-i]]:text-success-strong',
    warning: 'border-s-warning [&_[data-i]]:text-warning-strong',
    danger: 'border-s-destructive [&_[data-i]]:text-destructive-strong',
  } as const

  return (
    <div
      className={cn(
        'flex gap-3 rounded-md border border-border border-s-[3px] bg-card p-4 text-foreground',
        tones[tone],
        className,
      )}
    >
      {icon && (
        <span data-i className="mt-0.5 shrink-0 [&_svg]:size-5">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1 text-body-sm leading-relaxed">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        <div className={cn(title && 'mt-1', 'text-muted-foreground')}>{children}</div>
      </div>
    </div>
  )
}

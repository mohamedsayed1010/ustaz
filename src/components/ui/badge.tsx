import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border font-sans font-semibold leading-none transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-muted text-muted-foreground',
        primary: 'border-transparent bg-foreground/[0.07] text-foreground',
        accent: 'border-transparent bg-accent-soft text-accent-strong',
        solid: 'border-transparent bg-primary text-primary-foreground',
        /* "Featured" — navy: weight and calm, kept apart from orange actions. */
        featured: 'border-transparent bg-navy text-navy-foreground',
        navy: 'border-transparent bg-navy-soft text-navy-strong',
        success: 'border-transparent bg-success/12 text-success-strong',
        warning: 'border-transparent bg-warning/15 text-warning-strong',
        destructive: 'border-transparent bg-destructive/10 text-destructive-strong',
        outline: 'border-border bg-transparent text-muted-foreground',
        info: 'border-transparent bg-info/10 text-info-strong',
        whatsapp: 'border-whatsapp/30 bg-whatsapp/12 text-whatsapp-ink dark:text-whatsapp',
      },
      size: {
        sm: 'px-1.5 py-1 text-[0.6875rem]',
        md: 'px-2 py-1.5 text-[0.75rem]',
        lg: 'px-2.5 py-1.5 text-caption',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }

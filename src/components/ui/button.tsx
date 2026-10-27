import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold transition-[background-color,border-color,color,opacity] duration-150 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:opacity-85 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.14)] hover:bg-[hsl(var(--primary)/0.88)] active:bg-[hsl(var(--primary)/0.94)]',
        /* Tonal orange for repeated, card-level actions: the solid fill is kept for
           a page's main action, so a grid of cards never turns into a wall of orange.
           Fills on intent. Action orange on its wash is 4.6:1. */
        soft: 'border border-transparent bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground dark:border-primary/35',
        accent:
          'bg-accent text-accent-foreground hover:brightness-[1.06]',
        /* The foundation colour — for weighty, non-primary actions. */
        navy:
          'bg-navy text-navy-foreground hover:bg-[hsl(var(--navy)/0.9)] active:bg-[hsl(var(--navy)/0.95)]',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-muted',
        outline:
          'border border-input bg-card text-foreground hover:border-foreground/30 hover:bg-muted/60',
        ghost: 'text-foreground hover:bg-foreground/[0.06]',
        link: 'h-auto p-0 text-primary underline-offset-4 hover:underline',
        /* On the stage: a quiet outline that keeps the orange CTA in charge. */
        inverse:
          'border border-stage-foreground/25 bg-transparent text-stage-foreground hover:border-stage-foreground/50 hover:bg-stage-foreground/[0.08]',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/88',
        whatsapp:
          'bg-whatsapp-ink text-white hover:bg-whatsapp-dark',
        /* whatsapp-dark on the pale tint measures 3.9:1; the ink green clears AA. */
        'whatsapp-outline':
          'border border-whatsapp/40 bg-whatsapp/8 text-whatsapp-ink hover:bg-whatsapp/15 dark:text-whatsapp',
      },
      size: {
        sm: 'h-8 px-3 text-[0.8125rem] [&_svg]:size-4',
        md: 'h-10 px-4 text-body-sm [&_svg]:size-[1.0625rem]',
        lg: 'h-12 px-6 text-body [&_svg]:size-[1.125rem]',
        xl: 'h-13 px-7 text-body [&_svg]:size-5',
        icon: 'h-9 w-9 [&_svg]:size-[1.0625rem]',
        'icon-sm': 'h-8 w-8 [&_svg]:size-4',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, block, asChild = false, loading = false, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }

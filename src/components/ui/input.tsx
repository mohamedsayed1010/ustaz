import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', invalid, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-body-sm text-foreground transition-[border-color,box-shadow]',
        'placeholder:text-muted-foreground/65 hover:border-foreground/25',
        'focus-visible:outline-none focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'file:border-0 file:bg-transparent file:text-body-sm file:font-medium',
        invalid && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex min-h-[7rem] w-full resize-y rounded-md border border-input bg-card px-3 py-2.5 text-body-sm text-foreground transition-[border-color,box-shadow]',
        'placeholder:text-muted-foreground/65 hover:border-foreground/25',
        'focus-visible:outline-none focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-60',
        invalid && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export { Input, Textarea }

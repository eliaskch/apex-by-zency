import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-apex text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-primary disabled:pointer-events-none disabled:opacity-50 min-h-[44px] px-5',
  {
    variants: {
      variant: {
        default:
          'bg-apex-gradient text-white shadow-apex-glow hover:opacity-90 hover:shadow-apex-glow active:scale-[0.98]',
        secondary:
          'bg-apex-surface text-apex-text border border-apex-border hover:bg-apex-surface-2 active:scale-[0.98]',
        ghost:
          'text-apex-text-muted hover:text-apex-text hover:bg-apex-surface active:scale-[0.98]',
        destructive:
          'bg-apex-error/10 text-apex-error border border-apex-error/30 hover:bg-apex-error/20',
        outline:
          'border border-apex-border bg-transparent text-apex-text hover:bg-apex-surface active:scale-[0.98]',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-13 px-8 text-base',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </span>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

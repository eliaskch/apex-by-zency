import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-11 w-full rounded-apex bg-apex-surface border border-apex-border px-4 py-2 text-sm text-apex-text',
            'placeholder:text-apex-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-apex-primary focus:border-transparent',
            'transition-all duration-200',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-apex-error ring-1 ring-apex-error',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-apex-error">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }

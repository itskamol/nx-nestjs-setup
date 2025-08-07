"use client"

import { ReactNode } from 'react'
import { AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

interface LoadingStateProps {
  state: LoadingState
  loadingText?: string
  successText?: string
  errorText?: string
  children?: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({
  state,
  loadingText = 'Loading...',
  successText = 'Success!',
  errorText = 'Something went wrong',
  children,
  className,
  size = 'md'
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const textClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const getStateContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className={cn('flex items-center gap-2', className)}>
            <Loader2 className={cn('animate-spin', sizeClasses[size])} />
            <span className={textClasses[size]}>{loadingText}</span>
          </div>
        )
      
      case 'success':
        return (
          <div className={cn('flex items-center gap-2 text-green-600', className)}>
            <CheckCircle className={sizeClasses[size]} />
            <span className={textClasses[size]}>{successText}</span>
          </div>
        )
      
      case 'error':
        return (
          <div className={cn('flex items-center gap-2 text-red-600', className)}>
            <AlertCircle className={sizeClasses[size]} />
            <span className={textClasses[size]}>{errorText}</span>
          </div>
        )
      
      default:
        return children || null
    }
  }

  return <>{getStateContent()}</>
}

interface AsyncContentProps<T> {
  data: T | null | undefined
  loading: boolean
  error: Error | null
  children: (data: T) => ReactNode
  loadingComponent?: ReactNode
  errorComponent?: ReactNode
  emptyComponent?: ReactNode
}

export function AsyncContent<T>({
  data,
  loading,
  error,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent
}: AsyncContentProps<T>) {
  if (loading) {
    return loadingComponent || <LoadingState state="loading" />
  }

  if (error) {
    return (
      errorComponent || (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Error: {error.message}</span>
          </div>
        </div>
      )
    )
  }

  if (!data) {
    return (
      emptyComponent || (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2 text-gray-600">
            <Info className="h-4 w-4" />
            <span className="text-sm">No data available</span>
          </div>
        </div>
      )
    )
  }

  return <>{children(data)}</>
}

interface LoadingButtonProps {
  loading: boolean
  children: ReactNode
  disabled?: boolean
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loadingText?: string
}

export function LoadingButton({
  loading,
  children,
  disabled,
  className,
  variant = 'default',
  size = 'default',
  loadingText
}: LoadingButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
        {
          'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'default',
          'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground': variant === 'outline',
          'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
          'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
          'underline-offset-4 hover:underline text-primary': variant === 'link',
          'h-10 py-2 px-4': size === 'default',
          'h-9 px-3 rounded-md': size === 'sm',
          'h-11 px-8 rounded-md': size === 'lg',
          'h-10 w-10': size === 'icon'
        },
        className
      )}
      disabled={disabled || loading}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? loadingText || 'Loading...' : children}
    </button>
  )
}

interface LoadingCardProps {
  loading: boolean
  children: ReactNode
  className?: string
  lines?: number
}

export function LoadingCard({ loading, children, className, lines = 3 }: LoadingCardProps) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            {i === 0 && <div className="h-8 bg-gray-200 rounded animate-pulse"></div>}
          </div>
        ))}
      </div>
    )
  }

  return <>{children}</>
}

interface LoadingOverlayProps {
  loading: boolean
  children: ReactNode
  text?: string
  className?: string
}

export function LoadingOverlay({ loading, children, text = 'Loading...', className }: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">{text}</span>
          </div>
        </div>
      )}
    </div>
  )
}
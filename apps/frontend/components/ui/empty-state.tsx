"use client"

import React from 'react'
import { Button } from '@/components/ui/atoms/button'
import { Card, CardContent } from '@/components/ui/atoms/card'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const iconSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  return (
    <Card className={cn('w-full max-w-md mx-auto', className)}>
      <CardContent className={cn('text-center', sizeClasses[size])}>
        {icon && (
          <div className={cn(
            'mx-auto mb-4 text-muted-foreground',
            iconSizeClasses[size]
          )}>
            {icon}
          </div>
        )}
        
        <div className="space-y-2">
          <h3 className={cn(
            'font-semibold text-foreground',
            size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-2xl'
          )}>
            {title}
          </h3>
          
          {description && (
            <p className={cn(
              'text-muted-foreground',
              size === 'sm' ? 'text-sm' : 'text-base'
            )}>
              {description}
            </p>
          )}
        </div>

        {(action || secondaryAction) && (
          <div className={cn(
            'mt-6 flex flex-col sm:flex-row gap-3 justify-center',
            action && secondaryAction ? 'flex-col sm:flex-row' : 'flex-col'
          )}>
            {action && (
              <Button
                onClick={action.onClick}
                variant={action.variant || 'default'}
                className="w-full sm:w-auto"
              >
                {action.label}
              </Button>
            )}
            
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant={secondaryAction.variant || 'outline'}
                className="w-full sm:w-auto"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Common empty state configurations
export function EmptyUsers({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      title="No users found"
      description="Get started by creating your first user account."
      icon={
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      }
      action={{
        label: "Create User",
        onClick: onCreate
      }}
    />
  )
}

export function EmptyFaceRecords({ onEnroll }: { onEnroll: () => void }) {
  return (
    <EmptyState
      title="No face records"
      description="Enroll a face to enable facial recognition."
      icon={
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      }
      action={{
        label: "Enroll Face",
        onClick: onEnroll
      }}
    />
  )
}

export function EmptyEvents({ onRefresh }: { onRefresh: () => void }) {
  return (
    <EmptyState
      title="No events yet"
      description="Face recognition events will appear here when they occur."
      icon={
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      }
      action={{
        label: "Refresh",
        onClick: onRefresh,
        variant: "outline"
      }}
    />
  )
}

export function EmptySearch({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      title={`No results for "${query}"`}
      description="Try adjusting your search terms or browse all items."
      icon={
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      action={{
        label: "Clear Search",
        onClick: onClear,
        variant: "outline"
      }}
    />
  )
}

export function EmptyNetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      title="Network error"
      description="Unable to connect to the server. Please check your connection."
      icon={
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      }
      action={{
        label: "Try Again",
        onClick: onRetry
      }}
      secondaryAction={{
        label: "Reload Page",
        onClick: () => window.location.reload(),
        variant: "ghost"
      }}
    />
  )
}

export function EmptyPermissions({ onRequestAccess }: { onRequestAccess: () => void }) {
  return (
    <EmptyState
      title="Access denied"
      description="You don't have permission to view this content."
      icon={
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      }
      action={{
        label: "Request Access",
        onClick: onRequestAccess,
        variant: "outline"
      }}
    />
  )
}
"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/atoms/button'
import { Card, CardContent } from '@/components/ui/atoms/card'
import { Badge } from '@/components/ui/atoms/badge'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface NetworkErrorProps {
  error?: Error | string
  onRetry?: () => void
  onGoBack?: () => void
  className?: string
  showDetails?: boolean
  retryCount?: number
}

export function NetworkError({
  error,
  onRetry,
  onGoBack,
  className,
  showDetails = false,
  retryCount = 0
}: NetworkErrorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [retryInProgress, setRetryInProgress] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = async () => {
    if (!onRetry) return

    setRetryInProgress(true)
    try {
      await onRetry()
      toast.success('Connection restored!')
    } catch {
      toast.error('Still unable to connect. Please try again.')
    } finally {
      setRetryInProgress(false)
    }
  }

  const errorMessage = typeof error === 'string' ? error : error?.message || 'Network error occurred'
  const isAuthError = errorMessage.toLowerCase().includes('unauthorized') || 
                      errorMessage.toLowerCase().includes('401')
  const isServerError = errorMessage.toLowerCase().includes('500') || 
                       errorMessage.toLowerCase().includes('server')
  const isClientError = errorMessage.toLowerCase().includes('400') || 
                       errorMessage.toLowerCase().includes('client')

  const getErrorIcon = () => {
    if (!isOnline) {
      return (
        <svg className="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      )
    }
    if (isAuthError) {
      return (
        <svg className="h-16 w-16 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    }
    if (isServerError) {
      return (
        <svg className="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    }
    return (
      <svg className="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const getErrorTitle = () => {
    if (!isOnline) return 'You\'re offline'
    if (isAuthError) return 'Authentication Error'
    if (isServerError) return 'Server Error'
    if (isClientError) return 'Client Error'
    return 'Connection Error'
  }

  const getErrorDescription = () => {
    if (!isOnline) return 'Please check your internet connection and try again.'
    if (isAuthError) return 'Please log in again to continue.'
    if (isServerError) return 'Our servers are having trouble. Please try again later.'
    if (isClientError) return 'There was a problem with your request. Please check and try again.'
    return 'Unable to connect to the server. Please try again.'
  }

  return (
    <Card className={cn('w-full max-w-lg mx-auto', className)}>
      <CardContent className="p-6 text-center">
        <div className="mb-6">
          {getErrorIcon()}
        </div>

        <div className="space-y-2 mb-6">
          <h3 className="text-xl font-semibold text-foreground">
            {getErrorTitle()}
          </h3>
          <p className="text-muted-foreground">
            {getErrorDescription()}
          </p>
          
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            {retryCount > 0 && (
              <Badge variant="secondary">
                {retryCount} attempt{retryCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {onRetry && (
            <Button 
              onClick={handleRetry} 
              disabled={retryInProgress || !isOnline}
              className="w-full"
            >
              {retryInProgress ? 'Trying...' : 'Try Again'}
            </Button>
          )}
          
          {onGoBack && (
            <Button 
              onClick={onGoBack} 
              variant="outline"
              className="w-full"
            >
              Go Back
            </Button>
          )}

          {isAuthError && (
            <Button 
              onClick={() => {
                localStorage.removeItem('token')
                window.location.href = '/login'
              }}
              variant="destructive"
              className="w-full"
            >
              Log In Again
            </Button>
          )}
        </div>

        {showDetails && errorMessage && (
          <div className="mt-6 p-3 bg-muted rounded-lg">
            <p className="text-xs font-mono text-muted-foreground break-all">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="mt-6 text-xs text-muted-foreground">
          <p>If this problem persists, please contact support.</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Network status monitoring component
interface NetworkStatusProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showOfflineBanner?: boolean
}

export function NetworkStatus({ 
  children, 
  fallback, 
  showOfflineBanner = true 
}: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Connection restored!')
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.error('You\'re offline. Some features may not work.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOnline) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <NetworkError 
          error="You're offline. Please check your internet connection."
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <>
      {showOfflineBanner && !isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground p-2 text-center text-sm">
          ⚠️ You're offline. Some features may not work.
        </div>
      )}
      {children}
    </>
  )
}

// Retry button component
interface RetryButtonProps {
  onRetry: () => void
  loading?: boolean
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function RetryButton({ 
  onRetry, 
  loading = false, 
  className,
  variant = 'outline',
  size = 'sm'
}: RetryButtonProps) {
  return (
    <Button
      onClick={onRetry}
      disabled={loading}
      variant={variant}
      size={size}
      className={cn('gap-2', className)}
    >
      {loading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Retrying...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry
        </>
      )}
    </Button>
  )
}
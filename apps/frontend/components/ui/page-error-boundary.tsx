"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/atoms/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/atoms/card'
import { Badge } from '@/components/ui/atoms/badge'
import { NetworkError } from './network-error'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

interface PageErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  pageName?: string
}

export class PageErrorBoundary extends Component<PageErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    })

    // Log error to console
    console.error(`Page Error [${this.state.errorId}]:`, error, errorInfo)

    // Call error handler if provided
    this.props.onError?.(error, errorInfo)

    // In production, you could send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToErrorTracking(error, errorInfo, this.state.errorId)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoBack = () => {
    window.history.back()
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId } = this.state
      const { fallback, showDetails = process.env.NODE_ENV === 'development', pageName } = this.props

      // If fallback is provided, use it
      if (fallback) {
        return <>{fallback}</>
      }

      // Handle network errors differently
      if (error?.name === 'NetworkError' || error?.message?.includes('Network')) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <NetworkError 
              error={error}
              onRetry={this.handleReload}
              onGoBack={this.handleGoBack}
              showDetails={showDetails}
            />
          </div>
        )
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mb-4">
                <div className="h-16 w-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
                  <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              
              <CardTitle className="text-2xl">
                Oops! Something went wrong
              </CardTitle>
              
              <CardDescription className="text-base">
                {pageName && `An error occurred while loading the ${pageName} page. `}
                We've been notified and are working on a fix.
              </CardDescription>

              <div className="flex items-center justify-center gap-2 mt-4">
                <Badge variant="destructive">
                  Error ID: {errorId}
                </Badge>
                {process.env.NODE_ENV === 'development' && (
                  <Badge variant="outline">
                    Development Mode
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleReload} className="flex-1">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reload Page
                </Button>
                
                <Button onClick={this.handleGoBack} variant="outline" className="flex-1">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Go Back
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go Home
                </Button>
              </div>

              {showDetails && error && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Error Details</h4>
                    <p className="text-sm font-mono text-muted-foreground break-all">
                      {error.message}
                    </p>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                  </div>

                  {errorInfo && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">Component Stack</h4>
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  If this problem persists, please contact support with the Error ID above.
                </p>
                <p className="mt-1">
                  <a 
                    href="mailto:support@example.com?subject=Error Report: ${errorId}"
                    className="hover:underline"
                  >
                    support@example.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for page-level error boundaries
export function withPageErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<PageErrorBoundaryProps, 'children'> = {}
) {
  return function WithPageErrorBoundary(props: P) {
    return (
      <PageErrorBoundary {...options}>
        <Component {...props} />
      </PageErrorBoundary>
    )
  }
}

// Hook-based error boundary for functional components
export function usePageErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)
  const [errorInfo, setErrorInfo] = React.useState<ErrorInfo | null>(null)

  const captureError = React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    setError(error)
    setErrorInfo(errorInfo || null)
    console.error('Page Error captured:', error, errorInfo)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
    setErrorInfo(null)
  }, [])

  return {
    error,
    errorInfo,
    captureError,
    clearError,
    hasError: error !== null
  }
}

// Specific error boundaries for common page types
export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary pageName="Dashboard">
      {children}
    </PageErrorBoundary>
  )
}

export function UsersErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary pageName="Users">
      {children}
    </PageErrorBoundary>
  )
}

export function FaceRecognitionErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary pageName="Face Recognition">
      {children}
    </PageErrorBoundary>
  )
}

export function ProfileErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary pageName="Profile">
      {children}
    </PageErrorBoundary>
  )
}
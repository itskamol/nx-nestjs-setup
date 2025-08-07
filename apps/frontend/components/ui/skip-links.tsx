"use client"

import React from 'react'
import { Button } from "@/components/ui/button"

interface SkipLinksProps {
  mainContentId?: string
  navigationId?: string
}

export function SkipLinks({ 
  mainContentId = "main-content", 
  navigationId = "navigation" 
}: SkipLinksProps) {
  const handleSkipToContent = () => {
    const element = document.getElementById(mainContentId)
    if (element) {
      element.focus()
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleSkipToNavigation = () => {
    const element = document.getElementById(navigationId)
    if (element) {
      element.focus()
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <nav 
      className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:bg-background focus:border focus:border-border focus:p-4 focus:z-50"
      aria-label="Skip links"
    >
      <ul className="flex flex-col gap-2">
        <li>
          <Button
            variant="ghost"
            className="text-sm"
            onClick={handleSkipToContent}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSkipToContent()
              }
            }}
          >
            Skip to main content
          </Button>
        </li>
        <li>
          <Button
            variant="ghost"
            className="text-sm"
            onClick={handleSkipToNavigation}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSkipToNavigation()
              }
            }}
          >
            Skip to navigation
          </Button>
        </li>
      </ul>
    </nav>
  )
}
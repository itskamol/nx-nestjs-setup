"use client"

import { usePathname } from 'next/navigation'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home } from 'lucide-react'

interface AutoBreadcrumbProps {
  className?: string
  homeLabel?: string
  showHome?: boolean
}

export function AutoBreadcrumb({ 
  className, 
  homeLabel = "Dashboard", 
  showHome = true 
}: AutoBreadcrumbProps) {
  const pathname = usePathname()
  
  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    
    // Skip breadcrumbs for certain paths
    if (pathname === '/dashboard' || pathname === '/') {
      return []
    }
    
    const breadcrumbs = []
    
    // Add home breadcrumb
    if (showHome) {
      breadcrumbs.push({
        label: homeLabel,
        href: '/dashboard',
        isHome: true
      })
    }
    
    // Process path segments
    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      
      // Skip certain segments
      if (segment === 'dashboard' && showHome) return
      
      const label = formatSegment(segment)
      const isLast = index === segments.length - 1
      
      breadcrumbs.push({
        label,
        href: currentPath,
        isLast,
        segment
      })
    })
    
    return breadcrumbs
  }
  
  const formatSegment = (segment: string): string => {
    // Convert URL segments to readable labels
    const segmentMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'users': 'Users',
      'create': 'Create',
      'edit': 'Edit',
      'face-recognition': 'Face Recognition',
      'enroll': 'Enroll',
      'events': 'Events',
      'stats': 'Statistics',
      'settings': 'Settings',
      'profile': 'Profile',
      'login': 'Login',
      'register': 'Register',
      'forgot-password': 'Forgot Password'
    }
    
    // Check if we have a mapping for this segment
    if (segmentMap[segment]) {
      return segmentMap[segment]
    }
    
    // Handle ID segments (likely user IDs or other UUIDs)
    if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) || 
        segment.match(/^\d+$/)) {
      return 'Details'
    }
    
    // Convert kebab-case or snake_case to Title Case
    return segment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .replace(/\b(\w+)s\b/, '$1') // Remove trailing 's' for plural forms
  }
  
  const breadcrumbs = generateBreadcrumbs()
  
  // Don't render if no breadcrumbs
  if (breadcrumbs.length === 0) {
    return null
  }
  
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <BreadcrumbItem key={item.href}>
            {item.isHome ? (
              <>
                <BreadcrumbLink href={item.href} className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  <span>{item.label}</span>
                </BreadcrumbLink>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </>
            ) : item.isHome ? (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            ) : (
              <>
                <BreadcrumbLink href={item.href}>
                  {item.label}
                </BreadcrumbLink>
                <BreadcrumbSeparator />
              </>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

// Hook for getting breadcrumb data
export function useBreadcrumbData() {
  const pathname = usePathname()
  
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    
    if (pathname === '/dashboard' || pathname === '/') {
      return []
    }
    
    const breadcrumbs = []
    
    // Add home breadcrumb
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
      isHome: true
    })
    
    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      
      if (segment === 'dashboard') return
      
      const label = formatSegment(segment)
      const isLast = index === segments.length - 1
      
      breadcrumbs.push({
        label,
        href: currentPath,
        isLast,
        segment
      })
    })
    
    return breadcrumbs
  }
  
  const formatSegment = (segment: string): string => {
    const segmentMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'users': 'Users',
      'create': 'Create',
      'edit': 'Edit',
      'face-recognition': 'Face Recognition',
      'enroll': 'Enroll',
      'events': 'Events',
      'stats': 'Statistics',
      'settings': 'Settings',
      'profile': 'Profile',
      'login': 'Login',
      'register': 'Register',
      'forgot-password': 'Forgot Password'
    }
    
    if (segmentMap[segment]) {
      return segmentMap[segment]
    }
    
    if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) || 
        segment.match(/^\d+$/)) {
      return 'Details'
    }
    
    return segment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .replace(/\b(\w+)s\b/, '$1')
  }
  
  return {
    breadcrumbs: getBreadcrumbs(),
    pathname,
    title: getBreadcrumbs()[getBreadcrumbs().length - 1]?.label || 'Dashboard'
  }
}
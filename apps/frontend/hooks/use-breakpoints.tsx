import { useEffect, useState } from 'react'

export interface Breakpoint {
  isXs: boolean
  isSm: boolean
  isMd: boolean
  isLg: boolean
  isXl: boolean
  is2xl: boolean
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  currentBreakpoint: string
  windowWidth: number
  windowHeight: number
}

const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
}

export function useBreakpoints(): Breakpoint {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const { width, height } = windowSize

  const isXs = width >= breakpoints.xs && width < breakpoints.sm
  const isSm = width >= breakpoints.sm && width < breakpoints.md
  const isMd = width >= breakpoints.md && width < breakpoints.lg
  const isLg = width >= breakpoints.lg && width < breakpoints.xl
  const isXl = width >= breakpoints.xl && width < breakpoints['2xl']
  const is2xl = width >= breakpoints['2xl']

  const isMobile = width < breakpoints.md
  const isTablet = width >= breakpoints.md && width < breakpoints.lg
  const isDesktop = width >= breakpoints.lg

  let currentBreakpoint = 'xs'
  if (isSm) currentBreakpoint = 'sm'
  else if (isMd) currentBreakpoint = 'md'
  else if (isLg) currentBreakpoint = 'lg'
  else if (isXl) currentBreakpoint = 'xl'
  else if (is2xl) currentBreakpoint = '2xl'

  return {
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    is2xl,
    isMobile,
    isTablet,
    isDesktop,
    currentBreakpoint,
    windowWidth: width,
    windowHeight: height,
  }
}

export function useResponsiveValue<T>(
  values: Partial<Record<keyof Breakpoint, T>>,
  defaultValue: T
): T {
  const breakpoints = useBreakpoints()

  // Return the most specific matching value
  const valueOrder: (keyof Breakpoint)[] = [
    'is2xl',
    'isXl',
    'isLg',
    'isMd',
    'isSm',
    'isXs',
    'isMobile',
    'isTablet',
    'isDesktop',
  ]

  for (const key of valueOrder) {
    if (values[key] !== undefined && breakpoints[key]) {
      return values[key] as T
    }
  }

  return defaultValue
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = () => setMatches(media.matches)
    media.addListener(listener)

    return () => media.removeListener(listener)
  }, [query])

  return matches
}

// Common media query hooks
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)')
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1024px)')
}

export function useIsTouchDevice() {
  return useMediaQuery('(hover: none) and (pointer: coarse)')
}

export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

export function usePrefersDarkMode() {
  return useMediaQuery('(prefers-color-scheme: dark)')
}
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveContainerProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  center?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function ResponsiveContainer({
  children,
  className,
  maxWidth = '2xl',
  center = true,
  padding = 'md'
}: ResponsiveContainerProps) {

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  }

  const paddingClasses = {
    none: '',
    sm: 'p-2 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }

  return (
    <div
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        center && 'mx-auto',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

interface ResponsiveGridProps {
  children: ReactNode
  className?: string
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: 'sm' | 'md' | 'lg'
}

export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, sm: 2, lg: 3 },
  gap = 'md'
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4 lg:gap-6',
    lg: 'gap-4 sm:gap-6 lg:gap-8'
  }

  const gridClasses = [
    `grid-cols-${cols.default || 1}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`
  ].filter(Boolean).join(' ')

  return (
    <div className={cn('grid', gridClasses, gapClasses[gap], className)}>
      {children}
    </div>
  )
}

interface ResponsiveFlexProps {
  children: ReactNode
  className?: string
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse'
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  gap?: 'sm' | 'md' | 'lg'
  responsive?: {
    direction?: Partial<Record<'sm' | 'md' | 'lg' | 'xl', string>>
    wrap?: Partial<Record<'sm' | 'md' | 'lg' | 'xl', string>>
    justify?: Partial<Record<'sm' | 'md' | 'lg' | 'xl', string>>
    align?: Partial<Record<'sm' | 'md' | 'lg' | 'xl', string>>
  }
}

export function ResponsiveFlex({
  children,
  className,
  direction = 'row',
  wrap = 'nowrap',
  justify = 'start',
  align = 'stretch',
  gap = 'md',
  responsive
}: ResponsiveFlexProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4'
  }

  const flexClasses = [
    `flex-${direction}`,
    `flex-${wrap}`,
    `justify-${justify}`,
    `items-${align}`,
    gapClasses[gap]
  ]

  // Add responsive classes if provided
  if (responsive) {
    Object.entries(responsive).forEach(([breakpoint, styles]) => {
      Object.entries(styles).forEach(([prop, value]) => {
        if (breakpoint === 'sm') {
          flexClasses.push(`sm:${prop}-${value}`)
        } else if (breakpoint === 'md') {
          flexClasses.push(`md:${prop}-${value}`)
        } else if (breakpoint === 'lg') {
          flexClasses.push(`lg:${prop}-${value}`)
        } else if (breakpoint === 'xl') {
          flexClasses.push(`xl:${prop}-${value}`)
        }
      })
    })
  }

  return (
    <div className={cn('flex', ...flexClasses, className)}>
      {children}
    </div>
  )
}

interface ResponsiveTextProps {
  children: ReactNode
  className?: string
  variant?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  color?: string
  responsive?: boolean
}

export function ResponsiveText({
  children,
  className,
  variant = 'base',
  weight = 'normal',
  color,
  responsive = true
}: ResponsiveTextProps) {
  const sizeClasses = {
    xs: responsive ? 'text-xs sm:text-sm' : 'text-xs',
    sm: responsive ? 'text-sm sm:text-base' : 'text-sm',
    base: responsive ? 'text-base sm:text-lg' : 'text-base',
    lg: responsive ? 'text-lg sm:text-xl lg:text-2xl' : 'text-lg',
    xl: responsive ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-xl',
    '2xl': responsive ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-2xl',
    '3xl': responsive ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-3xl',
    '4xl': responsive ? 'text-4xl sm:text-5xl lg:text-6xl' : 'text-4xl'
  }

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  }

  return (
    <span className={cn(sizeClasses[variant], weightClasses[weight], color, className)}>
      {children}
    </span>
  )
}

interface ResponsiveSpacingProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  type?: 'margin' | 'padding'
  direction?: 'all' | 'top' | 'bottom' | 'left' | 'right' | 'x' | 'y'
}

export function ResponsiveSpacing({
  className,
  size = 'md',
  type = 'margin',
  direction = 'all'
}: ResponsiveSpacingProps) {
  const sizeClasses = {
    sm: '2',
    md: '4',
    lg: '6',
    xl: '8'
  }

  const typePrefix = type === 'margin' ? 'm' : 'p'
  const sizeClass = sizeClasses[size]

  let spacingClass = ''
  if (direction === 'all') {
    spacingClass = `${typePrefix}-${sizeClass}`
  } else if (direction === 'x') {
    spacingClass = `${typePrefix}x-${sizeClass}`
  } else if (direction === 'y') {
    spacingClass = `${typePrefix}y-${sizeClass}`
  } else {
    spacingClass = `${typePrefix}${direction[0]}-${sizeClass}`
  }

  return <div className={cn(spacingClass, className)} />
}

interface ResponsiveHiddenProps {
  children: ReactNode
  className?: string
  hide?: 'mobile' | 'tablet' | 'desktop' | 'sm' | 'md' | 'lg' | 'xl'
  show?: 'mobile' | 'tablet' | 'desktop' | 'sm' | 'md' | 'lg' | 'xl'
}

export function ResponsiveHidden({
  children,
  className,
  hide,
  show
}: ResponsiveHiddenProps) {
  const getHiddenClass = () => {
    if (hide) {
      switch (hide) {
        case 'mobile': return 'hidden sm:block'
        case 'tablet': return 'hidden md:block lg:hidden'
        case 'desktop': return 'lg:hidden'
        case 'sm': return 'hidden sm:block'
        case 'md': return 'md:hidden'
        case 'lg': return 'lg:hidden'
        case 'xl': return 'xl:hidden'
      }
    }
    if (show) {
      switch (show) {
        case 'mobile': return 'block sm:hidden'
        case 'tablet': return 'hidden md:block lg:hidden'
        case 'desktop': return 'hidden lg:block'
        case 'sm': return 'block sm:hidden'
        case 'md': return 'block md:hidden lg:block'
        case 'lg': return 'block lg:hidden xl:block'
        case 'xl': return 'block xl:hidden'
      }
    }
    return ''
  }

  return (
    <div className={cn(getHiddenClass(), className)}>
      {children}
    </div>
  )
}
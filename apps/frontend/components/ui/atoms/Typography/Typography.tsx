"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { TypographyProps } from './Typography.types';

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body1',
  color = 'textPrimary',
  align = 'left',
  weight = 'regular',
  children,
  className,
  as,
  ...props
}) => {
  const variantMapping = {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    body1: 'p',
    body2: 'p',
    caption: 'span',
    overline: 'span',
  };

  const Component = as || variantMapping[variant];

  const variantClasses = {
    h1: 'text-4xl md:text-5xl lg:text-6xl',
    h2: 'text-3xl md:text-4xl lg:text-5xl',
    h3: 'text-2xl md:text-3xl lg:text-4xl',
    h4: 'text-xl md:text-2xl lg:text-3xl',
    h5: 'text-lg md:text-xl lg:text-2xl',
    h6: 'text-base md:text-lg lg:text-xl',
    body1: 'text-base',
    body2: 'text-sm',
    caption: 'text-xs',
    overline: 'text-xs uppercase tracking-wider',
  };

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-pink-600',
    success: 'text-green-600',
    warning: 'text-orange-600',
    error: 'text-red-600',
    textPrimary: 'text-foreground',
    textSecondary: 'text-muted-foreground',
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };

  const weightClasses = {
    light: 'font-light',
    regular: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const classes = cn(
    variantClasses[variant],
    colorClasses[color],
    alignClasses[align],
    weightClasses[weight],
    className
  );

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

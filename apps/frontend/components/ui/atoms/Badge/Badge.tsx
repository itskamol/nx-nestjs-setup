"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { BadgeProps } from './Badge.types';

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'medium',
  children,
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-full';
  
  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-1 text-sm',
    large: 'px-3 py-1.5 text-base',
  };
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-pink-100 text-pink-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-orange-100 text-orange-800',
    error: 'bg-red-100 text-red-800',
    outline: 'border border-gray-300 text-gray-700 bg-transparent',
  };

  const classes = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

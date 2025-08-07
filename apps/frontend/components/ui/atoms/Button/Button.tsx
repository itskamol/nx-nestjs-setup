"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { ButtonProps } from './Button.types';

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  color = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  startIcon,
  endIcon,
  onClick,
  children,
  type = 'button',
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 border font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm rounded-md',
    medium: 'px-4 py-2 text-sm rounded-md',
    large: 'px-6 py-3 text-base rounded-lg',
  };
  
  const variantClasses = {
    primary: {
      primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-pink-600 text-white border-pink-600 hover:bg-pink-700 focus:ring-pink-500',
      success: 'bg-green-600 text-white border-green-600 hover:bg-green-700 focus:ring-green-500',
      warning: 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700 focus:ring-orange-500',
      error: 'bg-red-600 text-white border-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    secondary: {
      primary: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 focus:ring-blue-500',
      secondary: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 focus:ring-pink-500',
      success: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 focus:ring-green-500',
      warning: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 focus:ring-orange-500',
      error: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 focus:ring-red-500',
    },
    outlined: {
      primary: 'bg-transparent text-blue-600 border-blue-600 hover:bg-blue-50 focus:ring-blue-500',
      secondary: 'bg-transparent text-pink-600 border-pink-600 hover:bg-pink-50 focus:ring-pink-500',
      success: 'bg-transparent text-green-600 border-green-600 hover:bg-green-50 focus:ring-green-500',
      warning: 'bg-transparent text-orange-600 border-orange-600 hover:bg-orange-50 focus:ring-orange-500',
      error: 'bg-transparent text-red-600 border-red-600 hover:bg-red-50 focus:ring-red-500',
    },
    text: {
      primary: 'bg-transparent text-blue-600 border-transparent hover:bg-blue-50 focus:ring-blue-500',
      secondary: 'bg-transparent text-pink-600 border-transparent hover:bg-pink-50 focus:ring-pink-500',
      success: 'bg-transparent text-green-600 border-transparent hover:bg-green-50 focus:ring-green-500',
      warning: 'bg-transparent text-orange-600 border-transparent hover:bg-orange-50 focus:ring-orange-500',
      error: 'bg-transparent text-red-600 border-transparent hover:bg-red-50 focus:ring-red-500',
    },
    ghost: {
      primary: 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100 focus:ring-gray-500',
      secondary: 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100 focus:ring-gray-500',
      success: 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100 focus:ring-gray-500',
      warning: 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100 focus:ring-gray-500',
      error: 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100 focus:ring-gray-500',
    },
  };

  const classes = cn(
    baseClasses,
    sizeClasses[size],
    variantClasses[variant][color],
    fullWidth && 'w-full',
    loading && 'cursor-wait',
    className
  );

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {!loading && startIcon && startIcon}
      {children}
      {!loading && endIcon && endIcon}
    </button>
  );
};

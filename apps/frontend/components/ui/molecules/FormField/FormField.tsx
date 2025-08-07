"use client"

import React from 'react';
import { cn } from '@/lib/utils';
import { FormFieldProps } from './FormField.types';

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required = false,
  children,
  className,
  id,
}) => {
  const fieldId = id || React.useId();
  const errorId = error ? `${fieldId}-error` : undefined;
  const helperId = helperText && !error ? `${fieldId}-helper` : undefined;

  return (
    <div 
      className={cn('space-y-1', className)}
      role="group"
      aria-labelledby={label ? fieldId : undefined}
    >
      {label && (
        <label 
          htmlFor={fieldId}
          id={fieldId}
          className={cn(
            'block text-sm font-medium text-gray-700',
            required && "after:content-['*'] after:text-red-500 after:ml-1"
          )}
        >
          {label}
        </label>
      )}
      
      {React.cloneElement(children as React.ReactElement, {
        id: fieldId,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': errorId || helperId || undefined,
        'aria-required': required ? 'true' : undefined,
        ...(required && { required: true }),
      })}
      
      {error && (
        <p 
          id={errorId}
          className="text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p 
          id={helperId}
          className="text-sm text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
};

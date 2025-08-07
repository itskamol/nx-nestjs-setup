import { ReactNode } from 'react';

export interface BadgeProps {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'small' | 'medium' | 'large';
  children: ReactNode;
  className?: string;
}

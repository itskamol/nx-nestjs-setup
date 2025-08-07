import { ReactNode } from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  className?: string;
}

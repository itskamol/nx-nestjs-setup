import { User } from '@/types';

export interface UserCardProps {
  user: User;
  onEdit?: (userId: string) => void;
  onDelete?: (userId: string) => void;
  onToggleStatus?: (userId: string) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  showStatus?: boolean;
  showRole?: boolean;
  showAvatar?: boolean;
  truncateEmail?: boolean;
  highlightActive?: boolean;
}

export interface UserCardConfig {
  variant?: UserCardProps['variant'];
  showActions?: boolean;
  showStatus?: boolean;
  showRole?: boolean;
  showAvatar?: boolean;
  truncateEmail?: boolean;
  highlightActive?: boolean;
  actionButtons?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (userId: string) => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
    disabled?: boolean;
    showCondition?: (user: User) => boolean;
  }>;
}

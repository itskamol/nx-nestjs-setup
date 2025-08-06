# Component Architecture and Design System

## Component Library Structure

### 1. Atomic Design Principles

#### 1.1. Atoms (Basic Elements)
```typescript
// src/components/ui/atoms/
├── Button/
│   ├── Button.tsx
│   ├── Button.types.ts
│   └── Button.stories.tsx
├── Input/
│   ├── Input.tsx
│   ├── Input.types.ts
│   └── Input.stories.tsx
├── Typography/
│   ├── Typography.tsx
│   ├── Typography.types.ts
│   └── Typography.stories.tsx
├── Icon/
│   ├── Icon.tsx
│   ├── Icon.types.ts
│   └── Icon.stories.tsx
├── Avatar/
│   ├── Avatar.tsx
│   ├── Avatar.types.ts
│   └── Avatar.stories.tsx
└── Badge/
    ├── Badge.tsx
    ├── Badge.types.ts
    └── Badge.stories.tsx
```

#### 1.2. Molecules (Combined Elements)
```typescript
// src/components/ui/molecules/
├── FormField/
│   ├── FormField.tsx
│   ├── FormField.types.ts
│   └── FormField.stories.tsx
├── SearchBar/
│   ├── SearchBar.tsx
│   ├── SearchBar.types.ts
│   └── SearchBar.stories.tsx
├── UserCard/
│   ├── UserCard.tsx
│   ├── UserCard.types.ts
│   └── UserCard.stories.tsx
├── StatCard/
│   ├── StatCard.tsx
│   ├── StatCard.types.ts
│   └── StatCard.stories.tsx
└── DataTable/
    ├── DataTable.tsx
    ├── DataTable.types.ts
    └── DataTable.stories.tsx
```

#### 1.3. Organisms (Complex Components)
```typescript
// src/components/ui/organisms/
├── Header/
│   ├── Header.tsx
│   ├── Header.types.ts
│   └── Header.stories.tsx
├── Sidebar/
│   ├── Sidebar.tsx
│   ├── Sidebar.types.ts
│   └── Sidebar.stories.tsx
├── UserTable/
│   ├── UserTable.tsx
│   ├── UserTable.types.ts
│   └── UserTable.stories.tsx
├── FaceRecognition/
│   ├── FaceRecognition.tsx
│   ├── FaceRecognition.types.ts
│   └── FaceRecognition.stories.tsx
└── AuthForm/
    ├── AuthForm.tsx
    ├── AuthForm.types.ts
    └── AuthForm.stories.tsx
```

### 2. Component Specifications

#### 2.1. Button Component
```typescript
// Button.types.ts
export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outlined' | 'text' | 'ghost';
  size: 'small' | 'medium' | 'large';
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}

// Button.tsx
import styled from 'styled-components';

const StyledButton = styled.button<ButtonProps>`
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  /* Size variants */
  ${({ size }) => {
    switch (size) {
      case 'small':
        return 'padding: 8px 16px; font-size: 14px;';
      case 'large':
        return 'padding: 16px 32px; font-size: 18px;';
      default:
        return 'padding: 12px 24px; font-size: 16px;';
    }
  }}
  
  /* Color variants */
  ${({ variant, color, theme }) => {
    const colors = theme.colors[color];
    switch (variant) {
      case 'primary':
        return `
          background: ${colors.main};
          color: white;
          &:hover { background: ${colors.dark}; }
        `;
      case 'outlined':
        return `
          background: transparent;
          color: ${colors.main};
          border: 2px solid ${colors.main};
          &:hover { background: ${colors.light}; }
        `;
      case 'text':
        return `
          background: transparent;
          color: ${colors.main};
          padding: 0;
          &:hover { background: ${colors.light}; }
        `;
      default:
        return '';
    }
  }}
  
  /* Disabled state */
  ${({ disabled }) => disabled && `
    opacity: 0.5;
    cursor: not-allowed;
  `}
  
  /* Loading state */
  ${({ loading }) => loading && `
    cursor: wait;
  `}
  
  /* Full width */
  ${({ fullWidth }) => fullWidth && `
    width: 100%;
  `}
`;
```

#### 2.2. Input Component
```typescript
// Input.types.ts
export interface InputProps {
  type: 'text' | 'email' | 'password' | 'number' | 'date';
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
}

// Input.tsx
import styled from 'styled-components';

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
`;

const InputLabel = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid ${({ theme }) => theme.colors.border.main};
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary.main};
  }
  
  ${({ error }) => error && `
    border-color: ${({ theme }) => theme.colors.error.main};
  `}
  
  ${({ disabled }) => disabled && `
    background: ${({ theme }) => theme.colors.background.disabled};
    cursor: not-allowed;
  `}
`;

const ErrorMessage = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.error.main};
  margin-top: 4px;
`;

const HelperText = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: 4px;
`;
```

#### 2.3. DataTable Component
```typescript
// DataTable.types.ts
export interface Column<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  selection?: {
    selectedRowKeys: string[];
    onChange: (selectedRowKeys: string[]) => void;
  };
  onRowClick?: (record: T) => void;
  rowKey: string;
  emptyText?: string;
}

// DataTable.tsx
import styled from 'styled-components';

const TableContainer = styled.div`
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border.main};
  background: ${({ theme }) => theme.colors.background.secondary};
`;

const TableCell = styled.td`
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const TableRow = styled.tr`
  &:hover {
    background: ${({ theme }) => theme.colors.background.hover};
  }
  
  ${({ clickable }) => clickable && `
    cursor: pointer;
  `}
`;
```

### 3. Layout Components

#### 3.1. Dashboard Layout
```typescript
// DashboardLayout.tsx
import styled from 'styled-components';

const DashboardContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background.main};
`;

const Sidebar = styled.aside`
  width: 280px;
  background: white;
  border-right: 1px solid ${({ theme }) => theme.colors.border.main};
  padding: 24px 0;
  position: fixed;
  height: 100vh;
  overflow-y: auto;
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: 280px;
  padding: 24px;
`;

const Header = styled.header`
  background: white;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.main};
  padding: 16px 24px;
  margin-left: 280px;
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 100;
`;

const ContentArea = styled.div`
  margin-top: 80px;
`;
```

#### 3.2. Auth Layout
```typescript
// AuthLayout.tsx
import styled from 'styled-components';

const AuthContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary.main} 0%, ${({ theme }) => theme.colors.secondary.main} 100%);
  padding: 24px;
`;

const AuthCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 48px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 480px;
`;

const AuthHeader = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const AuthTitle = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 8px;
`;

const AuthSubtitle = styled.p`
  font-size: 16px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;
```

### 4. Form Components

#### 4.1. LoginForm Component
```typescript
// LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, FormField } from '../ui';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = ({ onSubmit, loading }: LoginFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField
        label="Email"
        error={errors.email?.message}
        required
      >
        <Input
          type="email"
          placeholder="Enter your email"
          {...register('email')}
        />
      </FormField>
      
      <FormField
        label="Password"
        error={errors.password?.message}
        required
      >
        <Input
          type="password"
          placeholder="Enter your password"
          {...register('password')}
        />
      </FormField>
      
      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={loading}
      >
        Sign In
      </Button>
    </form>
  );
};
```

### 5. Theme Configuration

#### 5.1. Theme Types
```typescript
// src/types/theme.ts
export interface Theme {
  colors: {
    primary: {
      main: string;
      light: string;
      dark: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
    };
    success: {
      main: string;
      light: string;
      dark: string;
    };
    warning: {
      main: string;
      light: string;
      dark: string;
    };
    error: {
      main: string;
      light: string;
      dark: string;
    };
    background: {
      main: string;
      secondary: string;
      disabled: string;
      hover: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    border: {
      main: string;
      light: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      light: number;
      regular: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}
```

#### 5.2. Theme Implementation
```typescript
// src/theme/index.ts
import { Theme } from '../types/theme';

export const lightTheme: Theme = {
  colors: {
    primary: {
      main: '#1976D2',
      light: '#E3F2FD',
      dark: '#0D47A1',
    },
    secondary: {
      main: '#DC004E',
      light: '#FCE4EC',
      dark: '#880E4F',
    },
    success: {
      main: '#4CAF50',
      light: '#E8F5E8',
      dark: '#1B5E20',
    },
    warning: {
      main: '#FF9800',
      light: '#FFF3E0',
      dark: '#E65100',
    },
    error: {
      main: '#F44336',
      light: '#FFEBEE',
      dark: '#B71C1C',
    },
    background: {
      main: '#F5F5F5',
      secondary: '#FFFFFF',
      disabled: '#F0F0F0',
      hover: '#F0F0F0',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#BDBDBD',
    },
    border: {
      main: '#E0E0E0',
      light: '#F5F5F5',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  typography: {
    fontFamily: 'Inter, Roboto, sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '24px',
      xxl: '32px',
    },
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadows: {
    sm: '0 2px 4px rgba(0,0,0,0.1)',
    md: '0 4px 8px rgba(0,0,0,0.1)',
    lg: '0 8px 16px rgba(0,0,0,0.1)',
    xl: '0 16px 32px rgba(0,0,0,0.1)',
  },
};
```

### 6. Hooks and Utilities

#### 6.1. Custom Hooks
```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// src/hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
}

// src/hooks/useApi.ts
import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

export function useApi<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T> | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios(config);
      return response;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, request };
}
```

### 7. Storybook Configuration

#### 7.1. Storybook Setup
```typescript
// .storybook/main.ts
module.exports = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-themes',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      builder: {
        useSWC: true,
      },
    },
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
};

// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import { ThemeProvider } from 'styled-components';
import { lightTheme } from '../src/theme';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={lightTheme}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
```

### 8. Component Documentation

#### 8.1. Component Story Example
```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { ButtonProps } from './Button.types';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'Button component with multiple variants and states.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outlined', 'text', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'error'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
  args: {
    variant: 'primary',
    size: 'medium',
    color: 'primary',
    disabled: false,
    loading: false,
    fullWidth: false,
    children: 'Button',
    onClick: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const WithIcon: Story = {
  args: {
    startIcon: <span>📱</span>,
    children: 'With Icon',
  },
};
```

This comprehensive component architecture provides a solid foundation for building a consistent, maintainable, and scalable UI for the Sector Staff Management System.
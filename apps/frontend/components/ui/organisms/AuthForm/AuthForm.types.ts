export interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Import types from schemas
export type { LoginFormData as SchemaLoginFormData } from '@/types/schemas';
export type { RegisterFormData as SchemaRegisterFormData } from '@/types/schemas';

export interface AuthFormProps {
  type: 'login' | 'register';
  onSubmit: (data: LoginFormData | RegisterFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
}

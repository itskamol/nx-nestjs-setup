"use client"

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../atoms/Button/Button';
import { Input } from '../../atoms/Input/Input';
import { FormField } from '../../molecules/FormField/FormField';
import { Typography } from '../../atoms/Typography/Typography';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Lock, Mail, User, X } from 'lucide-react';
import Link from 'next/link';
import { AuthFormProps } from './AuthForm.types';
import { loginSchema, registerSchema } from '@/types/schemas';

export const AuthForm: React.FC<AuthFormProps> = ({
  type,
  onSubmit,
  loading = false,
  error,
}) => {
  const schema = type === 'login' ? loginSchema : registerSchema;
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const password = watch('password', '');

  const passwordRequirements = [
    { text: 'At least 8 characters', met: password.length >= 8 },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { text: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { text: 'Contains number', met: /\d/.test(password) },
    { text: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const isLogin = type === 'login';

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Typography variant="h2" weight="bold">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {isLogin 
            ? 'Enter your credentials to access your account'
            : 'Enter your information to create a new account'
          }
        </Typography>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isLogin && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="First Name"
              error={errors.firstName?.message}
              required
            >
              <Input
                placeholder="John"
                startIcon={<User className="h-4 w-4" />}
                {...register('firstName')}
              />
            </FormField>
            
            <FormField
              label="Last Name"
              error={errors.lastName?.message}
              required
            >
              <Input
                placeholder="Doe"
                startIcon={<User className="h-4 w-4" />}
                {...register('lastName')}
              />
            </FormField>
          </div>
        )}

        <FormField
          label="Email"
          error={errors.email?.message}
          required
        >
          <Input
            type="email"
            placeholder="user@example.com"
            startIcon={<Mail className="h-4 w-4" />}
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
            placeholder={isLogin ? "Enter your password" : "Create a strong password"}
            startIcon={<Lock className="h-4 w-4" />}
            {...register('password')}
          />
        </FormField>

        {!isLogin && password && (
          <div className="space-y-2">
            <Typography variant="body2" weight="medium">
              Password Requirements:
            </Typography>
            <div className="grid grid-cols-1 gap-1">
              {passwordRequirements.map((req, index) => (
                <div key={index} className={`flex items-center gap-2 text-sm ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
                  {req.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {req.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLogin && (
          <FormField
            label="Confirm Password"
            error={errors.confirmPassword?.message}
            required
          >
            <Input
              type="password"
              placeholder="Confirm your password"
              startIcon={<Lock className="h-4 w-4" />}
              {...register('confirmPassword')}
            />
          </FormField>
        )}

        {isLogin && (
          <div className="flex items-center space-x-2">
            <Checkbox id="remember" {...register('remember')} />
            <label htmlFor="remember" className="text-sm text-gray-700">
              Remember me
            </label>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
          loading={loading}
        >
          {isLogin ? 'Sign In' : 'Create Account'}
        </Button>

        <div className="text-center space-y-2">
          {isLogin && (
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot your password?
            </Link>
          )}
          
          <div className="text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link 
              href={isLogin ? "/register" : "/login"} 
              className="text-blue-600 hover:underline font-medium"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
};

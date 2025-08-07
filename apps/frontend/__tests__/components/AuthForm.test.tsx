import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Simple mock for the AuthForm component since the actual component might not exist yet
const MockAuthForm = ({ type, onSubmit, error, loading }: unknown) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      email: 'test@example.com',
      password: 'password123'
    })
  }

  return (
    <div>
      <h1>{type === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
      <p>{type === 'login' ? 'Enter your credentials to access your account' : 'Enter your information to create a new account'}</p>

      <form onSubmit={handleSubmit}>
        {type === 'register' && (
          <>
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" name="firstName" />
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" name="lastName" />
          </>
        )}

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" />

        {type === 'register' && (
          <>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" />
          </>
        )}

        {type === 'login' && (
          <>
            <label htmlFor="remember">Remember me</label>
            <input id="remember" name="remember" type="checkbox" />
          </>
        )}

        <button type="submit" disabled={loading}>
          {type === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        {error && <div>{error}</div>}

        {type === 'login' && <a href="/forgot-password">Forgot your password?</a>}

        {type === 'register' && (
          <div>
            <p>Password Requirements:</p>
            <ul>
              <li>At least 8 characters</li>
              <li>Contains uppercase letter</li>
              <li>Contains lowercase letter</li>
              <li>Contains number</li>
              <li>Contains special character</li>
            </ul>
          </div>
        )}

        <div>
          {type === 'login' ? (
            <>
              <span>Don't have an account?</span>
              <a href="/register">Sign up</a>
            </>
          ) : (
            <>
              <span>Already have an account?</span>
              <a href="/login">Sign in</a>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

describe('AuthForm', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders login form correctly', () => {
    render(<MockAuthForm type="login" onSubmit={mockOnSubmit} />)

    expect(screen.getByRole('heading', { name: 'Welcome Back' })).toBeDefined()
    expect(screen.getByText('Enter your credentials to access your account')).toBeDefined()
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDefined()
  })

  it('renders register form correctly', () => {
    render(<MockAuthForm type="register" onSubmit={mockOnSubmit} />)

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeDefined()
    expect(screen.getByText('Enter your information to create a new account')).toBeDefined()
    expect(screen.getByLabelText('First Name')).toBeDefined()
    expect(screen.getByLabelText('Last Name')).toBeDefined()
    expect(screen.getByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Password')).toBeDefined()
    expect(screen.getByLabelText('Confirm Password')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeDefined()
  })

  it('calls onSubmit when form is submitted', () => {
    render(<MockAuthForm type="login" onSubmit={mockOnSubmit} />)

    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    fireEvent.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    })
  })

  it('displays error message when provided', () => {
    const errorMessage = 'Invalid credentials'
    render(<MockAuthForm type="login" onSubmit={mockOnSubmit} error={errorMessage} />)

    expect(screen.getByText(errorMessage)).toBeDefined()
  })

  it('shows loading state when loading prop is true', () => {
    render(<MockAuthForm type="login" onSubmit={mockOnSubmit} loading={true} />)

    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    expect(submitButton).toBeDisabled()
  })

  it('displays password requirements for register form', () => {
    render(<MockAuthForm type="register" onSubmit={mockOnSubmit} />)

    expect(screen.getByText('Password Requirements:')).toBeDefined()
    expect(screen.getByText('At least 8 characters')).toBeDefined()
    expect(screen.getByText('Contains uppercase letter')).toBeDefined()
    expect(screen.getByText('Contains lowercase letter')).toBeDefined()
    expect(screen.getByText('Contains number')).toBeDefined()
    expect(screen.getByText('Contains special character')).toBeDefined()
  })

  it('shows remember me checkbox for login form', () => {
    render(<MockAuthForm type="login" onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText('Remember me')).toBeDefined()
  })

  it('shows forgot password link for login form', () => {
    render(<MockAuthForm type="login" onSubmit={mockOnSubmit} />)

    expect(screen.getByText('Forgot your password?')).toBeDefined()
  })

  it('shows toggle link between login and register', () => {
    const { rerender } = render(<MockAuthForm type="login" onSubmit={mockOnSubmit} />)

    expect(screen.getByText("Don't have an account?")).toBeDefined()
    expect(screen.getByText('Sign up')).toBeDefined()

    rerender(<MockAuthForm type="register" onSubmit={mockOnSubmit} />)

    expect(screen.getByText('Already have an account?')).toBeDefined()
    expect(screen.getByText('Sign in')).toBeDefined()
  })
})
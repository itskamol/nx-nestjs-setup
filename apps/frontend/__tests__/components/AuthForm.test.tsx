import { fireEvent, render, screen } from '@testing-library/react'
import { AuthForm } from '@/components/ui/organisms/AuthForm/AuthForm'

// Mock the necessary dependencies
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(),
    handleSubmit: jest.fn((fn) => (e: any) => {
      e.preventDefault()
      fn({
        email: 'test@example.com',
        password: 'password123'
      })
    }),
    formState: { errors: {} },
    watch: jest.fn(() => 'password123')
  }))
}))

jest.mock('@hookform/resolvers', () => ({
  zodResolver: jest.fn(() => jest.fn())
}))

jest.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => children
}))

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }) => children,
  AlertDescription: ({ children }) => children,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props) => <input type="checkbox" {...props} />,
}));

jest.mock('@/components/ui/atoms/Button/Button', () => ({
  default: (props) => <button {...props}>{props.children}</button>,
}));

jest.mock('@/components/ui/atoms/Input/Input', () => ({
  default: (props) => <input {...props} />,
}));

jest.mock('@/components/ui/molecules/FormField/FormField', () => ({
  default: ({ children, error, label }) => (
    <div>
      {label && <label>{label}</label>}
      {children}
      {error && <span className="error">{error}</span>}
    </div>
  ),
}));

jest.mock('@/components/ui/atoms/Typography/Typography', () => ({
  default: ({ children, variant, weight }) => (
    <div className={`typography ${variant} ${weight}`}>{children}</div>
  ),
}));

describe('AuthForm', () => {
  const mockOnSubmit = jest.fn()
  
  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders login form correctly', () => {
    render(<AuthForm type="login" onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByText('Enter your credentials to access your account')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
  })

  it('renders register form correctly', () => {
    render(<AuthForm type="register" onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText('Create Account')).toBeInTheDocument()
    expect(screen.getByText('Enter your information to create a new account')).toBeInTheDocument()
    expect(screen.getByLabelText('First Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('calls onSubmit when form is submitted', () => {
    render(<AuthForm type="login" onSubmit={mockOnSubmit} />)
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    fireEvent.click(submitButton)
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    })
  })

  it('displays error message when provided', () => {
    const errorMessage = 'Invalid credentials'
    render(<AuthForm type="login" onSubmit={mockOnSubmit} error={errorMessage} />)
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('shows loading state when loading prop is true', () => {
    render(<AuthForm type="login" onSubmit={mockOnSubmit} loading={true} />)
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' })
    expect(submitButton).toBeDisabled()
  })

  it('displays password requirements for register form', () => {
    render(<AuthForm type="register" onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText('Password Requirements:')).toBeInTheDocument()
    expect(screen.getByText('At least 8 characters')).toBeInTheDocument()
    expect(screen.getByText('Contains uppercase letter')).toBeInTheDocument()
    expect(screen.getByText('Contains lowercase letter')).toBeInTheDocument()
    expect(screen.getByText('Contains number')).toBeInTheDocument()
    expect(screen.getByText('Contains special character')).toBeInTheDocument()
  })

  it('shows remember me checkbox for login form', () => {
    render(<AuthForm type="login" onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText('Remember me')).toBeInTheDocument()
  })

  it('shows forgot password link for login form', () => {
    render(<AuthForm type="login" onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument()
  })

  it('shows toggle link between login and register', () => {
    const { rerender } = render(<AuthForm type="login" onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
    expect(screen.getByText('Sign up')).toBeInTheDocument()
    
    rerender(<AuthForm type="register" onSubmit={mockOnSubmit} />)
    
    expect(screen.getByText('Already have an account?')).toBeInTheDocument()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })
})
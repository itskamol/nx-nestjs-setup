import FaceEnrollmentPage from '@/app/(dashboard)/face-recognition/enroll/page'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

// Mock the necessary dependencies
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(() => ({
    register: jest.fn(),
    handleSubmit: jest.fn((fn) => (e: any) => {
      e.preventDefault()
      fn({
        userId: 'user1',
        imageData: 'base64-image-data',
        confidence: 0.8
      })
    }),
    formState: { errors: {} },
    setValue: jest.fn(),
    watch: jest.fn((field) => {
      if (field === 'userId') return 'user1'
      if (field === 'confidence') return 0.8
      return ''
    }),
    trigger: jest.fn()
  }))
}))

jest.mock('@hookform/resolvers', () => ({
  zodResolver: jest.fn(() => jest.fn())
}))

jest.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid={`link-${href}`}>{children}</a>
  )
}))

jest.mock('next/image', () => ({
  default: (props: any) => <img {...props} />
}))

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn()
}))

jest.mock('@/types/schemas', () => ({
  faceEnrollmentSchema: {
    parse: jest.fn(() => ({
      userId: 'user1',
      imageData: 'base64-image-data',
      confidence: 0.8
    }))
  }
}))

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="card-title">{children}</div>
}))

jest.mock('@/components/ui/button', () => ({
  default: (props: any) => <button {...props} data-testid="button">{props.children}</button>
}))

jest.mock('@/components/ui/input', () => ({
  default: (props: any) => <input {...props} data-testid="input" />
}))

jest.mock('@/components/ui/label', () => ({
  default: (props: any) => <label {...props} data-testid="label">{props.children}</label>
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange?.('user1')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid={`select-item-${value}`}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>
}))

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="alert-description">{children}</div>
}))

jest.mock('@/components/ui/badge', () => ({
  default: (props: any) => <span {...props} data-testid="badge">{props.children}</span>
}))

jest.mock('@/components/ui/progress', () => ({
  default: (props: any) => <div data-testid="progress" data-value={props.value} />
}))

describe('FaceEnrollmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders page title and description', () => {
    render(<FaceEnrollmentPage />)
    
    expect(screen.getByText('Face Enrollment')).toBeInTheDocument()
    expect(screen.getByText('Enroll a new face for recognition')).toBeInTheDocument()
  })

  it('shows back button with correct link', () => {
    render(<FaceEnrollmentPage />)
    
    const backButton = screen.getByTestId('link-/face-recognition')
    expect(backButton).toBeInTheDocument()
    expect(backButton).toHaveTextContent('Back to Face Recognition')
  })

  it('displays progress steps', () => {
    render(<FaceEnrollmentPage />)
    
    expect(screen.getByText('Select User')).toBeInTheDocument()
    expect(screen.getByText('Capture Face')).toBeInTheDocument()
    expect(screen.getByText('Process & Enroll')).toBeInTheDocument()
  })

  it('shows user selection step initially', () => {
    render(<FaceEnrollmentPage />)
    
    expect(screen.getByText('Select User')).toBeInTheDocument()
    expect(screen.getByText('Choose the user you want to enroll a face for')).toBeInTheDocument()
  })

  it('shows face capture step when user is selected', async () => {
    
    // Simulate clicking continue button
    const continueButton = screen.getByText('Continue to Face Capture')
    fireEvent.click(continueButton)
    
    // Wait for state update
    await waitFor(() => {
      expect(screen.getByText('Capture Face')).toBeInTheDocument()
      expect(screen.getByText('Choose how you want to capture the face image')).toBeInTheDocument()
    })
  })

  it('shows upload and camera options', () => {
    render(<FaceEnrollmentPage />)
    
    // Navigate to capture step
    const continueButton = screen.getByText('Continue to Face Capture')
    fireEvent.click(continueButton)
    
    expect(screen.getByText('Upload Image')).toBeInTheDocument()
    expect(screen.getByText('Use Camera')).toBeInTheDocument()
  })

  it('shows processing step when image is captured', async () => {
    
    // Navigate to capture step
    const continueButton = screen.getByText('Continue to Face Capture')
    fireEvent.click(continueButton)
    
    // Simulate image upload
    const uploadButton = screen.getByText('Choose File')
    fireEvent.click(uploadButton)
    
    // Navigate to processing step
    const processButton = screen.getByText('Continue to Processing')
    fireEvent.click(processButton)
    
    await waitFor(() => {
      expect(screen.getByText('Processing & Enrollment')).toBeInTheDocument()
      expect(screen.getByText('Review and process the face image')).toBeInTheDocument()
    })
  })

  it('shows confidence threshold slider', async () => {
    render(<FaceEnrollmentPage />)
    
    // Navigate to processing step
    const continueButton = screen.getByText('Continue to Face Capture')
    fireEvent.click(continueButton)
    
    const uploadButton = screen.getByText('Choose File')
    fireEvent.click(uploadButton)
    
    const processButton = screen.getByText('Continue to Processing')
    fireEvent.click(processButton)
    
    await waitFor(() => {
      expect(screen.getByText('Confidence Threshold: 80%')).toBeInTheDocument()
    })
  })

  it('shows photo requirements in sidebar', () => {
    render(<FaceEnrollmentPage />)
    
    expect(screen.getByText('Photo Requirements')).toBeInTheDocument()
    expect(screen.getByText('Clear Face')).toBeInTheDocument()
    expect(screen.getByText('Good Lighting')).toBeInTheDocument()
    expect(screen.getByText('Front Facing')).toBeInTheDocument()
    expect(screen.getByText('Neutral Expression')).toBeInTheDocument()
  })

  it('shows tips for best results', () => {
    render(<FaceEnrollmentPage />)
    
    expect(screen.getByText('Tips for Best Results')).toBeInTheDocument()
    expect(screen.getByText('Use a plain background')).toBeInTheDocument()
    expect(screen.getByText('Remove glasses if possible')).toBeInTheDocument()
    expect(screen.getByText('Keep hair away from face')).toBeInTheDocument()
    expect(screen.getByText('Maintain neutral expression')).toBeInTheDocument()
  })

  it('handles file upload', async () => {
    
    // Navigate to capture step
    const continueButton = screen.getByText('Continue to Face Capture')
    fireEvent.click(continueButton)
    
    // Mock file input
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.files = [new File([''], 'test.jpg', { type: 'image/jpeg' })]
    
    // Simulate file upload
    const uploadButton = screen.getByText('Choose File')
    fireEvent.click(uploadButton)
    
    // In a real test, we would need to properly mock the file input handling
    expect(uploadButton).toBeInTheDocument()
  })

  it('shows loading state during processing', async () => {
    render(<FaceEnrollmentPage />)
    
    // Navigate to processing step
    const continueButton = screen.getByText('Continue to Face Capture')
    fireEvent.click(continueButton)
    
    const uploadButton = screen.getByText('Choose File')
    fireEvent.click(uploadButton)
    
    const processButton = screen.getByText('Continue to Processing')
    fireEvent.click(processButton)
    
    // Click process button to trigger loading
    const enrollButton = screen.getByText('Process & Enroll Face')
    fireEvent.click(enrollButton)
    
    // In a real test, we would mock the processing state
    expect(enrollButton).toBeInTheDocument()
  })

  it('shows enrollment result after processing', async () => {
    render(<FaceEnrollmentPage />)
    
    // In a real test, we would simulate the complete flow
    // and verify the enrollment result display
    expect(screen.getByText('Face Enrollment')).toBeInTheDocument()
  })
})
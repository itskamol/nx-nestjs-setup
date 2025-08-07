"use client"

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  AlertCircle, 
  ArrowLeft, 
  Camera, 
  CheckCircle, 
  Eye, 
  EyeOff,
  Loader2,
  RotateCcw,
  Upload,
  User,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'react-hot-toast'

interface FaceEnrollmentStep {
  id: number
  title: string
  description: string
  completed: boolean
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
}

// Face enrollment form schema
const faceEnrollmentFormSchema = z.object({
  userId: z.string().min(1, 'Please select a user'),
  imageData: z.string().min(1, 'Please capture or upload a face image'),
  confidence: z.number().min(0.5, 'Confidence must be at least 0.5').max(0.95, 'Confidence must be at most 0.95'),
})

type FaceEnrollmentForm = z.infer<typeof faceEnrollmentFormSchema>

export default function FaceEnrollmentPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [captureMethod, setCaptureMethod] = useState<'upload' | 'camera'>('upload')
  const [capturedImage, setCapturedImage] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [enrollmentResult, setEnrollmentResult] = useState<{
    success: boolean
    confidence: number
    faceId?: string
    message?: string
  } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<FaceEnrollmentForm>({
    resolver: zodResolver(faceEnrollmentFormSchema),
    defaultValues: {
      confidence: 0.8,
    },
  })

  const selectedUser = watch('userId')
  const confidenceThreshold = watch('confidence')
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mock users for selection
  const users: User[] = [
    { id: '1', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' },
    { id: '2', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@example.com' },
    { id: '4', firstName: 'Emily', lastName: 'Wilson', email: 'emily.wilson@example.com' }
  ]

  const steps: FaceEnrollmentStep[] = [
    {
      id: 1,
      title: 'Select User',
      description: 'Choose the user to enroll face for',
      completed: currentStep > 1
    },
    {
      id: 2,
      title: 'Capture Face',
      description: 'Upload or capture face image',
      completed: currentStep > 2
    },
    {
      id: 3,
      title: 'Process & Enroll',
      description: 'Process image and enroll face',
      completed: currentStep > 3
    }
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setCapturedImage(imageData)
        setValue('imageData', imageData)
        trigger('imageData')
        setCurrentStep(3)
      }
      reader.readAsDataURL(file)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      toast.error('Failed to access camera')
    }
  }

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
        const imageData = canvas.toDataURL()
        setCapturedImage(imageData)
        setValue('imageData', imageData)
        trigger('imageData')
        setCurrentStep(3)
        
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }

  const processFaceEnrollment = handleSubmit(async (data: FaceEnrollmentForm) => {
    setIsProcessing(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Mock processing result
      const mockConfidence = Math.random() * 0.3 + 0.7 // 0.7 to 1.0
      const success = mockConfidence >= data.confidence
      
      setEnrollmentResult({
        success,
        confidence: mockConfidence,
        faceId: success ? `face_${Math.random().toString(36).substr(2, 9)}` : undefined,
        message: success 
          ? 'Face enrolled successfully!' 
          : 'Face quality too low. Please try with a better image.'
      })
      
      setCurrentStep(4)
      
      if (success) {
        toast.success('Face enrolled successfully!')
      } else {
        toast.error('Face enrollment failed')
      }
    } catch {
      toast.error('Failed to process face enrollment')
    } finally {
      setIsProcessing(false)
    }
  })

  const resetEnrollment = () => {
    setCurrentStep(1)
    setValue('userId', '')
    setValue('imageData', '')
    setValue('confidence', 0.8)
    setCapturedImage('')
    setEnrollmentResult(null)
    setShowPreview(false)
  }

  const getSelectedUserName = () => {
    const user = users.find(u => u.id === selectedUser)
    return user ? `${user.firstName} ${user.lastName}` : ''
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/face-recognition">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Face Recognition
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Face Enrollment</h1>
            <p className="text-muted-foreground">Enroll a new face for recognition</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : currentStep === step.id 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-gray-300 text-gray-400'
                }`}>
                  {step.completed ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                <div className={`ml-3 ${
                  step.completed ? 'text-green-600' : currentStep === step.id ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  <div className="font-medium">{step.title}</div>
                  <div className="text-sm text-gray-500">{step.description}</div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`mx-4 w-16 h-0.5 ${
                    step.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select User</CardTitle>
                <CardDescription>
                  Choose the user you want to enroll a face for
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="userSelect">User *</Label>
                  <Select 
                    value={selectedUser} 
                    onValueChange={(value) => {
                      setValue('userId', value);
                      trigger('userId');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.userId && (
                    <p className="text-sm text-red-600">{errors.userId.message}</p>
                  )}
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={() => setCurrentStep(2)} 
                    disabled={!selectedUser}
                    className="w-full"
                  >
                    Continue to Face Capture
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Capture Face</CardTitle>
                <CardDescription>
                  Choose how you want to capture the face image
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <Button
                    variant={captureMethod === 'upload' ? 'default' : 'outline'}
                    onClick={() => setCaptureMethod('upload')}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                  <Button
                    variant={captureMethod === 'camera' ? 'default' : 'outline'}
                    onClick={() => {
                      setCaptureMethod('camera')
                      startCamera()
                    }}
                    className="flex-1"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Use Camera
                  </Button>
                </div>

                {captureMethod === 'upload' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-4">
                        Upload a clear face image (JPG, PNG)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button onClick={() => fileInputRef.current?.click()}>
                        Choose File
                      </Button>
                    </div>
                  </div>
                )}

                {captureMethod === 'camera' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-64 bg-gray-100 rounded-lg object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" width="640" height="480" />
                    </div>
                    <Button onClick={captureImage} className="w-full">
                      <Camera className="mr-2 h-4 w-4" />
                      Capture Photo
                    </Button>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Back
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(3)} 
                    disabled={!capturedImage}
                  >
                    Continue to Processing
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Processing & Enrollment</CardTitle>
                <CardDescription>
                  Review and process the face image
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Selected User</h3>
                    <p className="text-gray-600">{getSelectedUserName()}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                    {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                </div>

                {showPreview && capturedImage && (
                  <div className="border rounded-lg p-4">
                    <Image
                      src={capturedImage}
                      alt="Captured face"
                      width={200}
                      height={200}
                      className="mx-auto rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="confidence">Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%</Label>
                  <Input
                    id="confidence"
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => {
                      setValue('confidence', parseFloat(e.target.value));
                      trigger('confidence');
                    }}
                    className="w-full"
                  />
                  {errors.confidence && (
                    <p className="text-sm text-red-600">{errors.confidence.message}</p>
                  )}
                  <p className="text-sm text-gray-600">
                    Minimum confidence level for face enrollment
                  </p>
                </div>

                {isProcessing && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Processing face image...</p>
                    </div>
                    <Progress value={75} className="w-full" />
                  </div>
                )}

                {!isProcessing && !enrollmentResult && (
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                      Back
                    </Button>
                    <Button onClick={processFaceEnrollment}>
                      Process & Enroll Face
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && enrollmentResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {enrollmentResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Enrollment Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className={enrollmentResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {enrollmentResult.message}
                  </AlertDescription>
                </Alert>

                {enrollmentResult.success && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600">Face ID</Label>
                        <p className="font-medium">{enrollmentResult.faceId}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Confidence</Label>
                        <Badge className={(enrollmentResult.confidence >= 0.9 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800")}>
                          {(enrollmentResult.confidence * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={resetEnrollment}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Enroll Another Face
                  </Button>
                  <Link href="/face-recognition">
                    <Button>
                      Back to Face Recognition
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Photo Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Clear Face</p>
                  <p className="text-sm text-muted-foreground">Face should be clearly visible</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Good Lighting</p>
                  <p className="text-sm text-muted-foreground">Even, natural lighting</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Front Facing</p>
                  <p className="text-sm text-muted-foreground">Face the camera directly</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Neutral Expression</p>
                  <p className="text-sm text-muted-foreground">No extreme expressions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Tips for Best Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm">Use a plain background</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm">Remove glasses if possible</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm">Keep hair away from face</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-sm">Maintain neutral expression</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
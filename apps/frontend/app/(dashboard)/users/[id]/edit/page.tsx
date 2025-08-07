"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building,
  CheckCircle,
  Key,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  User
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UsersService } from '@/services/api/users.service'
import { UpdateUserRequest } from '@/types'

const updateUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['USER', 'ADMIN', 'MODERATOR']),
  department: z.string().optional(),
  location: z.string().optional(),
  isActive: z.boolean()
})

type UpdateUserForm = z.infer<typeof updateUserSchema>

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: 'USER' | 'ADMIN' | 'MODERATOR'
  isActive: boolean
  createdAt: string
  lastLogin?: string
  department?: string
  location?: string
}

export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [showPasswordReset, setShowPasswordReset] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<UpdateUserForm>({
    resolver: zodResolver(updateUserSchema)
  })

  const isActive = watch('isActive')

  useEffect(() => {
    // Simulate API call to fetch user data
    const fetchUser = async () => {
      try {
        setLoading(true)

        // Mock API call
        await new Promise(resolve => setTimeout(resolve, 1000))

        const mockUser: UserProfile = {
          id: params.id as string,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          role: 'ADMIN',
          isActive: true,
          createdAt: '2024-01-15T10:30:00Z',
          lastLogin: '2024-02-15T09:30:00Z',
          department: 'IT Department',
          location: 'New York Office'
        }

        setUser(mockUser)

        // Populate form with user data
        reset({
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          email: mockUser.email,
          phone: mockUser.phone,
          role: mockUser.role,
          department: mockUser.department,
          location: mockUser.location,
          isActive: mockUser.isActive
        })

        setValue('role', mockUser.role)
        setValue('isActive', mockUser.isActive)

      } catch (err: any) {
        setError(err.message || 'Failed to fetch user data')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [params.id, reset, setValue])

  const onSubmit = async (data: UpdateUserRequest) => {
    setSaving(true)
    setError('')

    try {
      await UsersService.updateUser(params.id as string, data)

      toast.success('User updated successfully!')
      router.push('/users')
    } catch (err: any) {
      setError(err.message || 'Failed to update user')
      toast.error(err.message || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Password reset email sent successfully!')
      setShowPasswordReset(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send password reset email')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge className="bg-red-100 text-red-800">Admin</Badge>
      case 'MODERATOR':
        return <Badge className="bg-blue-100 text-blue-800">Moderator</Badge>
      case 'USER':
        return <Badge variant="secondary">User</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
        <p className="text-gray-600 mb-4">The user you're trying to edit doesn't exist.</p>
        <Link href="/users">
          <Button>Back to Users</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit User</h1>
            <p className="text-muted-foreground">Update user information and account settings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>
                Update the user's personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="firstName"
                          {...register('firstName')}
                          placeholder="Enter first name"
                          className="pl-10"
                        />
                      </div>
                      {errors.firstName && (
                        <p className="text-sm text-red-600">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="lastName"
                          {...register('lastName')}
                          placeholder="Enter last name"
                          className="pl-10"
                        />
                      </div>
                      {errors.lastName && (
                        <p className="text-sm text-red-600">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="user@example.com"
                        className="pl-10"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        id="phone"
                        {...register('phone')}
                        placeholder="+1 (555) 123-4567"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Role and Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Role & Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select onValueChange={(value) => setValue('role', value as any)} defaultValue={user.role}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USER">User</SelectItem>
                          <SelectItem value="MODERATOR">Moderator</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.role && (
                        <p className="text-sm text-red-600">{errors.role.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Account Status</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={isActive}
                          onCheckedChange={(checked) => setValue('isActive', checked)}
                        />
                        <Label htmlFor="isActive">
                          {isActive ? 'Active' : 'Inactive'}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="department"
                          {...register('department')}
                          placeholder="IT Department"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          id="location"
                          {...register('location')}
                          placeholder="New York Office"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                  <Link href="/users">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="/placeholder-user.jpg" alt={`${user.firstName} ${user.lastName}`} />
                  <AvatarFallback className="text-lg">
                    {user.firstName[0]}{user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{user.firstName} {user.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  {getRoleBadge(user.role)}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {user.isActive ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Joined:</span>
                  <span className="text-sm">{formatDate(user.createdAt)}</span>
                </div>
                {user.lastLogin && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Login:</span>
                    <span className="text-sm">{formatDate(user.lastLogin)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Password Reset */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Password Reset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Send a password reset email to the user. They will receive instructions to create a new password.
              </p>

              {showPasswordReset ? (
                <div className="space-y-3">
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Are you sure you want to send a password reset email to {user.email}?
                    </AlertDescription>
                  </Alert>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handlePasswordReset}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Send Reset Email
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowPasswordReset(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPasswordReset(true)}
                  className="w-full"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Send Password Reset
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/users/${user.id}`}>
                <Button variant="outline" className="w-full justify-start">
                  View User Profile
                </Button>
              </Link>
              <Link href="/face-recognition/enroll">
                <Button variant="outline" className="w-full justify-start">
                  Enroll Face for User
                </Button>
              </Link>
              <Link href="/users">
                <Button variant="outline" className="w-full justify-start">
                  View All Users
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Building, Loader2, Mail, MapPin, Phone, Save, Shield, User } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema } from '@/types/schemas'
import { Role } from '@/types/api'
import { UsersService } from '@/services/api/users.service'
import z from 'zod'
import { CreateUserRequest } from '@/types'

const extendedCreateUserSchema = createUserSchema.extend({
  location: z.string().optional(),
  sendWelcomeEmail: z.boolean().optional(),
  isActive: z.boolean()
})

type CreateUserForm = z.infer<typeof extendedCreateUserSchema>

export default function CreateUserPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateUserForm>({
    resolver: zodResolver(extendedCreateUserSchema),
    defaultValues: {
      isActive: true,
      sendWelcomeEmail: true,
      role: Role.USER
    }
  })

  const isActive = watch('isActive')
  const sendWelcomeEmail = watch('sendWelcomeEmail')

  const onSubmit = async (data: CreateUserForm) => {
    setLoading(true)
    setError('')

    try {      
      const response: CreateUserRequest = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: data.role,
        isActive: data.isActive,
      }

      const result = await UsersService.createUser(response)

      if (!result) {
        throw new Error('Failed to create user')
      }

      toast.success('User created successfully!')
      if (sendWelcomeEmail) {
        toast.success('Welcome email sent to user!')
      }
      
      router.push('/users')
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
      toast.error(err.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
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
            <h1 className="text-3xl font-bold">Create New User</h1>
            <p className="text-muted-foreground">Add a new user to the system</p>
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
                Enter the user's basic information and account details
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
                      <Select onValueChange={(value) => setValue('role', value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user role" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(Role).map((role) => (
                            <SelectItem key={role} value={role}>
                              {role.charAt(0) + role.slice(1).toLowerCase().replace('_', ' ')}
                            </SelectItem>
                          ))}
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

                {/* Email Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Email Settings</h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="sendWelcomeEmail"
                      checked={sendWelcomeEmail}
                      onCheckedChange={(checked) => setValue('sendWelcomeEmail', checked)}
                    />
                    <Label htmlFor="sendWelcomeEmail">
                      Send welcome email to user
                    </Label>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                  <Link href="/users">
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Role Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">User</h4>
                <p className="text-sm text-muted-foreground">Basic access to view profile and face recognition</p>
              </div>
              <div>
                <h4 className="font-medium">Moderator</h4>
                <p className="text-sm text-muted-foreground">Can manage users and view system analytics</p>
              </div>
              <div>
                <h4 className="font-medium">Admin</h4>
                <p className="text-sm text-muted-foreground">Full system access including user management and settings</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/face-recognition/enroll">
                <Button variant="outline" className="w-full justify-start">
                  Enroll Face After Creation
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
"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertTriangle, 
  Calendar, 
  Camera, 
  Clock, 
  Edit,
  Mail,
  MapPin,
  Phone,
  Settings,
  Shield,
  UserCheck
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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

interface FaceRecord {
  id: string
  faceId: string
  confidence: number
  status: 'active' | 'inactive'
  enrolledAt: string
  imageUrl: string
}

interface ActivityEvent {
  id: string
  type: 'login' | 'face_recognition' | 'profile_update' | 'password_change' | 'system_event'
  description: string
  timestamp: string
  location?: string
  confidence?: number
}

export default function UserProfilePage() {
  const params = useParams()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [faceRecords, setFaceRecords] = useState<FaceRecord[]>([])
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
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

      const mockFaceRecords: FaceRecord[] = [
        {
          id: '1',
          faceId: 'face_001',
          confidence: 0.95,
          status: 'active',
          enrolledAt: '2024-01-15T10:30:00Z',
          imageUrl: '/placeholder.svg?height=80&width=80'
        }
      ]

      const mockActivities: ActivityEvent[] = [
        {
          id: '1',
          type: 'login',
          description: 'User logged in',
          timestamp: '2024-02-15T09:30:00Z',
          location: 'Main Entrance'
        },
        {
          id: '2',
          type: 'face_recognition',
          description: 'Face recognized successfully',
          timestamp: '2024-02-15T09:15:00Z',
          location: 'Main Entrance',
          confidence: 0.94
        },
        {
          id: '3',
          type: 'profile_update',
          description: 'Profile information updated',
          timestamp: '2024-02-14T14:20:00Z'
        },
        {
          id: '4',
          type: 'password_change',
          description: 'Password changed successfully',
          timestamp: '2024-02-10T11:45:00Z'
        }
      ]

      setUser(mockUser)
      setFaceRecords(mockFaceRecords)
      setActivities(mockActivities)
      setLoading(false)
    }, 1000)
  }, [params.id])

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

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
    )
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <UserCheck className="h-4 w-4 text-green-600" />
      case 'face_recognition':
        return <Camera className="h-4 w-4 text-blue-600" />
      case 'profile_update':
        return <Edit className="h-4 w-4 text-purple-600" />
      case 'password_change':
        return <Shield className="h-4 w-4 text-orange-600" />
      case 'system_event':
        return <Settings className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
        <p className="text-gray-600 mb-4">The user you're looking for doesn't exist.</p>
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
        <div>
          <h1 className="text-3xl font-bold">User Profile</h1>
          <p className="text-muted-foreground">View and manage user information</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/users/${user.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          </Link>
          <Link href="/users">
            <Button variant="outline">Back to Users</Button>
          </Link>
        </div>
      </div>

      {/* User Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>
            Basic user details and account information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src="/placeholder-user.jpg" alt={`${user.firstName} ${user.lastName}`} />
              <AvatarFallback className="text-xl">
                {user.firstName[0]}{user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {user.firstName} {user.lastName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {getRoleBadge(user.role)}
                  {getStatusBadge(user.isActive)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.department && (
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-gray-500" />
                    <span>{user.department}</span>
                  </div>
                )}
                {user.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{user.location}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Joined: {formatDate(user.createdAt)}</span>
                </div>
                {user.lastLogin && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Last Login: {formatDate(user.lastLogin)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Face Records and Activity */}
      <Tabs defaultValue="face-records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="face-records">Face Records</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="face-records" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Face Records</CardTitle>
                  <CardDescription>
                    Registered face data for recognition
                  </CardDescription>
                </div>
                <Link href="/face-recognition/enroll">
                  <Button size="sm">
                    <Camera className="mr-2 h-4 w-4" />
                    Add Face Record
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {faceRecords.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {faceRecords.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Image
                          src={record.imageUrl || "/placeholder.svg"}
                          alt="Face record"
                          width={60}
                          height={60}
                          className="rounded-full border-2 border-gray-200"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">Face ID: {record.faceId}</h3>
                          <p className="text-sm text-muted-foreground">
                            Confidence: {(record.confidence * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {getStatusBadge(record.status === 'active')}
                        <div className="text-xs text-muted-foreground">
                          Enrolled: {formatDate(record.enrolledAt)}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          View Details
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Face Records</h3>
                  <p className="text-gray-600 mb-4">This user doesn't have any face records yet.</p>
                  <Link href="/face-recognition/enroll">
                    <Button>
                      <Camera className="mr-2 h-4 w-4" />
                      Enroll Face
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Recent user activities and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{formatDate(activity.timestamp)}</span>
                        {activity.location && (
                          <span>• {activity.location}</span>
                        )}
                        {activity.confidence && (
                          <span>• Confidence: {(activity.confidence * 100).toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
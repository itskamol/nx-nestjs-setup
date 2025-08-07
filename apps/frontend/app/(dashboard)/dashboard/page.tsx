"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Activity, 
  AlertCircle, 
  Camera, 
  Clock, 
  Eye,
  Plus,
  TrendingUp,
  UserCheck,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { LoadingCard, LoadingState } from '@/components/ui/loading-state'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalFaces: number
  activeFaces: number
  todayEvents: number
  systemHealth: 'healthy' | 'warning' | 'error'
}

interface RecentActivity {
  id: string
  type: 'user_login' | 'user_created' | 'face_enrolled' | 'face_recognized' | 'system_alert'
  description: string
  timestamp: string
  user?: string
  severity?: 'low' | 'medium' | 'high'
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalFaces: 0,
    activeFaces: 0,
    todayEvents: 0,
    systemHealth: 'healthy'
  })

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setStats({
        totalUsers: 156,
        activeUsers: 142,
        totalFaces: 89,
        activeFaces: 76,
        todayEvents: 23,
        systemHealth: 'healthy'
      })

      setRecentActivities([
        {
          id: '1',
          type: 'user_login',
          description: 'John Doe logged in',
          timestamp: '2024-02-15T09:30:00Z',
          user: 'John Doe'
        },
        {
          id: '2',
          type: 'face_recognized',
          description: 'Face recognized at Main Entrance',
          timestamp: '2024-02-15T09:15:00Z',
          user: 'Sarah Johnson'
        },
        {
          id: '3',
          type: 'user_created',
          description: 'New user account created',
          timestamp: '2024-02-15T08:45:00Z',
          user: 'Mike Davis'
        },
        {
          id: '4',
          type: 'face_enrolled',
          description: 'Face enrolled successfully',
          timestamp: '2024-02-15T08:30:00Z',
          user: 'Emily Wilson'
        },
        {
          id: '5',
          type: 'system_alert',
          description: 'System backup completed',
          timestamp: '2024-02-15T08:00:00Z',
          severity: 'low'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_login':
        return <UserCheck className="h-4 w-4 text-green-600" />
      case 'user_created':
        return <Users className="h-4 w-4 text-blue-600" />
      case 'face_enrolled':
        return <Camera className="h-4 w-4 text-purple-600" />
      case 'face_recognized':
        return <Activity className="h-4 w-4 text-orange-600" />
      case 'system_alert':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingState state="loading" loadingText="Loading dashboard..." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <LoadingCard key={i} loading={true} lines={2} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">Welcome to Staff Management System</h1>
            <p className="text-blue-100 text-sm lg:text-base">
              Monitor your staff, manage face recognition, and track system activity
            </p>
          </div>
          <Avatar className="h-12 w-12 lg:h-16 lg:w-16 border-2 border-white">
            <AvatarImage src="/placeholder-user.jpg" alt="User" />
            <AvatarFallback className="text-lg lg:text-xl">JD</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Face Records</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFaces}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeFaces} active faces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayEvents}</div>
            <p className="text-xs text-muted-foreground">
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {getHealthBadge(stats.systemHealth)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks you can perform quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Link href="/users/create">
              <Button variant="outline" className="w-full h-16 lg:h-20 flex-col text-xs lg:text-sm">
                <Plus className="h-4 w-4 lg:h-6 lg:w-6 mb-1 lg:mb-2" />
                Add User
              </Button>
            </Link>
            <Link href="/face-recognition/enroll">
              <Button variant="outline" className="w-full h-16 lg:h-20 flex-col text-xs lg:text-sm">
                <Camera className="h-4 w-4 lg:h-6 lg:w-6 mb-1 lg:mb-2" />
                Enroll Face
              </Button>
            </Link>
            <Link href="/users">
              <Button variant="outline" className="w-full h-16 lg:h-20 flex-col text-xs lg:text-sm">
                <Users className="h-4 w-4 lg:h-6 lg:w-6 mb-1 lg:mb-2" />
                View Users
              </Button>
            </Link>
            <Link href="/face-recognition/events">
              <Button variant="outline" className="w-full h-16 lg:h-20 flex-col text-xs lg:text-sm">
                <Activity className="h-4 w-4 lg:h-6 lg:w-6 mb-1 lg:mb-2" />
                View Events
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest system activities and events
              </CardDescription>
            </div>
            <Link href="/face-recognition/events">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 lg:space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 lg:gap-4 p-3 lg:p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm lg:text-base truncate">{activity.description}</p>
                  {activity.user && (
                    <p className="text-xs lg:text-sm text-muted-foreground">User: {activity.user}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
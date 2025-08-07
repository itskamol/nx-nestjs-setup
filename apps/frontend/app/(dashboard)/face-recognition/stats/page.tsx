"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Activity, 
  AlertTriangle, 
  ArrowLeft, 
  BarChart3, 
  Camera,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Target,
  TrendingUp,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Line, 
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

interface RecognitionStats {
  totalRecognitions: number
  successfulRecognitions: number
  failedRecognitions: number
  unknownFaces: number
  averageConfidence: number
  successRate: number
}

interface TimeSeriesData {
  date: string
  recognitions: number
  successful: number
  failed: number
  confidence: number
}

interface LocationData {
  location: string
  recognitions: number
  successRate: number
}

interface UserPerformance {
  userId: string
  userName: string
  recognitions: number
  averageConfidence: number
  lastSeen: string
}

interface SystemHealth {
  uptime: number
  responseTime: number
  errorRate: number
  activeCameras: number
  totalCameras: number
}

export default function FaceStatisticsPage() {
  const [stats, setStats] = useState<RecognitionStats>({
    totalRecognitions: 0,
    successfulRecognitions: 0,
    failedRecognitions: 0,
    unknownFaces: 0,
    averageConfidence: 0,
    successRate: 0
  })
  
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [locationData, setLocationData] = useState<LocationData[]>([])
  const [userPerformance, setUserPerformance] = useState<UserPerformance[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    uptime: 0,
    responseTime: 0,
    errorRate: 0,
    activeCameras: 0,
    totalCameras: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Mock stats
      const mockStats: RecognitionStats = {
        totalRecognitions: 15420,
        successfulRecognitions: 13892,
        failedRecognitions: 1528,
        unknownFaces: 892,
        averageConfidence: 0.91,
        successRate: 90.1
      }

      // Mock time series data
      const mockTimeSeries: TimeSeriesData[] = []
      const now = new Date()
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        mockTimeSeries.push({
          date: date.toISOString().split('T')[0],
          recognitions: Math.floor(Math.random() * 500) + 300,
          successful: Math.floor(Math.random() * 450) + 250,
          failed: Math.floor(Math.random() * 50) + 20,
          confidence: Math.random() * 0.1 + 0.85
        })
      }

      // Mock location data
      const mockLocationData: LocationData[] = [
        { location: 'Main Entrance', recognitions: 5200, successRate: 94.2 },
        { location: 'Office Floor 1', recognitions: 3800, successRate: 89.1 },
        { location: 'Office Floor 2', recognitions: 3200, successRate: 87.5 },
        { location: 'Parking Area', recognitions: 2100, successRate: 78.3 },
        { location: 'Cafeteria', recognitions: 1120, successRate: 92.8 }
      ]

      // Mock user performance
      const mockUserPerformance: UserPerformance[] = [
        { userId: '1', userName: 'John Doe', recognitions: 420, averageConfidence: 0.95, lastSeen: '2024-02-15T09:30:00Z' },
        { userId: '2', userName: 'Sarah Johnson', recognitions: 380, averageConfidence: 0.93, lastSeen: '2024-02-15T08:45:00Z' },
        { userId: '4', userName: 'Emily Wilson', recognitions: 290, averageConfidence: 0.91, lastSeen: '2024-02-14T16:20:00Z' },
        { userId: '5', userName: 'David Brown', recognitions: 265, averageConfidence: 0.89, lastSeen: '2024-02-14T11:10:00Z' }
      ]

      // Mock system health
      const mockSystemHealth: SystemHealth = {
        uptime: 99.8,
        responseTime: 120,
        errorRate: 0.2,
        activeCameras: 8,
        totalCameras: 10
      }

      setStats(mockStats)
      setTimeSeriesData(mockTimeSeries)
      setLocationData(mockLocationData)
      setUserPerformance(mockUserPerformance)
      setSystemHealth(mockSystemHealth)
      setLoading(false)
    }, 1500)
  }, [timeRange])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.8) return 'text-yellow-600'
    return 'text-red-600'
  }

  const pieChartData = [
    { name: 'Successful', value: stats.successfulRecognitions, color: '#10b981' },
    { name: 'Failed', value: stats.failedRecognitions, color: '#ef4444' },
    { name: 'Unknown', value: stats.unknownFaces, color: '#f59e0b' }
  ]

  const locationPerformanceData = locationData.map(location => ({
    location: location.location,
    recognitions: location.recognitions,
    successRate: location.successRate
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
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
            <h1 className="text-3xl font-bold">Face Recognition Statistics</h1>
            <p className="text-muted-foreground">Detailed analytics and performance metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recognitions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecognitions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +2.3% improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.averageConfidence * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              High accuracy rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.uptime}%</div>
            <p className="text-xs text-muted-foreground">
              Excellent reliability
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="users">User Performance</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Series Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Recognition Trends</CardTitle>
                <CardDescription>
                  Daily recognition activity over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="recognitions" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Total Recognitions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Success Rate Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Recognition Distribution</CardTitle>
                <CardDescription>
                  Breakdown of recognition results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent || 0 * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Location Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Location Performance</CardTitle>
              <CardDescription>
                Recognition success rates by camera location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={locationPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="successRate" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Success Rate Trend</CardTitle>
                <CardDescription>
                  Daily success rate over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Confidence"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Failed Recognitions</CardTitle>
                <CardDescription>
                  Daily failure count analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="failed" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Performance</CardTitle>
              <CardDescription>
                Top users by recognition activity and accuracy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userPerformance.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{user.userName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Last seen: {formatLastSeen(user.lastSeen)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Recognitions</p>
                          <p className="font-medium">{user.recognitions}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Confidence</p>
                          <p className={`font-medium ${getConfidenceColor(user.averageConfidence)}`}>
                            {(user.averageConfidence * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth.uptime}%</div>
                <p className="text-xs text-muted-foreground">
                  Last 30 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth.responseTime}ms</div>
                <p className="text-xs text-muted-foreground">
                  Average response
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth.errorRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Low error rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Cameras</CardTitle>
                <Camera className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemHealth.activeCameras}/{systemHealth.totalCameras}</div>
                <p className="text-xs text-muted-foreground">
                  {systemHealth.totalCameras - systemHealth.activeCameras} offline
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
              <CardDescription>
                Key performance indicators over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="confidence" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="System Confidence"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
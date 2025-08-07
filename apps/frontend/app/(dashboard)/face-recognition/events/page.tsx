"use client"

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useFaceRecognitionWebSocket } from '@/hooks/use-websocket'
import { FaceRecognitionService } from '@/services/api/faceRecognition.service'
import { useApi } from '@/hooks/useApi'

interface RecognitionEvent {
  id: string
  faceId: string
  userId?: string
  userName: string
  confidence: number
  timestamp: string
  eventType: 'RECOGNIZED' | 'DETECTED' | 'UNKNOWN' | 'FAILED'
  cameraLocation: string
  imageUrl?: string
  riskLevel: 'low' | 'medium' | 'high'
}

interface LiveStats {
  totalEvents: number
  recognizedEvents: number
  unknownEvents: number
  failedEvents: number
  averageConfidence: number
  activeCameras: number
}

export default function FaceRecognitionEventsPage() {
  const [filteredEvents, setFilteredEvents] = useState<RecognitionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [selectedEvent, setSelectedEvent] = useState<RecognitionEvent | null>(null)
  const [useRealApi, setUseRealApi] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  const eventEndRef = useRef<HTMLDivElement>(null)

  // API and WebSocket connections
  const { loading: eventsLoading } = useApi()
  const { loading: statsLoading } = useApi()
  const {
    events: wsEvents,
    stats: wsStats,
    connectionState,
    connect,
    disconnect
  } = useFaceRecognitionWebSocket()

  // API data
  const [apiEvents, setApiEvents] = useState<RecognitionEvent[]>([])
  const [apiStats, setApiStats] = useState<LiveStats>({
    totalEvents: 0,
    recognizedEvents: 0,
    unknownEvents: 0,
    failedEvents: 0,
    averageConfidence: 0,
    activeCameras: 0
  })

  // Determine which data source to use
  const events = useRealApi ? apiEvents : wsEvents
  const liveStats = useRealApi ? apiStats : {
    ...wsStats,
    activeCameras: 6 // Mock active cameras
  }

  // API data fetching
  const loadApiData = async () => {
    try {
      setApiError(null)
      setLoading(true)

      // Fetch events from API using service
      const eventsData = await FaceRecognitionService.getEventsWithFilters({
        eventType: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
        cameraLocation: locationFilter !== 'all' ? locationFilter : undefined,
        riskLevel: riskFilter !== 'all' ? riskFilter : undefined,
        search: searchTerm || undefined
      })

      // Fetch stats from API using service
      const statsData = await FaceRecognitionService.getStats()

      // Transform API data to match our interface
      const transformedEvents = eventsData.map((event: any) => ({
        id: event.id,
        faceId: event.faceId,
        userId: event.userId,
        userName: event.userName || 'Unknown Person',
        confidence: event.confidence || 0,
        timestamp: event.timestamp,
        eventType: event.eventType || 'UNKNOWN',
        cameraLocation: event.cameraLocation || 'Unknown Location',
        imageUrl: event.imageUrl,
        riskLevel: event.riskLevel || 'medium'
      }))

      const transformedStats = {
        totalEvents: statsData.totalEvents || 0,
        recognizedEvents: statsData.eventsByType?.RECOGNIZED || 0,
        unknownEvents: statsData.eventsByType?.UNKNOWN || 0,
        failedEvents: (statsData.eventsByType?.DELETED || 0) + (statsData.eventsByType?.FAILED || 0),
        averageConfidence: statsData.recognitionAccuracy || 0,
        activeCameras: statsData.topLocations?.length || 0
      }

      setApiEvents(transformedEvents)
      setApiStats(transformedStats)
      setApiError(null)

    } catch (error) {
      console.error('Error fetching API data:', error)
      let errorMessage = 'Failed to fetch data'

      if (error instanceof Error) {
        if (error.message.includes('Network Error')) {
          errorMessage = 'Network error. Please check your connection.'
        } else if (error.message.includes('401')) {
          errorMessage = 'Authentication failed. Please log in again.'
        } else if (error.message.includes('403')) {
          errorMessage = 'Access denied. You do not have permission.'
        } else if (error.message.includes('404')) {
          errorMessage = 'API endpoint not found.'
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.'
        } else {
          errorMessage = error.message
        }
      }

      setApiError(errorMessage)

      // Set empty data on error
      setApiEvents([])
      setApiStats({
        totalEvents: 0,
        recognizedEvents: 0,
        unknownEvents: 0,
        failedEvents: 0,
        averageConfidence: 0,
        activeCameras: 0
      })

    } finally {
      setLoading(false)
    }
  }

  // const calculateStats = (events: RecognitionEvent[]) => {
  //   const totalEvents = events.length
  //   const recognizedEvents = events.filter(e => e.eventType === 'RECOGNIZED').length
  //   const unknownEvents = events.filter(e => e.eventType === 'UNKNOWN').length
  //   const failedEvents = events.filter(e => e.eventType === 'FAILED').length
  //   const averageConfidence = events.reduce((sum, e) => sum + e.confidence, 0) / totalEvents
  //   const activeCameras = new Set(events.map(e => e.cameraLocation)).size

  //   return {
  //     totalEvents,
  //     recognizedEvents,
  //     unknownEvents,
  //     failedEvents,
  //     averageConfidence: isNaN(averageConfidence) ? 0 : averageConfidence,
  //     activeCameras
  //   }
  // }

  useEffect(() => {
    // Load API data on component mount or when filters change
    if (useRealApi) {
      loadApiData()
    } else {
      setLoading(false)
    }
  }, [useRealApi, eventTypeFilter, locationFilter, riskFilter, searchTerm])

  useEffect(() => {
    // Update filtered events when events change
    // When using API, events are already filtered on the server side
    let filtered = events

    // Only apply client-side filtering for WebSocket mode
    if (!useRealApi) {
      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(event =>
          event.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.cameraLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.faceId.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // Apply event type filter
      if (eventTypeFilter !== 'all') {
        filtered = filtered.filter(event => event.eventType === eventTypeFilter)
      }

      // Apply location filter
      if (locationFilter !== 'all') {
        filtered = filtered.filter(event => event.cameraLocation === locationFilter)
      }

      // Apply risk filter
      if (riskFilter !== 'all') {
        filtered = filtered.filter(event => event.riskLevel === riskFilter)
      }
    }

    setFilteredEvents(filtered)

    // Auto-scroll to bottom for new events
    if (eventEndRef.current && filtered.length > 0) {
      setTimeout(() => {
        eventEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [events, useRealApi])

  // Toggle between API and WebSocket
  const toggleDataSource = () => {
    if (useRealApi) {
      // Switch to WebSocket
      disconnect()
    } else {
      // Switch to API
      connect()
      loadApiData()
    }
    setUseRealApi(!useRealApi)
  }

  // Refresh API data
  const refreshApiData = () => {
    if (useRealApi) {
      loadApiData()
    }
  }

  // Retry API data fetch
  const retryApiData = () => {
    setApiError(null)
    loadApiData()
  }

  const getConnectionStatus = () => {
    if (useRealApi) {
      if (apiError) return 'API Error'
      if (eventsLoading || statsLoading) return 'Loading...'
      return 'API Connected'
    }

    switch (connectionState) {
      case 'connected':
        return 'WebSocket Connected'
      case 'connecting':
        return 'Connecting...'
      case 'reconnecting':
        return 'Reconnecting...'
      case 'disconnected':
        return 'WebSocket Disconnected'
      default:
        return 'Unknown Status'
    }
  }

  const getConnectionIcon = () => {
    if (useRealApi) {
      if (apiError) return <WifiOff className="h-4 w-4 text-red-600" />
      if (eventsLoading || statsLoading) return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
      return <Wifi className="h-4 w-4 text-green-600" />
    }

    switch (connectionState) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />
      case 'connecting':
      case 'reconnecting':
        return <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-600" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventBadge = (eventType: string) => {
    switch (eventType) {
      case 'RECOGNIZED':
        return <Badge className="bg-green-100 text-green-800">Recognized</Badge>
      case 'DETECTED':
        return <Badge className="bg-blue-100 text-blue-800">Detected</Badge>
      case 'UNKNOWN':
        return <Badge className="bg-yellow-100 text-yellow-800">Unknown</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge variant="outline">{eventType}</Badge>
    }
  }

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Risk</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>
      default:
        return <Badge variant="outline">{riskLevel}</Badge>
    }
  }

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'RECOGNIZED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'DETECTED':
        return <Camera className="h-4 w-4 text-blue-600" />
      case 'UNKNOWN':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const isRecent = (timestamp: string) => {
    const eventTime = new Date(timestamp).getTime()
    const now = Date.now()
    return now - eventTime < 60000 // Less than 1 minute
  }

  const toggleLiveUpdates = () => {
    if (useRealApi) {
      // Refresh API data
      refreshApiData()
    }
  }

  const exportEvents = () => {
    // Simulate export functionality
    const csvContent = [
      ['Timestamp', 'User Name', 'Event Type', 'Camera Location', 'Confidence', 'Risk Level'],
      ...filteredEvents.map(event => [
        formatDate(event.timestamp),
        event.userName,
        event.eventType,
        event.cameraLocation,
        `${(event.confidence * 100).toFixed(1)}%`,
        event.riskLevel
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `face-recognition-events-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const uniqueLocations = Array.from(new Set(events.map(e => e.cameraLocation)))

  if (loading || eventsLoading || statsLoading) {
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
      {/* Connection Status Alert */}
      <Alert className={useRealApi ? (apiError ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50") : connectionState === 'connected' ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
        <div className="flex items-center gap-2">
          {getConnectionIcon()}
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{getConnectionStatus()}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleDataSource}
                  className="text-xs"
                >
                  Switch to {useRealApi ? 'WebSocket' : 'API'}
                </Button>
                {useRealApi && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleLiveUpdates}
                      className="text-xs"
                    >
                      Refresh Data
                    </Button>
                    {apiError && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={retryApiData}
                        className="text-xs"
                      >
                        Retry
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            {apiError && (
              <div className="mt-2 text-sm text-red-600">
                Error: {apiError}
              </div>
            )}
          </AlertDescription>
        </div>
      </Alert>

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
            <h1 className="text-3xl font-bold">Recognition Events</h1>
            <p className="text-muted-foreground">Real-time face recognition activity monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportEvents}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveStats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {useRealApi && !apiError && <span className="text-green-600">● Live</span>}
              {useRealApi && apiError && <span className="text-red-600">● Error</span>}
              {!useRealApi && connectionState === 'connected' && <span className="text-green-600">● Live</span>}
              {!useRealApi && <span className="text-gray-600">● WebSocket</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recognized</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveStats.recognizedEvents}</div>
            <p className="text-xs text-muted-foreground">
              {liveStats.totalEvents > 0 ? ((liveStats.recognizedEvents / liveStats.totalEvents) * 100).toFixed(1) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unknown</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveStats.unknownEvents}</div>
            <p className="text-xs text-muted-foreground">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cameras</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveStats.activeCameras}</div>
            <p className="text-xs text-muted-foreground">
              Monitoring locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="RECOGNIZED">Recognized</SelectItem>
                <SelectItem value="DETECTED">Detected</SelectItem>
                <SelectItem value="UNKNOWN">Unknown</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map(location => (
                  <SelectItem key={location} value={location}>{location}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>
            Showing {filteredEvents.length} events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${isRecent(event.timestamp) ? 'border-l-4 border-l-blue-500' : ''
                    }`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex-shrink-0">
                    {getEventIcon(event.eventType)}
                  </div>

                  <div className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={event.imageUrl} alt={event.userName} />
                      <AvatarFallback>
                        {event.userName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{event.userName}</h3>
                      {getEventBadge(event.eventType)}
                      {getRiskBadge(event.riskLevel)}
                      {isRecent(event.timestamp) && (
                        <Badge className="bg-blue-100 text-blue-800">Live</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.cameraLocation}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(event.timestamp)}
                      </div>
                      <div>
                        Confidence: {(event.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Events Found</h3>
                <p className="text-gray-600">Try adjusting your filters or check back later.</p>
              </div>
            )}
            <div ref={eventEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Event Details</CardTitle>
                <Button variant="ghost" onClick={() => setSelectedEvent(null)}>
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedEvent.imageUrl} alt={selectedEvent.userName} />
                  <AvatarFallback className="text-lg">
                    {selectedEvent.userName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">{selectedEvent.userName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getEventBadge(selectedEvent.eventType)}
                    {getRiskBadge(selectedEvent.riskLevel)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Event ID</Label>
                  <p className="font-medium">{selectedEvent.id}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Face ID</Label>
                  <p className="font-medium">{selectedEvent.faceId}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Camera Location</Label>
                  <p className="font-medium">{selectedEvent.cameraLocation}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Confidence</Label>
                  <p className="font-medium">{(selectedEvent.confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Timestamp</Label>
                  <p className="font-medium">{formatDate(selectedEvent.timestamp)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Risk Level</Label>
                  <p className="font-medium">{selectedEvent.riskLevel}</p>
                </div>
              </div>

              {selectedEvent.imageUrl && (
                <div>
                  <Label className="text-sm text-gray-600">Captured Image</Label>
                  <div className="mt-2">
                    <Image
                      src={selectedEvent.imageUrl}
                      alt="Event image"
                      width={200}
                      height={200}
                      className="rounded-lg border"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
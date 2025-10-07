'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Heart, 
  Users, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Activity
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

interface BarangayAnalytics {
  overview: {
    totalResidents: number
    totalSchedules: number
    totalClaims: number
    upcomingSchedules: number
    claimRate: number
    averageAttendance: number
  }
  scheduleStats: Array<{
    status: string
    count: number
    percentage: number
  }>
  recentSchedules: Array<{
    id: string
    title: string
    date: string
    status: string
    claims: number
    maxRecipients: number | null
  }>
  topResidents: Array<{
    id: string
    name: string
    claims: number
    lastClaim: string
  }>
  monthlyTrends: Array<{
    month: string
    schedules: number
    claims: number
    attendance: number
  }>
  performanceMetrics: {
    scheduleCompletion: number
    residentEngagement: number
    claimEfficiency: number
  }
  unclaimedResidents: Array<{
    id: string
    name: string
    email: string
    phone: string
    lastClaim: string | null
    totalClaims: number
    registrationDate: string
  }>
}

export default function BarangayAnalytics() {
  const [analytics, setAnalytics] = useState<BarangayAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      console.log('Fetching barangay analytics...')
      const response = await fetch('/api/barangay/analytics')
      console.log('Analytics response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Analytics data received:', data)
        setAnalytics(data)
      } else {
        const errorData = await response.json()
        console.error('Analytics API error:', errorData)
        console.error('Response status:', response.status)
        console.error('Response headers:', response.headers)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics || !analytics.overview) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">Analytics data is not available yet.</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Debug info: {analytics ? 'Analytics object exists but missing overview' : 'No analytics object'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Barangay Analytics</h2>
        <p className="text-gray-600">Insights into your barangay's performance</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Residents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalResidents}</div>
            <p className="text-xs text-muted-foreground">
              Registered residents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalSchedules}</div>
            <p className="text-xs text-muted-foreground">
              Total programs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claims</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalClaims}</div>
            <p className="text-xs text-muted-foreground">
              Donations received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.upcomingSchedules}</div>
            <p className="text-xs text-muted-foreground">
              Future programs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claim Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.claimRate}%</div>
            <p className="text-xs text-muted-foreground">
              Success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.averageAttendance}%</div>
            <p className="text-xs text-muted-foreground">
              Average attendance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activity Trends</CardTitle>
            <CardDescription>
              Schedules and claims over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="schedules" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Schedules"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="claims" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Claims"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#ffc658" 
                    strokeWidth={2}
                    name="Attendance %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Schedule Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of schedule statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.scheduleStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analytics.scheduleStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Completion</CardTitle>
            <CardDescription>
              How well you complete scheduled programs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-sm font-bold">{analytics.performanceMetrics.scheduleCompletion}%</span>
              </div>
              <Progress value={analytics.performanceMetrics.scheduleCompletion} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resident Engagement</CardTitle>
            <CardDescription>
              How actively residents participate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Engagement Rate</span>
                <span className="text-sm font-bold">{analytics.performanceMetrics.residentEngagement}%</span>
              </div>
              <Progress value={analytics.performanceMetrics.residentEngagement} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Claim Efficiency</CardTitle>
            <CardDescription>
              How efficiently claims are processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Efficiency Rate</span>
                <span className="text-sm font-bold">{analytics.performanceMetrics.claimEfficiency}%</span>
              </div>
              <Progress value={analytics.performanceMetrics.claimEfficiency} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Schedule Status Distribution</CardTitle>
            <CardDescription>
              Breakdown of schedule statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.scheduleStats.map((status) => (
                <div key={status.status} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">{status.status.toLowerCase()}</span>
                    <span className="text-sm text-gray-500">{status.count} ({status.percentage}%)</span>
                  </div>
                  <Progress value={status.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Active Residents</CardTitle>
            <CardDescription>
              Residents with most claims
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topResidents.map((resident, index) => (
                <div key={resident.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-pink-600">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium">{resident.name}</div>
                      <div className="text-sm text-gray-500">Last claim: {new Date(resident.lastClaim).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{resident.claims}</div>
                    <div className="text-xs text-gray-500">claims</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Schedules */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Schedules</CardTitle>
          <CardDescription>
            Latest program schedules and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentSchedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-pink-500" />
                  </div>
                  <div>
                    <div className="font-medium">{schedule.title}</div>
                    <div className="text-sm text-gray-500">{new Date(schedule.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="font-bold">{schedule.claims}</div>
                    <div className="text-xs text-gray-500">claims</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold">
                      {schedule.maxRecipients ? `${schedule.claims}/${schedule.maxRecipients}` : '∞'}
                    </div>
                    <div className="text-xs text-gray-500">capacity</div>
                  </div>
                  <Badge variant={schedule.status === 'SCHEDULED' ? 'default' : 'secondary'}>
                    {schedule.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Unclaimed Residents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <span>Unclaimed Residents</span>
          </CardTitle>
          <CardDescription>
            Residents who haven't claimed any donations yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.unclaimedResidents.length > 0 ? (
              analytics.unclaimedResidents.map((resident) => (
                <div key={resident.id} className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 border-orange-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <div className="font-medium">{resident.name}</div>
                      <div className="text-sm text-gray-500">{resident.email}</div>
                      <div className="text-xs text-gray-400">
                        Registered: {new Date(resident.registrationDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="font-bold text-orange-600">{resident.totalClaims}</div>
                      <div className="text-xs text-gray-500">total claims</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-orange-600">
                        {resident.lastClaim ? new Date(resident.lastClaim).toLocaleDateString() : 'Never'}
                      </div>
                      <div className="text-xs text-gray-500">last claim</div>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Unclaimed
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">All Residents Active</h3>
                <p className="text-gray-600">All residents in your barangay have claimed donations.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

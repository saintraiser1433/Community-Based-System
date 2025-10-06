'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  Calendar, 
  Heart, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Package
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

interface AnalyticsData {
  overview: {
    totalUsers: number
    activeUsers: number
    totalBarangays: number
    totalSchedules: number
    totalClaims: number
    pendingRegistrations: number
  }
  userGrowth: Array<{
    month: string
    users: number
    claims: number
  }>
  barangayStats: Array<{
    name: string
    residents: number
    schedules: number
    claims: number
    claimRate: number
  }>
  topPerformingBarangays: Array<{
    name: string
    performance: number
    totalClaims: number
  }>
  scheduleDistribution: Array<{
    status: string
    count: number
    percentage: number
  }>
  monthlyTrends: Array<{
    month: string
    schedules: number
    claims: number
    residents: number
  }>
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      console.log('🔍 Fetching analytics...')
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`)
      console.log('📊 Analytics response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📈 Analytics data received:', data)
        setAnalytics(data)
      } else {
        console.error('❌ Analytics API error:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('❌ Error details:', errorText)
      }
    } catch (error) {
      console.error('❌ Error fetching analytics:', error)
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

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">Analytics data is not available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Analytics</h2>
          <p className="text-gray-600">Comprehensive insights into system performance</p>
        </div>
        <div className="flex space-x-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm ${
                timeRange === range
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Barangays</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalBarangays}</div>
            <p className="text-xs text-muted-foreground">
              Active locations
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.pendingRegistrations}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Claim Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.overview.totalSchedules > 0 
                ? Math.round((analytics.overview.totalClaims / analytics.overview.totalSchedules) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth Over Time</CardTitle>
            <CardDescription>
              New user registrations and growth trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stackId="1" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    name="New Users"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="claims" 
                    stackId="2" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    name="Claims"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Barangay Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Barangay Performance</CardTitle>
            <CardDescription>
              Claim rates by barangay
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.barangayStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="claimRate" fill="#8884d8" name="Claim Rate %" />
                  <Bar dataKey="claims" fill="#82ca9d" name="Total Claims" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Distribution Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Status Distribution</CardTitle>
          <CardDescription>
            Breakdown of all schedules by status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={analytics.scheduleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.scheduleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Activity Trends</CardTitle>
          <CardDescription>
            Schedules, claims, and residents over time
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
                  dataKey="residents" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  name="Residents"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Barangay Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Barangay Statistics</CardTitle>
          <CardDescription>
            Detailed breakdown by barangay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Barangay</th>
                  <th className="text-left py-3 px-4">Residents</th>
                  <th className="text-left py-3 px-4">Schedules</th>
                  <th className="text-left py-3 px-4">Claims</th>
                  <th className="text-left py-3 px-4">Claim Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.barangayStats.map((barangay) => (
                  <tr key={barangay.name} className="border-b">
                    <td className="py-3 px-4 font-medium">{barangay.name}</td>
                    <td className="py-3 px-4">{barangay.residents}</td>
                    <td className="py-3 px-4">{barangay.schedules}</td>
                    <td className="py-3 px-4">{barangay.claims}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-pink-500 h-2 rounded-full" 
                            style={{ width: `${barangay.claimRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{barangay.claimRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

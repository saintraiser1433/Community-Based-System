'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Home, 
  Users, 
  BarChart3, 
  FileText, 
  Shield,
  Calendar,
  Package,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Download,
  FileDown,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Database,
  Smartphone
} from 'lucide-react'
import Image from 'next/image'
import { ReportGenerator } from '@/lib/reports'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import UserManagement from '@/components/admin/UserManagement'
import BarangayManagement from '@/components/admin/BarangayManagement'
import PendingRegistrations from '@/components/admin/PendingRegistrations'
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard'
import BackupManagement from '@/components/admin/BackupManagement'
import SMSSettings from '@/components/admin/SMSSettings'

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBarangays: 0,
    totalSchedules: 0,
    totalClaims: 0,
    activeUsers: 0,
    upcomingSchedules: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [barangayStats, setBarangayStats] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  
  // Report filter state
  const [showReportFilters, setShowReportFilters] = useState(false)
  const [reportType, setReportType] = useState<'donation' | 'analytics' | null>(null)
  const [reportFormat, setReportFormat] = useState<'pdf' | 'excel' | null>(null)
  const [reportFilters, setReportFilters] = useState({
    barangayId: 'all',
    startDate: '',
    endDate: ''
  })
  const [allBarangays, setAllBarangays] = useState<any[]>([])
  
  // User management state
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'RESIDENT',
    barangayId: ''
  })
  
  // Barangay management state
  const [barangays, setBarangays] = useState([])
  const [barangaysLoading, setBarangaysLoading] = useState(false)
  const [showCreateBarangay, setShowCreateBarangay] = useState(false)
  const [showEditBarangay, setShowEditBarangay] = useState(false)
  const [selectedBarangay, setSelectedBarangay] = useState(null)
  const [barangayForm, setBarangayForm] = useState({
    name: '',
    code: '',
    description: '',
    managerId: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData()
      fetchBarangays()
    }
  }, [session])

  const fetchBarangays = async () => {
    try {
      console.log('Fetching barangays for report filters...')
      const response = await fetch('/api/admin/barangays')
      if (response.ok) {
        const data = await response.json()
        console.log('Barangays fetched:', data.length, data)
        setAllBarangays(data || [])
      } else {
        const errorData = await response.json()
        console.error('Error fetching barangays:', errorData)
      }
    } catch (error) {
      console.error('Error fetching barangays:', error)
    }
  }

  const fetchDashboardData = async () => {
    try {
      // Fetch overall stats
      const statsResponse = await fetch('/api/admin/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      // Fetch recent activity
      const activityResponse = await fetch('/api/admin/activity')
      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setRecentActivity(activityData)
      }

      // Fetch barangay stats
      const barangayResponse = await fetch('/api/admin/barangay-stats')
      if (barangayResponse.ok) {
        const barangayData = await barangayResponse.json()
        setBarangayStats(barangayData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const openReportFilters = (type: 'donation' | 'analytics', format: 'pdf' | 'excel') => {
    setReportType(type)
    setReportFormat(format)
    setShowReportFilters(true)
  }

  const generateDonationReport = async (format: 'pdf' | 'excel', filters?: typeof reportFilters) => {
    setIsGeneratingReport(true)
    try {
      console.log('🔄 Generating donation report...')
      
      // Build query parameters
      const params = new URLSearchParams()
      if (filters) {
        if (filters.barangayId && filters.barangayId !== 'all') {
          params.append('barangayId', filters.barangayId)
        }
        if (filters.startDate) {
          params.append('startDate', filters.startDate)
        }
        if (filters.endDate) {
          params.append('endDate', filters.endDate)
        }
      }
      
      const response = await fetch(`/api/admin/reports/donations?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API Error:', errorData)
        alert(`Failed to generate report: ${errorData.error || 'Unknown error'}`)
        return
      }
      
      const data = await response.json()
      console.log('✅ Report data received:', data)
      
      const barangayName = filters?.barangayId && filters.barangayId !== 'all' 
        ? allBarangays.find(b => b.id === filters.barangayId)?.name || ''
        : 'All'
      const dateRange = filters?.startDate && filters?.endDate 
        ? `${filters.startDate}_to_${filters.endDate}`
        : 'all-time'
      const filename = `donation-report-${barangayName.replace(/\s+/g, '-')}-${dateRange}`
      
      if (format === 'pdf') {
        ReportGenerator.downloadPDF(data, filename)
      } else {
        ReportGenerator.downloadExcel(data, filename)
      }
      
      console.log('✅ Report generated successfully')
      setShowReportFilters(false)
    } catch (error) {
      console.error('❌ Error generating donation report:', error)
      alert('An error occurred while generating the report. Please check the console for details.')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const generateAnalyticsReport = async (format: 'pdf' | 'excel', filters?: typeof reportFilters) => {
    setIsGeneratingReport(true)
    try {
      console.log('🔄 Generating analytics report...')
      
      // Build query parameters
      const params = new URLSearchParams()
      if (filters) {
        if (filters.barangayId && filters.barangayId !== 'all') {
          params.append('barangayId', filters.barangayId)
        }
        if (filters.startDate) {
          params.append('startDate', filters.startDate)
        }
        if (filters.endDate) {
          params.append('endDate', filters.endDate)
        }
      }
      
      const response = await fetch(`/api/admin/reports/analytics?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API Error:', errorData)
        alert(`Failed to generate report: ${errorData.error || 'Unknown error'}`)
        return
      }
      
      const data = await response.json()
      console.log('✅ Analytics data received:', data)
      
      const barangayName = filters?.barangayId && filters.barangayId !== 'all' 
        ? allBarangays.find(b => b.id === filters.barangayId)?.name || ''
        : 'All'
      const dateRange = filters?.startDate && filters?.endDate 
        ? `${filters.startDate}_to_${filters.endDate}`
        : 'all-time'
      const filename = `analytics-report-${barangayName.replace(/\s+/g, '-')}-${dateRange}`
      
      if (format === 'pdf') {
        ReportGenerator.downloadPDF(data, filename)
      } else {
        ReportGenerator.downloadExcel(data, filename)
      }
      
      console.log('✅ Analytics report generated successfully')
      setShowReportFilters(false)
    } catch (error) {
      console.error('❌ Error generating analytics report:', error)
      alert('An error occurred while generating the report. Please check the console for details.')
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleGenerateReport = () => {
    if (!reportType || !reportFormat) return
    
    if (reportType === 'donation') {
      generateDonationReport(reportFormat, reportFilters)
    } else {
      generateAnalyticsReport(reportFormat, reportFilters)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Image src="/glanlogos.png" alt="Glan Logo" width={32} height={32} className="h-6 w-6 sm:h-8 sm:w-8" />
              <span className="text-xl sm:text-2xl font-bold text-gray-900">MSWDO-GLAN CBDS</span>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="text-xs sm:text-sm text-gray-600">
                Admin: {session.user.name}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full sm:w-auto"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">
            System overview and analytics
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 h-auto">
            <TabsTrigger value="overview" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Home className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Users className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Users</span>
            </TabsTrigger>
            <TabsTrigger value="barangays" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Shield className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Barangays</span>
            </TabsTrigger>
            <TabsTrigger value="registrations" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <UserCheck className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Registrations</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Database className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Backup</span>
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Smartphone className="h-4 w-4" />
              <span className="text-xs sm:text-sm">SMS</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    All registered users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Barangays</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalBarangays}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered barangays
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Schedules</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSchedules}</div>
                  <p className="text-xs text-muted-foreground">
                    Total schedules
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Claims</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalClaims}</div>
                  <p className="text-xs text-muted-foreground">
                    Total claims
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.upcomingSchedules}</div>
                  <p className="text-xs text-muted-foreground">
                    Future schedules
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest system activities and events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.slice(0, 5).map((activity: any) => (
                      <div key={activity.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-gray-600">{activity.details}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Barangay Performance</CardTitle>
                  <CardDescription>
                    Distribution statistics by barangay
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {barangayStats.map((barangay: any) => (
                      <div key={barangay.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{barangay.name}</h3>
                          <p className="text-sm text-gray-600">
                            {barangay.totalSchedules} schedules • {barangay.totalClaims} claims
                          </p>
                        </div>
                        <Badge variant="default">
                          {barangay.totalClaims > 0 ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="barangays" className="space-y-6">
            <BarangayManagement />
          </TabsContent>

          <TabsContent value="registrations" className="space-y-6">
            <PendingRegistrations />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reports & Exports</CardTitle>
                <CardDescription>
                  Generate and download system reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="text-center p-6 border rounded-lg">
                    <FileText className="h-8 w-8 text-pink-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Donation Reports</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Generate comprehensive donation distribution reports
                    </p>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openReportFilters('donation', 'pdf')}
                        disabled={isGeneratingReport}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isGeneratingReport ? 'Generating...' : 'Generate PDF Report'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openReportFilters('donation', 'excel')}
                        disabled={isGeneratingReport}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        {isGeneratingReport ? 'Generating...' : 'Export Excel Report'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-center p-6 border rounded-lg">
                    <BarChart3 className="h-8 w-8 text-blue-500 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Analytics Report</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Export detailed analytics and insights
                    </p>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openReportFilters('analytics', 'pdf')}
                        disabled={isGeneratingReport}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isGeneratingReport ? 'Generating...' : 'Generate PDF Report'}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => openReportFilters('analytics', 'excel')}
                        disabled={isGeneratingReport}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        {isGeneratingReport ? 'Generating...' : 'Export Excel Report'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6">
            <BackupManagement />
          </TabsContent>

          <TabsContent value="sms" className="space-y-6">
            <SMSSettings />
          </TabsContent>
        </Tabs>

        {/* Report Filters Dialog */}
        <Dialog open={showReportFilters} onOpenChange={(open) => {
          setShowReportFilters(open)
          if (open) {
            // Refetch barangays when dialog opens to ensure fresh data
            fetchBarangays()
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reportType === 'donation' ? 'Donation Report' : 'Analytics Report'} - {reportFormat?.toUpperCase()}
              </DialogTitle>
              <DialogDescription>
                Select filters for the report generation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barangay">Barangay</Label>
                <Select
                  value={reportFilters.barangayId}
                  onValueChange={(value) => setReportFilters({...reportFilters, barangayId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select barangay" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Barangays</SelectItem>
                    {allBarangays && allBarangays.length > 0 ? (
                      allBarangays.map((barangay) => (
                        <SelectItem key={barangay.id} value={barangay.id}>
                          {barangay.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {allBarangays.length === 0 ? 'No barangays available. Please create barangays first.' : 'Loading...'}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {allBarangays.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No barangays found. Make sure you have created barangays in the Barangays tab.
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters({...reportFilters, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters({...reportFilters, endDate: e.target.value})}
                    min={reportFilters.startDate}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowReportFilters(false)
                    setReportFilters({ barangayId: 'all', startDate: '', endDate: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                >
                  {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

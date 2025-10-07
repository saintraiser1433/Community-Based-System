'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Home, 
  Calendar, 
  Users, 
  FileText, 
  Plus,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  X
} from 'lucide-react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import BarangayAnalytics from '@/components/barangay/BarangayAnalytics'
import Pagination from '@/components/ui/pagination'
import toast from 'react-hot-toast'

// Helper function to convert 24-hour time to 12-hour format
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':')
  const hour24 = parseInt(hours)
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minutes} ${ampm}`
}

export default function BarangayDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [schedules, setSchedules] = useState([])
  const [claims, setClaims] = useState([])
  const [residents, setResidents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateSchedule, setShowCreateSchedule] = useState(false)
  const [showEditSchedule, setShowEditSchedule] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [showDistributedConfirm, setShowDistributedConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showClaimConfirm, setShowClaimConfirm] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<any>(null)
  const [claimNotes, setClaimNotes] = useState('')
  const [showResidentDetails, setShowResidentDetails] = useState(false)
  const [selectedResident, setSelectedResident] = useState<any>(null)
  const [showUnclaimedResidents, setShowUnclaimedResidents] = useState(false)
  const [selectedScheduleForClaim, setSelectedScheduleForClaim] = useState<any>(null)
  const [unclaimedResidents, setUnclaimedResidents] = useState<any[]>([])
  const [showFamilyMemberSelect, setShowFamilyMemberSelect] = useState(false)
  const [selectedResidentForClaim, setSelectedResidentForClaim] = useState<any>(null)
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<string | null>(null)
  const [unclaimedResidentsPage, setUnclaimedResidentsPage] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Pagination states
  const [schedulesPage, setSchedulesPage] = useState(1)
  const [claimsPage, setClaimsPage] = useState(1)
  const [residentsPage, setResidentsPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    maxRecipients: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    try {
      // Fetch schedules
      const schedulesResponse = await fetch('/api/barangay/schedules')
      if (schedulesResponse.ok) {
        const schedulesData = await schedulesResponse.json()
        setSchedules(schedulesData)
      }

      // Fetch claims
      const claimsResponse = await fetch('/api/barangay/claims')
      if (claimsResponse.ok) {
        const claimsData = await claimsResponse.json()
        setClaims(claimsData)
      }

      // Fetch residents
      const residentsResponse = await fetch('/api/barangay/residents')
      if (residentsResponse.ok) {
        const residentsData = await residentsResponse.json()
        setResidents(residentsData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    if (!newSchedule.title || !newSchedule.description || !newSchedule.date || !newSchedule.startTime || !newSchedule.endTime || !newSchedule.location) {
      toast.error('All fields are required')
      return
    }

    // Validate date - must be today or future
    const scheduleDate = new Date(newSchedule.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    
    if (scheduleDate < today) {
      toast.error('Schedule date cannot be in the past. Please select today or a future date.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/barangay/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchedule),
      })

      if (response.ok) {
        setShowCreateSchedule(false)
        setNewSchedule({
          title: '',
          description: '',
          date: '',
          startTime: '',
          endTime: '',
          location: '',
          maxRecipients: ''
        })
        await fetchDashboardData()
        toast.success('Schedule created successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create schedule')
      }
    } catch (error) {
      console.error('Error creating schedule:', error)
      toast.error('An error occurred while creating schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSchedule) return

    // Client-side validation
    if (!newSchedule.title || !newSchedule.description || !newSchedule.date || !newSchedule.startTime || !newSchedule.endTime || !newSchedule.location) {
      toast.error('All fields are required')
      return
    }

    // Validate date - must be today or future
    const scheduleDate = new Date(newSchedule.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today
    
    if (scheduleDate < today) {
      toast.error('Schedule date cannot be in the past. Please select today or a future date.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/barangay/schedules/${selectedSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule)
      })

      if (response.ok) {
        setShowEditSchedule(false)
        setSelectedSchedule(null)
        setNewSchedule({
          title: '',
          description: '',
          date: '',
          startTime: '',
          endTime: '',
          location: '',
          maxRecipients: ''
        })
        await fetchDashboardData()
        toast.success('Schedule updated successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update schedule')
      }
    } catch (error) {
      console.error('Error updating schedule:', error)
      toast.error('An error occurred while updating schedule')
    } finally {
      setLoading(false)
    }
  }

  const openDistributedConfirm = (schedule: any) => {
    setSelectedSchedule(schedule)
    setShowDistributedConfirm(true)
  }

  const openCancelConfirm = (schedule: any) => {
    setSelectedSchedule(schedule)
    setShowCancelConfirm(true)
  }

  const confirmMarkAsDistributed = async () => {
    if (!selectedSchedule) return

    setLoading(true)
    try {
      const response = await fetch(`/api/barangay/schedules/${selectedSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISTRIBUTED' })
      })

      if (response.ok) {
        await fetchDashboardData()
        toast.success('Schedule marked as distributed successfully')
        setShowDistributedConfirm(false)
        setSelectedSchedule(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to mark schedule as distributed')
      }
    } catch (error) {
      console.error('Error marking schedule as distributed:', error)
      toast.error('An error occurred while marking schedule as distributed')
    } finally {
      setLoading(false)
    }
  }

  const confirmCancelSchedule = async () => {
    if (!selectedSchedule) return

    setLoading(true)
    try {
      const response = await fetch(`/api/barangay/schedules/${selectedSchedule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      })

      if (response.ok) {
        await fetchDashboardData()
        toast.success('Schedule cancelled successfully')
        setShowCancelConfirm(false)
        setSelectedSchedule(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to cancel schedule')
      }
    } catch (error) {
      console.error('Error cancelling schedule:', error)
      toast.error('An error occurred while cancelling schedule')
    } finally {
      setLoading(false)
    }
  }


  const confirmClaimDonation = async () => {
    if (!selectedClaim) return

    setLoading(true)
    try {
      const response = await fetch(`/api/barangay/claims/${selectedClaim.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim', notes: claimNotes })
      })

      if (response.ok) {
        await fetchDashboardData()
        toast.success('Donation marked as claimed successfully')
        setShowClaimConfirm(false)
        setSelectedClaim(null)
        setClaimNotes('')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to mark claim as completed')
      }
    } catch (error) {
      console.error('Error marking claim as completed:', error)
      toast.error('An error occurred while marking claim as completed')
    } finally {
      setLoading(false)
    }
  }

  const openClaimConfirm = (claim: any) => {
    setSelectedClaim(claim)
    setShowClaimConfirm(true)
  }


  const openResidentDetails = (resident: any) => {
    setSelectedResident(resident)
    setShowResidentDetails(true)
  }

  const openUnclaimedResidents = async (schedule: any) => {
    setSelectedScheduleForClaim(schedule)
    setUnclaimedResidentsPage(1) // Reset pagination to first page
    setLoading(true)
    
    try {
      // Fetch residents who haven't claimed this schedule
      const response = await fetch(`/api/barangay/unclaimed-residents?scheduleId=${schedule.id}`)
      if (response.ok) {
        const residents = await response.json()
        setUnclaimedResidents(residents)
        setShowUnclaimedResidents(true)
      } else {
        toast.error('Failed to fetch unclaimed residents')
      }
    } catch (error) {
      console.error('Error fetching unclaimed residents:', error)
      toast.error('An error occurred while fetching residents')
    } finally {
      setLoading(false)
    }
  }

  const openFamilyMemberSelect = (resident: any) => {
    setSelectedResidentForClaim(resident)
    setShowFamilyMemberSelect(true)
  }

  const handleClaimForResident = async (resident: any, familyMemberId?: string, familyMemberName?: string) => {
    if (!selectedScheduleForClaim) return

    setLoading(true)
    try {
      const requestBody: any = {
        scheduleId: selectedScheduleForClaim.id,
        residentId: resident.id
      }

      if (familyMemberId && familyMemberName) {
        requestBody.familyMemberId = familyMemberId
        requestBody.familyMemberName = familyMemberName
      }

      const response = await fetch('/api/barangay/claim-for-resident', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Successfully claimed donation for ${result.resident.name}`)
        
        // Refresh the unclaimed residents list
        await openUnclaimedResidents(selectedScheduleForClaim)
        
        // Close family member select if open
        setShowFamilyMemberSelect(false)
        setSelectedResidentForClaim(null)
        setSelectedFamilyMember(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to claim donation for resident')
      }
    } catch (error) {
      console.error('Error claiming donation for resident:', error)
      toast.error('An error occurred while claiming donation')
    } finally {
      setLoading(false)
    }
  }

  // Pagination helper functions
  const getPaginatedData = (data: any[], page: number, itemsPerPage: number) => {
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (data: any[], itemsPerPage: number) => {
    return Math.ceil(data.length / itemsPerPage)
  }

  const openEditSchedule = (schedule: any) => {
    setSelectedSchedule(schedule)
    setNewSchedule({
      title: schedule.title,
      description: schedule.description,
      date: schedule.date.split('T')[0], // Format date for input
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      location: schedule.location,
      maxRecipients: schedule.maxRecipients?.toString() || ''
    })
    setShowEditSchedule(true)
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
                Barangay Manager: {session.user.name}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/api/auth/signout')}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Barangay Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage donation schedules and track distributions
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
            <TabsTrigger value="overview" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Home className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Schedules</span>
            </TabsTrigger>
            <TabsTrigger value="claims" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Claims</span>
            </TabsTrigger>
            <TabsTrigger value="residents" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Users className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Residents</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{schedules.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Donation schedules
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{claims.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Donations claimed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Registered Residents</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{residents.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active residents
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Schedules</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {schedules.filter((schedule: any) => 
                      new Date(schedule.date) > new Date()
                    ).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Future distributions
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Claims</CardTitle>
                  <CardDescription>
                    Latest donation claims in your barangay
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {claims.slice(0, 5).map((claim: any) => (
                      <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">{claim.schedule?.title}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(claim.claimedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="default">{claim.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Schedules</CardTitle>
                  <CardDescription>
                    Next donation distributions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {schedules.filter((schedule: any) => 
                      new Date(schedule.date) > new Date()
                    ).slice(0, 3).map((schedule: any) => (
                      <div key={schedule.id} className="p-3 border rounded-lg">
                        <h3 className="font-semibold">{schedule.title}</h3>
                        <p className="text-sm text-gray-600">{schedule.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(schedule.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime12Hour(schedule.startTime)} - {formatTime12Hour(schedule.endTime)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Donation Schedules</CardTitle>
                    <CardDescription>
                      Manage donation distribution schedules
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateSchedule(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showCreateSchedule && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Create New Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreateSchedule} className="space-y-4 sm:space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                              id="title"
                              value={newSchedule.title}
                              onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
                              placeholder="Schedule title"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input
                              id="date"
                              type="date"
                              value={newSchedule.date}
                              onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                              min={new Date().toISOString().split('T')[0]}
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newSchedule.description}
                            onChange={(e) => setNewSchedule({...newSchedule, description: e.target.value})}
                            placeholder="Schedule description"
                            className="min-h-[80px] sm:min-h-[100px]"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startTime">Start Time</Label>
                            <Input
                              id="startTime"
                              type="time"
                              value={newSchedule.startTime}
                              onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="endTime">End Time</Label>
                            <Input
                              id="endTime"
                              type="time"
                              value={newSchedule.endTime}
                              onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                              required
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                            <Label htmlFor="maxRecipients">Max Recipients</Label>
                            <Input
                              id="maxRecipients"
                              type="number"
                              value={newSchedule.maxRecipients}
                              onChange={(e) => setNewSchedule({...newSchedule, maxRecipients: e.target.value})}
                              placeholder="Optional"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={newSchedule.location}
                            onChange={(e) => setNewSchedule({...newSchedule, location: e.target.value})}
                            placeholder="Distribution location"
                            required
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading ? 'Creating...' : 'Create Schedule'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowCreateSchedule(false)} disabled={loading} className="w-full sm:w-auto">
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {/* Edit Schedule Dialog */}
                {showEditSchedule && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Edit Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleEditSchedule} className="space-y-6">
                        <div>
                          <Label htmlFor="edit-title">Schedule Title</Label>
                          <Input
                            id="edit-title"
                            value={newSchedule.title}
                            onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                            placeholder="Enter schedule title"
                            required
                          />
                            </div>

                        <div>
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea
                            id="edit-description"
                            value={newSchedule.description}
                            onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                            placeholder="Enter description"
                            rows={3}
                          />
                            </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="edit-date">Date</Label>
                            <Input
                              id="edit-date"
                              type="date"
                              value={newSchedule.date}
                              onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                              min={new Date().toISOString().split('T')[0]}
                              required
                            />
                            </div>

                          <div>
                            <Label htmlFor="edit-startTime">Start Time</Label>
                            <Input
                              id="edit-startTime"
                              type="time"
                              value={newSchedule.startTime}
                              onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                              required
                            />
                          </div>

                          <div>
                            <Label htmlFor="edit-endTime">End Time</Label>
                            <Input
                              id="edit-endTime"
                              type="time"
                              value={newSchedule.endTime}
                              onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                              required
                            />
                        </div>
                        </div>

                        <div>
                          <Label htmlFor="edit-location">Location</Label>
                          <Input
                            id="edit-location"
                            value={newSchedule.location}
                            onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })}
                            placeholder="Enter location"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="edit-maxRecipients">Maximum Recipients (Optional)</Label>
                          <Input
                            id="edit-maxRecipients"
                            type="number"
                            value={newSchedule.maxRecipients}
                            onChange={(e) => setNewSchedule({ ...newSchedule, maxRecipients: e.target.value })}
                            placeholder="Enter maximum number of recipients"
                          />
                        </div>

                        <div className="flex space-x-2">
                          <Button type="submit" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Schedule'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowEditSchedule(false)} disabled={loading}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-6">
                  {schedules.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedules Found</h3>
                      <p className="text-gray-500">You haven't created any donation schedules yet.</p>
                      <Button 
                        className="mt-4"
                        onClick={() => setShowCreateSchedule(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Schedule
                      </Button>
                    </div>
                  ) : (
                    <>
                      {getPaginatedData(schedules, schedulesPage, itemsPerPage).map((schedule: any) => (
                    <div key={schedule.id} className="border rounded-lg p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                            <h3 className="text-lg font-semibold">{schedule.title}</h3>
                            <Badge variant={schedule.status === 'SCHEDULED' ? 'default' : 'secondary'} className="w-fit">
                            {schedule.status}
                          </Badge>
                          </div>
                          <p className="text-gray-600 text-sm sm:text-base">{schedule.description}</p>
                          
                          {/* Mobile-first info grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{new Date(schedule.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{formatTime12Hour(schedule.startTime)} - {formatTime12Hour(schedule.endTime)}</span>
                            </div>
                            <div className="flex items-center space-x-2 sm:col-span-2 lg:col-span-1">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">{schedule.location}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons - responsive layout */}
                        {schedule.status === 'SCHEDULED' && (
                          <div className="flex flex-col sm:flex-row gap-2 lg:ml-4">
                            {/* Mobile: Stack buttons vertically */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openEditSchedule(schedule)}
                                className="text-xs sm:text-sm"
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openDistributedConfirm(schedule)}
                                className="text-green-600 hover:text-green-700 text-xs sm:text-sm"
                              >
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Distributed</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openCancelConfirm(schedule)}
                                className="text-orange-600 hover:text-orange-700 text-xs sm:text-sm"
                              >
                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Cancel</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openUnclaimedResidents(schedule)}
                                className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
                              >
                                <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Manage Claims</span>
                              </Button>
                        </div>
                            
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                      
                      {schedules.length > itemsPerPage && (
                        <div className="mt-6">
                          <Pagination
                            currentPage={schedulesPage}
                            totalPages={getTotalPages(schedules, itemsPerPage)}
                            onPageChange={setSchedulesPage}
                            totalItems={schedules.length}
                            itemsPerPage={itemsPerPage}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Donation Claims</CardTitle>
                <CardDescription>
                  Track and verify donation claims
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {claims.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Found</h3>
                      <p className="text-gray-500">No donation claims have been made yet.</p>
                    </div>
                  ) : (
                    <>
                      {getPaginatedData(claims, claimsPage, itemsPerPage).map((claim: any) => {
                        const getStatusIcon = (status: string) => {
                          switch (status) {
                            case 'PENDING':
                              return <Clock className="h-6 w-6 text-yellow-500" />
                            case 'VERIFIED':
                              return <CheckCircle className="h-6 w-6 text-blue-500" />
                            case 'CLAIMED':
                              return <CheckCircle className="h-6 w-6 text-green-500" />
                            case 'REJECTED':
                              return <AlertCircle className="h-6 w-6 text-red-500" />
                            default:
                              return <Clock className="h-6 w-6 text-gray-500" />
                          }
                        }

                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case 'PENDING':
                              return 'bg-yellow-100'
                            case 'VERIFIED':
                              return 'bg-blue-100'
                            case 'CLAIMED':
                              return 'bg-green-100'
                            case 'REJECTED':
                              return 'bg-red-100'
                            default:
                              return 'bg-gray-100'
                          }
                        }

                        const getStatusBadgeVariant = (status: string) => {
                          switch (status) {
                            case 'PENDING':
                              return 'secondary'
                            case 'VERIFIED':
                              return 'default'
                            case 'CLAIMED':
                              return 'default'
                            case 'REJECTED':
                              return 'destructive'
                            default:
                              return 'secondary'
                          }
                        }

                        return (
                          <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 ${getStatusColor(claim.status)} rounded-full flex items-center justify-center`}>
                                {getStatusIcon(claim.status)}
                              </div>
                              <div>
                                <h3 className="font-semibold">{claim.schedule?.title}</h3>
                                <p className="text-sm text-gray-600">
                                  Claimed by: {claim.claimedByUser?.firstName} {claim.claimedByUser?.lastName}
                                </p>
                                <p className="text-sm text-gray-500">
                                  Family: {claim.family?.head?.firstName} {claim.family?.head?.lastName}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(claim.claimedAt).toLocaleDateString()} at {new Date(claim.claimedAt).toLocaleTimeString()}
                                </p>
                                {claim.verifiedAt && (
                                  <p className="text-sm text-gray-500">
                                    Verified on {new Date(claim.verifiedAt).toLocaleDateString()}
                                  </p>
                                )}
                                {claim.claimedAtPhysical && (
                                  <p className="text-sm text-gray-500">
                                    Physically claimed on {new Date(claim.claimedAtPhysical).toLocaleDateString()}
                                  </p>
                                )}
                                {claim.notes && (
                                  <p className="text-sm text-gray-500 mt-1">{claim.notes}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={getStatusBadgeVariant(claim.status)}>
                                {claim.status}
                              </Badge>
                              {claim.status === 'VERIFIED' && (
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => openClaimConfirm(claim)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Claimed
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      
                      {claims.length > itemsPerPage && (
                        <div className="mt-6">
                          <Pagination
                            currentPage={claimsPage}
                            totalPages={getTotalPages(claims, itemsPerPage)}
                            onPageChange={setClaimsPage}
                            totalItems={claims.length}
                            itemsPerPage={itemsPerPage}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="residents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registered Residents</CardTitle>
                <CardDescription>
                  View residents in your barangay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {residents.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Residents Found</h3>
                      <p className="text-gray-500">No residents have registered in your barangay yet.</p>
                    </div>
                  ) : (
                    <>
                      {getPaginatedData(residents, residentsPage, itemsPerPage).map((resident: any) => (
                    <div key={resident.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-pink-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{resident.firstName} {resident.lastName}</h3>
                          <p className="text-sm text-gray-600">{resident.email}</p>
                          <p className="text-sm text-gray-500">{resident.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={resident.isActive ? 'default' : 'secondary'}>
                          {resident.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openResidentDetails(resident)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                      
                      {residents.length > itemsPerPage && (
                        <div className="mt-6">
                          <Pagination
                            currentPage={residentsPage}
                            totalPages={getTotalPages(residents, itemsPerPage)}
                            onPageChange={setResidentsPage}
                            totalItems={residents.length}
                            itemsPerPage={itemsPerPage}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <BarangayAnalytics />
          </TabsContent>
        </Tabs>
      </div>

      {/* Mark as Distributed Confirmation Dialog */}
      <ConfirmationDialog
        open={showDistributedConfirm}
        onOpenChange={setShowDistributedConfirm}
        onConfirm={confirmMarkAsDistributed}
        title="Mark as Distributed"
        description={`Are you sure you want to mark the schedule "${selectedSchedule?.title}" as distributed? This will complete the donation distribution.`}
        action="update"
        loading={loading}
      />

      {/* Cancel Schedule Confirmation Dialog */}
      <ConfirmationDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        onConfirm={confirmCancelSchedule}
        title="Cancel Schedule"
        description={`Are you sure you want to cancel the schedule "${selectedSchedule?.title}"? This will prevent residents from claiming donations.`}
        action="delete"
        loading={loading}
      />

      {/* Mark as Claimed Confirmation Dialog */}
      <Dialog open={showClaimConfirm} onOpenChange={setShowClaimConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Claimed</DialogTitle>
            <DialogDescription>
              Mark the donation as physically claimed for "{selectedClaim?.schedule?.title}" by {selectedClaim?.claimedByUser?.firstName} {selectedClaim?.claimedByUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="claim-notes">Notes (Optional)</Label>
              <Textarea
                id="claim-notes"
                placeholder="Add any notes about the physical claim..."
                value={claimNotes}
                onChange={(e) => setClaimNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowClaimConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={confirmClaimDonation} disabled={loading}>
                {loading ? 'Processing...' : 'Mark as Claimed'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resident Details Dialog */}
      <Dialog open={showResidentDetails} onOpenChange={setShowResidentDetails}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Resident Details</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              View detailed information about this resident
            </DialogDescription>
          </DialogHeader>
          {selectedResident && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">First Name</Label>
                  <p className="text-sm">{selectedResident.firstName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Name</Label>
                  <p className="text-sm">{selectedResident.lastName}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                  <p className="text-sm break-all">{selectedResident.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Phone</Label>
                  <p className="text-sm">{selectedResident.phone || 'Not provided'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={selectedResident.isActive ? 'default' : 'secondary'}>
                    {selectedResident.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Registration Date</Label>
                  <p className="text-sm">
                    {new Date(selectedResident.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedResident.families && selectedResident.families.length > 0 ? (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Family Information</Label>
                  <div className="mt-2 space-y-4">
                    {selectedResident.families.map((family: any) => (
                      <div key={family.id} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-gray-700">
                            {family.isHead ? 'Family Head' : 'Family Member'}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {family.members ? family.members.length + 1 : 1} members
                          </Badge>
                        </div>
                        
                        {/* Family Head (the resident themselves) */}
                        <div className="mb-3 p-2 bg-white rounded border-l-4 border-blue-500">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {selectedResident.firstName} {selectedResident.lastName}
                              </p>
                              <p className="text-xs text-gray-500">Family Head</p>
                            </div>
                            <Badge variant="default" className="text-xs">Head</Badge>
                          </div>
                        </div>

                        {/* Family Members */}
                        {family.members && family.members.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Family Members</p>
                            {family.members.map((member: any) => (
                              <div key={member.id} className="p-2 bg-white rounded border">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                      <span className="capitalize">{member.relation.toLowerCase()}</span>
                                      {member.age && <span>• Age: {member.age}</span>}
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {member.relation}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {(!family.members || family.members.length === 0) && (
                          <div className="p-3 text-center text-sm text-gray-500 bg-gray-100 rounded">
                            No family members registered yet
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Family Information</Label>
                  <div className="mt-2 p-4 text-center text-sm text-gray-500 bg-gray-100 rounded-lg">
                    No family information available
                  </div>
                </div>
              )}

              {selectedResident.claims && selectedResident.claims.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Claim History</Label>
                  <div className="mt-2 space-y-2">
                    {selectedResident.claims.map((claim: any) => (
                      <div key={claim.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">
                              {claim.schedule?.title || 'Unknown Program'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Claimed: {new Date(claim.claimedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={
                              claim.status === 'CLAIMED' ? 'default' : 
                              claim.status === 'DISTRIBUTED' ? 'secondary' : 'destructive'
                            }>
                              {claim.status}
                            </Badge>
                            {claim.isVerified && (
                              <Badge variant="outline" className="text-green-600">
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unclaimed Residents Modal */}
      <Dialog open={showUnclaimedResidents} onOpenChange={setShowUnclaimedResidents}>
        <DialogContent className="w-[99vw] max-w-[95vw] max-h-[90vh] overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Manage Claims - {selectedScheduleForClaim?.title}</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Select residents to claim donations on their behalf. You can choose family members if the resident is not available.
              {unclaimedResidents.length > 0 && (
                <span className="block mt-2 text-blue-600 font-medium">
                  {unclaimedResidents.length} resident{unclaimedResidents.length !== 1 ? 's' : ''} available
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {unclaimedResidents.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Residents Have Claimed</h3>
                <p className="text-gray-500">All residents in your barangay have already claimed this donation.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  {getPaginatedData(unclaimedResidents, unclaimedResidentsPage, 10).map((resident: any) => (
                    <div key={resident.id} className="border rounded-lg p-4 sm:p-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-base">{resident.firstName} {resident.lastName}</h4>
                          {resident.families?.[0]?.members?.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {resident.families[0].members.length} Family Members
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm text-gray-600 break-all">{resident.email}</p>
                            <p className="text-xs text-gray-500">Email</p>
                          </div>
                          {resident.phone && (
                            <div>
                              <p className="text-sm text-gray-600">{resident.phone}</p>
                              <p className="text-xs text-gray-500">Phone</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleClaimForResident(resident)}
                            disabled={loading}
                            className="w-full sm:flex-1 text-sm"
                          >
                            Claim for Resident
                          </Button>
                          {resident.families?.[0]?.members?.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openFamilyMemberSelect(resident)}
                              disabled={loading}
                              className="w-full sm:flex-1 text-sm"
                            >
                              Claim for Family Member
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {unclaimedResidents.length > 10 && (
                  <div className="flex justify-center mt-6">
                    <Pagination
                      currentPage={unclaimedResidentsPage}
                      totalItems={unclaimedResidents.length}
                      itemsPerPage={10}
                      totalPages={Math.ceil(unclaimedResidents.length / 10)}
                      onPageChange={setUnclaimedResidentsPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Family Member Selection Modal */}
      <Dialog open={showFamilyMemberSelect} onOpenChange={setShowFamilyMemberSelect}>
        <DialogContent className="w-[95vw] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Select Family Member</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Choose which family member will claim the donation for {selectedResidentForClaim?.firstName} {selectedResidentForClaim?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Select Family Member:</Label>
              <Select value={selectedFamilyMember || ''} onValueChange={setSelectedFamilyMember}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select family member" />
                </SelectTrigger>
                <SelectContent>
                  {selectedResidentForClaim?.families?.[0]?.members?.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.relation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sm:space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowFamilyMemberSelect(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (selectedFamilyMember && selectedResidentForClaim) {
                    const member = selectedResidentForClaim.families[0].members.find((m: any) => m.id === selectedFamilyMember)
                    if (member) {
                      handleClaimForResident(selectedResidentForClaim, selectedFamilyMember, member.name)
                    }
                  }
                }}
                disabled={!selectedFamilyMember || loading}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                {loading ? 'Processing...' : 'Claim for Family Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

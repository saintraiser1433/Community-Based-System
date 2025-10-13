'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import Pagination from '@/components/ui/pagination'
import toast from 'react-hot-toast'
import { 
  Home, 
  Users, 
  Calendar, 
  Package, 
  Plus,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
  BarChart3,
  Edit,
  Trash2
} from 'lucide-react'
import Image from 'next/image'

// Helper function to convert 24-hour time to 12-hour format
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':')
  const hour24 = parseInt(hours)
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minutes} ${ampm}`
}

export default function ResidentDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [donationSchedules, setDonationSchedules] = useState([])
  const [familyMembers, setFamilyMembers] = useState([])
  const [claims, setClaims] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showAddMemberConfirm, setShowAddMemberConfirm] = useState(false)
  const [showEditMemberModal, setShowEditMemberModal] = useState(false)
  const [showDeleteMemberConfirm, setShowDeleteMemberConfirm] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [newMember, setNewMember] = useState({
    name: '',
    relation: '',
    age: ''
  })
  
  // Pagination states
  const [schedulesPage, setSchedulesPage] = useState(1)
  const [familyPage, setFamilyPage] = useState(1)
  const [claimsPage, setClaimsPage] = useState(1)
  const [itemsPerPage] = useState(5)

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
      // Fetch donation schedules for the user's barangay
      const schedulesResponse = await fetch('/api/resident/schedules')
      if (schedulesResponse.ok) {
        const schedules = await schedulesResponse.json()
        console.log('Fetched schedules:', schedules)
        setDonationSchedules(schedules)
      }

      // Fetch family members
      const familyResponse = await fetch('/api/resident/family')
      if (familyResponse.ok) {
        const family = await familyResponse.json()
        console.log('Fetched family:', family)
        setFamilyMembers(family.members || [])
      }

      // Fetch user's claims
      const claimsResponse = await fetch('/api/resident/claims')
      if (claimsResponse.ok) {
        const userClaims = await claimsResponse.json()
        console.log('Fetched claims:', userClaims)
        setClaims(userClaims)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const openLocationModal = (schedule: any) => {
    setSelectedSchedule(schedule)
    setShowLocationModal(true)
  }

  const openAddMemberModal = () => {
    setNewMember({
      name: '',
      relation: '',
      age: ''
    })
    setShowAddMemberModal(true)
  }

  const handleAddMember = async () => {
    try {
      const response = await fetch('/api/resident/family', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMember),
      })

      if (response.ok) {
        await fetchDashboardData()
        setShowAddMemberModal(false)
        setShowAddMemberConfirm(false)
        toast.success('Family member added successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add family member')
      }
    } catch (error) {
      console.error('Error adding family member:', error)
      toast.error('An error occurred while adding family member')
    }
  }

  const openAddMemberConfirm = () => {
    if (!newMember.name || !newMember.relation) {
      toast.error('Please fill in the required fields (Name and Relationship)')
      return
    }
    setShowAddMemberConfirm(true)
  }

  const openEditMemberModal = (member: any) => {
    setSelectedMember(member)
    setNewMember({
      name: member.name,
      relation: member.relation.toLowerCase(),
      age: member.age?.toString() || ''
    })
    setShowEditMemberModal(true)
  }

  const openDeleteMemberConfirm = (member: any) => {
    setSelectedMember(member)
    setShowDeleteMemberConfirm(true)
  }


  const handleEditMember = async () => {
    if (!selectedMember) return

    try {
      const response = await fetch(`/api/resident/family/${selectedMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMember),
      })

      if (response.ok) {
        await fetchDashboardData()
        setShowEditMemberModal(false)
        setSelectedMember(null)
        toast.success('Family member updated successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update family member')
      }
    } catch (error) {
      console.error('Error updating family member:', error)
      toast.error('An error occurred while updating family member')
    }
  }

  const handleDeleteMember = async () => {
    if (!selectedMember) return

    try {
      const response = await fetch(`/api/resident/family/${selectedMember.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchDashboardData()
        setShowDeleteMemberConfirm(false)
        setSelectedMember(null)
        toast.success('Family member removed successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to remove family member')
      }
    } catch (error) {
      console.error('Error removing family member:', error)
      toast.error('An error occurred while removing family member')
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
                Welcome, {session.user.name}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Resident Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage your family and view donation schedules
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 h-auto">
            <TabsTrigger value="overview" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Home className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Schedules</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Users className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Family</span>
            </TabsTrigger>
            <TabsTrigger value="claims" className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-1">
              <Package className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Claims</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Family Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{familyMembers.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Total family members
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Schedules</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {donationSchedules.filter((schedule: any) => 
                      new Date(schedule.date) > new Date()
                    ).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available distributions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{claims.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Donations received
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Donation Schedules</CardTitle>
                <CardDescription>
                  Upcoming donation distributions in your barangay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {donationSchedules.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Donation Schedules</h3>
                      <p className="text-gray-500">There are no upcoming donation schedules in your barangay.</p>
                    </div>
                  ) : (
                    getPaginatedData(donationSchedules, 1, 3).map((schedule: any) => (
                    <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-pink-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{schedule.title}</h3>
                          <p className="text-sm text-gray-600">{schedule.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{formatTime12Hour(schedule.startTime)} - {formatTime12Hour(schedule.endTime)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{schedule.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={schedule.status === 'SCHEDULED' ? 'default' : 'secondary'}>
                          {schedule.status}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openLocationModal(schedule)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Location
                        </Button>
                        {schedule.hasClaimed && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Claimed
                          </Badge>
                        )}
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Donation Schedules</CardTitle>
                <CardDescription>
                  View all available donation schedules in your barangay. Contact your barangay office to register for donations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {donationSchedules.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Donation Schedules</h3>
                      <p className="text-gray-500">There are no donation schedules available in your barangay.</p>
                    </div>
                  ) : (
                    <>
                      {getPaginatedData(donationSchedules, schedulesPage, itemsPerPage).map((schedule: any) => (
                    <div key={schedule.id} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">{schedule.title}</h3>
                          <p className="text-gray-600">{schedule.description}</p>
                          <div className="flex items-center space-x-6 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(schedule.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{formatTime12Hour(schedule.startTime)} - {formatTime12Hour(schedule.endTime)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{schedule.location}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={schedule.status === 'SCHEDULED' ? 'default' : 'secondary'}>
                            {schedule.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                      ))}
                      
                      {donationSchedules.length > itemsPerPage && (
                        <div className="mt-6">
                          <Pagination
                            currentPage={schedulesPage}
                            totalPages={getTotalPages(donationSchedules, itemsPerPage)}
                            onPageChange={setSchedulesPage}
                            totalItems={donationSchedules.length}
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

          <TabsContent value="family" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Family Management</CardTitle>
                <CardDescription>
                  Manage your family members and their information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Family Members</h3>
                    <Button 
                      className="flex items-center space-x-2"
                      onClick={openAddMemberModal}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Member</span>
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {familyMembers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Family Members</h3>
                        <p className="text-gray-500">You haven't added any family members yet.</p>
                        <Button 
                          className="mt-4"
                          onClick={openAddMemberModal}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Member
                        </Button>
                      </div>
                    ) : (
                      <>
                        {getPaginatedData(familyMembers, familyPage, itemsPerPage).map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-pink-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{member.name}</h4>
                            <p className="text-sm text-gray-600">
                              {member.relation} • Age: {member.age || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditMemberModal(member)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openDeleteMemberConfirm(member)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                      ))}
                      
                      {familyMembers.length > itemsPerPage && (
                        <div className="mt-6">
                          <Pagination
                            currentPage={familyPage}
                            totalPages={getTotalPages(familyMembers, itemsPerPage)}
                            onPageChange={setFamilyPage}
                            totalItems={familyMembers.length}
                            itemsPerPage={itemsPerPage}
                          />
                        </div>
                      )}
                    </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Claims</CardTitle>
                <CardDescription>
                  View your donation claims and their status. Claims are verified and processed by barangay officials.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {claims.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Yet</h3>
                      <p className="text-gray-500">You haven't made any donation claims yet. Contact your barangay office to register for available donations.</p>
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
                                  Claimed on {new Date(claim.claimedAt).toLocaleDateString()}
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
                            <Badge variant={getStatusBadgeVariant(claim.status)}>
                              {claim.status}
                            </Badge>
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

        </Tabs>
      </div>

      {/* Add Family Member Modal */}
      <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Family Member</DialogTitle>
            <DialogDescription>
              Add a new family member to your household
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="relation">Relationship</Label>
              <Select
                value={newMember.relation}
                onValueChange={(value) => setNewMember({ ...newMember, relation: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="age">Age (Optional)</Label>
              <Input
                id="age"
                type="number"
                placeholder="Enter age"
                value={newMember.age}
                onChange={(e) => setNewMember({ ...newMember, age: e.target.value })}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddMemberModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={openAddMemberConfirm}>
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Details Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Program Location Details</DialogTitle>
            <DialogDescription>
              View detailed information about the donation program location
            </DialogDescription>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Program Title</Label>
                  <p className="text-lg font-semibold">{selectedSchedule.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Description</Label>
                  <p className="text-sm">{selectedSchedule.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Date</Label>
                  <p className="text-sm">{new Date(selectedSchedule.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Time</Label>
                  <p className="text-sm">{formatTime12Hour(selectedSchedule.startTime)} - {formatTime12Hour(selectedSchedule.endTime)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Location</Label>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-5 w-5 text-pink-500 mt-0.5" />
                      <div>
                        <p className="font-medium">{selectedSchedule.location}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Please arrive on time and bring a valid ID for verification.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <Badge variant={selectedSchedule.status === 'SCHEDULED' ? 'default' : 'secondary'}>
                    {selectedSchedule.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Program Type</Label>
                  <p className="text-sm">Donation Distribution</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Important Reminders</p>
                    <ul className="text-sm text-blue-700 mt-1 space-y-1">
                      <li>• Bring a valid government-issued ID</li>
                      <li>• Arrive 15 minutes before the scheduled time</li>
                      <li>• Follow social distancing guidelines</li>
                      <li>• Wear a face mask at all times</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Member Confirmation Dialog */}
      <ConfirmationDialog
        open={showAddMemberConfirm}
        onOpenChange={setShowAddMemberConfirm}
        onConfirm={handleAddMember}
        title="Add Family Member"
        description={`Are you sure you want to add "${newMember.name}" as a ${newMember.relation} to your family?`}
        action="create"
      />

      {/* Edit Member Modal */}
      <Dialog open={showEditMemberModal} onOpenChange={setShowEditMemberModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Family Member</DialogTitle>
            <DialogDescription>
              Update the information for this family member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="Enter full name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-relation">Relationship *</Label>
              <Select
                value={newMember.relation}
                onValueChange={(value) => setNewMember({ ...newMember, relation: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-age">Age (Optional)</Label>
              <Input
                id="edit-age"
                type="number"
                placeholder="Enter age"
                value={newMember.age}
                onChange={(e) => setNewMember({ ...newMember, age: e.target.value })}
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditMemberModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditMember}
                disabled={!newMember.name || !newMember.relation}
              >
                Update Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteMemberConfirm}
        onOpenChange={setShowDeleteMemberConfirm}
        onConfirm={handleDeleteMember}
        title="Remove Family Member"
        description={`Are you sure you want to remove "${selectedMember?.name}" from your family? This action cannot be undone.`}
        action="delete"
      />
    </div>
  )
}

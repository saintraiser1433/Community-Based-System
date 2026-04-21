'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Eye, Search, UserCheck, UserX, CreditCard } from 'lucide-react'
import { downloadUserIdCardPdf, canGenerateIdCard } from '@/lib/id-card-pdf'
import { formatMswdoId } from '@/lib/mswdo-id'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import Pagination from '@/components/ui/pagination'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: string
  isActive: boolean
  /** Resident public ID; staff users omit this */
  mswdoSequence?: number | null
  idFilePath?: string | null
  barangay?: {
    id: string
    name: string
  }
  createdAt: string
}

interface Barangay {
  id: string
  name: string
  code: string
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [barangays, setBarangays] = useState<Barangay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  /** Staff = admin + barangay managers; residents = separate list with barangay filter */
  const [listModule, setListModule] = useState<'staff' | 'residents' | 'residentInsights'>('staff')
  const [barangayFilter, setBarangayFilter] = useState<string>('all')
  const [residentInsightsSearchTerm, setResidentInsightsSearchTerm] = useState('')
  const [familyCategory, setFamilyCategory] = useState<'ALL' | 'PWD' | 'STUDENT' | 'INDIGENT' | 'SENIOR' | 'OTHER'>('PWD')
  const [familyStatsRows, setFamilyStatsRows] = useState<any[]>([])
  const [familyStatsLoading, setFamilyStatsLoading] = useState(false)
  const [showFamilyDetails, setShowFamilyDetails] = useState(false)
  const [selectedBarangayForFamilies, setSelectedBarangayForFamilies] = useState<any | null>(null)
  const [familyDetailsLoading, setFamilyDetailsLoading] = useState(false)
  const [familyDetails, setFamilyDetails] = useState<any[]>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10
  
  // Confirmation dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCreateConfirm, setShowCreateConfirm] = useState(false)
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadingId, setUploadingId] = useState(false)
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [cameraTarget, setCameraTarget] = useState<'idFilePath' | null>(null)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'RESIDENT',
    barangayId: '',
    isActive: true,
    idFilePath: ''
  })

  useEffect(() => {
    fetchUsers()
    fetchBarangays()
  }, [])

  useEffect(() => {
    if (listModule === 'residentInsights') return
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      fetchUsers(1)
    }, 400)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, listModule, barangayFilter])

  useEffect(() => {
    if (listModule !== 'residentInsights') return
    fetchFamilyStats(familyCategory)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listModule, familyCategory])

  const fetchFamilyStats = async (
    category: 'ALL' | 'PWD' | 'STUDENT' | 'INDIGENT' | 'SENIOR' | 'OTHER'
  ) => {
    setFamilyStatsLoading(true)
    try {
      const params = new URLSearchParams()
      if (category && category !== 'ALL') params.append('category', category)
      const res = await fetch(`/api/admin/family-stats?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setFamilyStatsRows(data.rows || [])
    } catch (error) {
      console.error('Error fetching family stats:', error)
    } finally {
      setFamilyStatsLoading(false)
    }
  }

  const getCategoryLabel = (c: typeof familyCategory) => {
    if (c === 'PWD') return 'PWD'
    if (c === 'STUDENT') return 'Students'
    if (c === 'INDIGENT') return 'Indigent'
    if (c === 'SENIOR') return 'Senior Citizens'
    if (c === 'OTHER') return 'Other'
    return 'All'
  }

  const getCategoryListLabel = (c: typeof familyCategory) => {
    if (c === 'PWD') return 'PWD List'
    if (c === 'STUDENT') return 'Students List'
    if (c === 'INDIGENT') return 'Indigent List'
    if (c === 'SENIOR') return 'Senior Citizens List'
    if (c === 'OTHER') return 'Other Members List'
    return 'Members List'
  }

  const getFamilyMatchesCount = (row: any) => {
    if (familyCategory === 'PWD') return row.pwdFamilies || 0
    if (familyCategory === 'STUDENT') return row.studentFamilies || 0
    if (familyCategory === 'INDIGENT') return row.indigentFamilies || 0
    if (familyCategory === 'SENIOR') return row.seniorFamilies || 0
    if (familyCategory === 'OTHER') return row.otherFamilies || 0
    return row.totalFamilies || 0
  }

  const openFamilyDetails = async (barangay: any) => {
    setSelectedBarangayForFamilies(barangay)
    setFamilyDetails([])
    setFamilyDetailsLoading(true)
    setShowFamilyDetails(true)

    try {
      const params = new URLSearchParams()
      params.append('barangayId', barangay.id)
      if (familyCategory && familyCategory !== 'ALL') params.append('category', familyCategory)
      const res = await fetch(`/api/admin/families?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setFamilyDetails(data.families || [])
    } catch (error) {
      console.error('Error fetching family details:', error)
    } finally {
      setFamilyDetailsLoading(false)
    }
  }

  const filteredFamilyStatsRows = familyStatsRows.filter((row: any) => {
    if (!residentInsightsSearchTerm.trim()) return true
    const q = residentInsightsSearchTerm.toLowerCase()
    return (
      String(row.name || '').toLowerCase().includes(q) ||
      String(row.code || '').toLowerCase().includes(q)
    )
  })

  const residentInsightsTotals = filteredFamilyStatsRows.reduce(
    (acc: any, row: any) => {
      acc.totalFamilies += row.totalFamilies || 0
      acc.pwdFamilies += row.pwdFamilies || 0
      acc.studentFamilies += row.studentFamilies || 0
      acc.studentElementaryCount += row.studentElementaryCount || 0
      acc.studentHighSchoolCount += row.studentHighSchoolCount || 0
      acc.studentSeniorHighSchoolCount += row.studentSeniorHighSchoolCount || 0
      acc.studentCollegeCount += row.studentCollegeCount || 0
      acc.notStudentCount += row.notStudentCount || 0
      acc.indigentFamilies += row.indigentFamilies || 0
      acc.seniorFamilies += row.seniorFamilies || 0
      acc.otherFamilies += row.otherFamilies || 0
      return acc
    },
    {
      totalFamilies: 0,
      pwdFamilies: 0,
      studentFamilies: 0,
      studentElementaryCount: 0,
      studentHighSchoolCount: 0,
      studentSeniorHighSchoolCount: 0,
      studentCollegeCount: 0,
      notStudentCount: 0,
      indigentFamilies: 0,
      seniorFamilies: 0,
      otherFamilies: 0
    }
  )

  const topBarangayBySelectedType = filteredFamilyStatsRows.reduce((best: any, row: any) => {
    if (!best) return row
    return getFamilyMatchesCount(row) > getFamilyMatchesCount(best) ? row : best
  }, null)

  const fetchUsers = async (page = currentPage) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (listModule === 'staff') {
        params.append('module', 'staff')
      } else {
        params.append('module', 'residents')
        if (barangayFilter !== 'all') {
          params.append('barangayId', barangayFilter)
        }
      }
      if (searchTerm) params.append('search', searchTerm)
      params.append('page', page.toString())
      params.append('limit', itemsPerPage.toString())
      
      const response = await fetch(`/api/admin/users?${params}`)
      console.log('Fetch users response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setTotalPages(data.pagination.pages)
        setTotalItems(data.pagination.total)
        setCurrentPage(page)
      } else {
        const error = await response.json()
        console.error('Fetch users error:', error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBarangays = async () => {
    try {
      const response = await fetch('/api/admin/barangays')
      if (response.ok) {
        const data = await response.json()
        setBarangays(data)
      }
    } catch (error) {
      console.error('Error fetching barangays:', error)
    }
  }

  const uploadIdDocument = async (file: File) => {
    const payload = new FormData()
    payload.append('file', file)
    payload.append('field', 'idFront')
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: payload
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Failed to upload ID document')
    }
    return data.filePath as string
  }

  const handleIdDocumentChange = async (target: 'idFilePath', file: File | null) => {
    if (!file) return
    setUploadingId(true)
    try {
      const filePath = await uploadIdDocument(file)
      setUserForm((prev) => ({ ...prev, [target]: filePath }))
      toast.success('ID document uploaded')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload ID document')
    } finally {
      setUploadingId(false)
    }
  }

  const stopCamera = (closeDialog = true) => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop())
    }
    setCameraStream(null)
    if (closeDialog) {
      setShowCameraDialog(false)
    }
  }

  const loadCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videos = devices.filter((d) => d.kind === 'videoinput')
      setCameraDevices(videos)
      if (!selectedCameraId && videos.length > 0) {
        setSelectedCameraId(videos[0].deviceId)
      }
    } catch {
      // Ignore device enumeration errors.
    }
  }

  const startCameraCapture = async (target: 'idFilePath', deviceId?: string) => {
    try {
      stopCamera(false)
      const preferredDeviceId = deviceId || selectedCameraId
      const attempts: MediaStreamConstraints[] = preferredDeviceId
        ? [
            { video: { deviceId: { exact: preferredDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
            { video: { deviceId: { exact: preferredDeviceId } }, audio: false }
          ]
        : [
            { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
            { video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
            { video: true, audio: false }
          ]

      let stream: MediaStream | null = null
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          break
        } catch {
          // Try next fallback.
        }
      }
      if (!stream) {
        throw new Error('Unable to open camera stream')
      }
      setCameraTarget(target)
      setCameraStream(stream)
      setShowCameraDialog(true)
      await loadCameraDevices()
    } catch (error) {
      console.error(error)
      toast.error('Camera permission denied or camera unavailable')
    }
  }

  const captureFromCamera = async () => {
    if (!videoRef.current || !cameraTarget) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      toast.error('Unable to capture image from camera')
      return
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    )
    if (!blob) {
      toast.error('Failed to create image from camera capture')
      return
    }
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await handleIdDocumentChange(cameraTarget, file)
    stopCamera()
  }

  useEffect(() => {
    if (!showCameraDialog || !videoRef.current || !cameraStream) return
    const videoEl = videoRef.current
    videoEl.setAttribute('playsinline', 'true')
    videoEl.muted = true
    videoEl.srcObject = cameraStream
    videoEl.onloadedmetadata = () => {
      videoEl.play().catch(() => {
        toast.error('Unable to start camera preview')
      })
    }
    if (videoEl.readyState >= 1) {
      videoEl.play().catch(() => {
        toast.error('Unable to start camera preview')
      })
    }
    return () => {
      videoEl.onloadedmetadata = null
    }
  }, [showCameraDialog, cameraStream])

  useEffect(() => {
    if (!showCameraDialog || !selectedCameraId || !cameraTarget || !cameraStream) return
    startCameraCapture(cameraTarget, selectedCameraId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCameraId])

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [cameraStream])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setShowCreateConfirm(true)
  }

  const confirmCreateUser = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      })
      
      if (response.ok) {
        setShowCreateUser(false)
        setShowCreateConfirm(false)
        resetUserForm()
        fetchUsers()
        toast.success('User created successfully!')
      } else {
        const error = await response.json()
        console.error('Create user error:', error)
        toast.error(error.error || 'Failed to create user')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('An error occurred while creating user')
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setShowUpdateConfirm(true)
  }

  const confirmUpdateUser = async () => {
    if (!selectedUser) return
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      })
      
      if (response.ok) {
        setShowEditUser(false)
        setShowUpdateConfirm(false)
        resetUserForm()
        fetchUsers()
        toast.success('User updated successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      toast.error('An error occurred while updating user')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setSelectedUser(users.find(u => u.id === userId) || null)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteUser = async () => {
    if (!selectedUser) return
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setShowDeleteConfirm(false)
        setSelectedUser(null)
        fetchUsers()
        toast.success('User deactivated successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to deactivate user')
      }
    } catch (error) {
      console.error('Error deactivating user:', error)
      toast.error('An error occurred while deactivating user')
    } finally {
      setLoading(false)
    }
  }

  const resetUserForm = () => {
    setUserForm({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: 'RESIDENT',
      barangayId: '',
      isActive: true,
      idFilePath: ''
    })
    setSelectedUser(null)
  }

  const openCreateUser = () => {
    resetUserForm()
    setShowCreateUser(true)
  }

  const openEditUser = (user: User) => {
    setSelectedUser(user)
    setUserForm({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      role: user.role,
      barangayId: user.barangay?.id || '',
      isActive: user.isActive,
      idFilePath: user.idFilePath || ''
    })
    setShowEditUser(true)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500'
      case 'BARANGAY': return 'bg-blue-500'
      case 'RESIDENT': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const handleGenerateIdCard = async (user: User) => {
    if (!canGenerateIdCard(user.role, user.isActive)) {
      toast.error('ID cards can only be generated for approved (active) residents.')
      return
    }
    try {
      await downloadUserIdCardPdf({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        barangayName: user.barangay?.name ?? null,
        idFilePath: user.idFilePath ?? null,
        mswdoSequence: user.mswdoSequence ?? null,
        isActive: user.isActive
      })
      toast.success('ID card PDF downloaded')
    } catch (e) {
      console.error(e)
      toast.error(
        e instanceof Error ? e.message : 'Failed to generate ID card'
      )
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="text-lg sm:text-xl">User Management</CardTitle>
              <CardDescription className="text-sm">
                Staff (admin & barangay) and residents are listed separately. Filter residents by barangay.
              </CardDescription>
            </div>
            {listModule === 'staff' && (
            <Dialog open={showCreateUser} onOpenChange={(open) => {
              setShowCreateUser(open)
              if (!open) resetUserForm()
            }}>
              <DialogTrigger asChild>
                <Button onClick={openCreateUser}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Add a new user to the system
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={userForm.firstName}
                        onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={userForm.lastName}
                        onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="BARANGAY">Barangay Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {userForm.role === 'BARANGAY' && (
                    <div>
                      <Label htmlFor="barangayId">Barangay</Label>
                      <Select value={userForm.barangayId} onValueChange={(value) => setUserForm({ ...userForm, barangayId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Barangay" />
                        </SelectTrigger>
                        <SelectContent>
                          {barangays.map((barangay) => (
                            <SelectItem key={barangay.id} value={barangay.id}>
                              {barangay.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Resident Image (Camera Only)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => startCameraCapture('idFilePath')}
                      disabled={uploadingId}
                    >
                      Open Camera (Permission Required)
                    </Button>
                    {userForm.idFilePath && (
                      <p className="text-xs text-green-600 break-all">Saved: {userForm.idFilePath}</p>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create User</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={listModule}
            onValueChange={(v) => {
              setListModule(v as 'staff' | 'residents' | 'residentInsights')
              setCurrentPage(1)
            }}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-4">
              <TabsTrigger value="staff">Staff (Admin & Barangay)</TabsTrigger>
              <TabsTrigger value="residents">Residents</TabsTrigger>
              <TabsTrigger value="residentInsights">Resident Insights</TabsTrigger>
            </TabsList>
            <TabsContent value="staff" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                System administrators and barangay managers. Use Add User to create new staff accounts.
              </p>
            </TabsContent>
            <TabsContent value="residents" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Registered residents. Approve new registrations under Pending Registrations. Filter by barangay below.
              </p>
            </TabsContent>
            <TabsContent value="residentInsights" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Family-based resident insights by barangay (PWD, Students, and other categories).
              </p>
            </TabsContent>
          </Tabs>

          {/* Filters */}
          <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 mb-6">
            {listModule !== 'residentInsights' ? (
              <>
                <div className="flex-1">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {listModule === 'residents' && (
                  <div className="w-full lg:w-64">
                    <Label className="sr-only">Barangay</Label>
                    <Select
                      value={barangayFilter}
                      onValueChange={(v) => {
                        setBarangayFilter(v)
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All barangays" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All barangays</SelectItem>
                        {barangays.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex-1">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">SEARCH :</Label>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        placeholder="Search barangay name or code..."
                        value={residentInsightsSearchTerm}
                        onChange={(e) => setResidentInsightsSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                <div className="w-full xl:w-80">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700">TYPE :</Label>
                    <Select value={familyCategory} onValueChange={(v: any) => setFamilyCategory(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PWD">PWD</SelectItem>
                        <SelectItem value="STUDENT">Students</SelectItem>
                        <SelectItem value="SENIOR">Senior Citizens</SelectItem>
                        <SelectItem value="INDIGENT">Indigent</SelectItem>
                        <SelectItem value="OTHER">Other (none of the above)</SelectItem>
                        <SelectItem value="ALL">All Families</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => (listModule === 'residentInsights' ? fetchFamilyStats(familyCategory) : fetchUsers(1))}
            >
              Refresh
            </Button>
          </div>

          {/* Users Table / Resident Insights Table */}
          {listModule === 'residentInsights' ? (
            <div className="space-y-4 sm:space-y-5">
              <div className="text-sm text-gray-600 leading-relaxed">
                Showing <span className="font-medium">{getCategoryLabel(familyCategory)}</span> family counts per barangay
              </div>

              {/* Resident Insights Analytics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Covered Barangays</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{filteredFamilyStatsRows.length}</div>
                    <p className="text-xs text-muted-foreground">Barangays in current result set</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Families</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{residentInsightsTotals.totalFamilies}</div>
                    <p className="text-xs text-muted-foreground">Across filtered barangays</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{getCategoryLabel(familyCategory)} Families</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {familyCategory === 'ALL'
                        ? residentInsightsTotals.totalFamilies
                        : residentInsightsTotals[
                            familyCategory === 'PWD'
                              ? 'pwdFamilies'
                              : familyCategory === 'STUDENT'
                              ? 'studentFamilies'
                              : familyCategory === 'INDIGENT'
                              ? 'indigentFamilies'
                              : familyCategory === 'SENIOR'
                              ? 'seniorFamilies'
                              : 'otherFamilies'
                          ]}
                    </div>
                    <p className="text-xs text-muted-foreground">Current selected type total</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top Barangay ({getCategoryLabel(familyCategory)})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-base font-semibold truncate">
                      {topBarangayBySelectedType?.name || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Count: {topBarangayBySelectedType ? getFamilyMatchesCount(topBarangayBySelectedType) : 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {familyCategory === 'ALL' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">PWD</p><p className="text-lg font-bold">{residentInsightsTotals.pwdFamilies}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Students</p><p className="text-lg font-bold">{residentInsightsTotals.studentFamilies}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Indigent</p><p className="text-lg font-bold">{residentInsightsTotals.indigentFamilies}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Senior</p><p className="text-lg font-bold">{residentInsightsTotals.seniorFamilies}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Other</p><p className="text-lg font-bold">{residentInsightsTotals.otherFamilies}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Families</p><p className="text-lg font-bold">{residentInsightsTotals.totalFamilies}</p></CardContent></Card>
                </div>
              )}

              {familyCategory === 'STUDENT' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Elementary</p><p className="text-lg font-bold">{residentInsightsTotals.studentElementaryCount}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">High School</p><p className="text-lg font-bold">{residentInsightsTotals.studentHighSchoolCount}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Senior High School</p><p className="text-lg font-bold">{residentInsightsTotals.studentSeniorHighSchoolCount}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">College</p><p className="text-lg font-bold">{residentInsightsTotals.studentCollegeCount}</p></CardContent></Card>
                  <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Not Student</p><p className="text-lg font-bold">{residentInsightsTotals.notStudentCount}</p></CardContent></Card>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barangay</TableHead>
                      <TableHead className="text-right">Total Families</TableHead>
                      {familyCategory === 'ALL' ? (
                        <>
                          <TableHead className="text-right">PWD</TableHead>
                          <TableHead className="text-right">Students</TableHead>
                          <TableHead className="text-right">Indigent</TableHead>
                          <TableHead className="text-right">Senior</TableHead>
                          <TableHead className="text-right">Other</TableHead>
                        </>
                      ) : familyCategory === 'STUDENT' ? (
                        <>
                          <TableHead className="text-right">Elementary</TableHead>
                          <TableHead className="text-right">High School</TableHead>
                          <TableHead className="text-right">Senior High</TableHead>
                          <TableHead className="text-right">College</TableHead>
                          <TableHead className="text-right">Not Student</TableHead>
                        </>
                      ) : (
                        <TableHead className="text-right">{getCategoryLabel(familyCategory)} Families</TableHead>
                      )}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyStatsLoading ? (
                      <TableRow>
                        <TableCell colSpan={familyCategory === 'ALL' || familyCategory === 'STUDENT' ? 8 : 4} className="text-center py-8 text-gray-600">Loading...</TableCell>
                      </TableRow>
                    ) : filteredFamilyStatsRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={familyCategory === 'ALL' || familyCategory === 'STUDENT' ? 8 : 4} className="text-center py-8 text-gray-600">No matching barangays found.</TableCell>
                      </TableRow>
                    ) : (
                      filteredFamilyStatsRows.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-gray-500">{row.code}</div>
                          </TableCell>
                          <TableCell className="text-right">{row.totalFamilies || 0}</TableCell>
                          {familyCategory === 'ALL' ? (
                            <>
                              <TableCell className="text-right font-semibold">{row.pwdFamilies || 0}</TableCell>
                              <TableCell className="text-right font-semibold">{row.studentFamilies || 0}</TableCell>
                              <TableCell className="text-right font-semibold">{row.indigentFamilies || 0}</TableCell>
                              <TableCell className="text-right font-semibold">{row.seniorFamilies || 0}</TableCell>
                              <TableCell className="text-right font-semibold">{row.otherFamilies || 0}</TableCell>
                            </>
                          ) : familyCategory === 'STUDENT' ? (
                            <>
                              <TableCell className="text-right font-semibold">{row.studentElementaryCount || 0}</TableCell>
                              <TableCell className="text-right font-semibold">{row.studentHighSchoolCount || 0}</TableCell>
                              <TableCell className="text-right font-semibold">{row.studentSeniorHighSchoolCount || 0}</TableCell>
                              <TableCell className="text-right font-semibold">{row.studentCollegeCount || 0}</TableCell>
                              <TableCell className="text-right font-semibold">{row.notStudentCount || 0}</TableCell>
                            </>
                          ) : (
                            <TableCell className="text-right font-semibold">{getFamilyMatchesCount(row)}</TableCell>
                          )}
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={getFamilyMatchesCount(row) === 0}
                              onClick={() => openFamilyDetails(row)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>ID No.</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Barangay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ID Card</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                    <TableCell>
                      {user.idFilePath ? (
                        <img
                          src={user.idFilePath}
                          alt={`${user.firstName} ${user.lastName}`}
                          className="h-10 w-10 rounded object-cover border"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">No image</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {user.mswdoSequence != null
                        ? formatMswdoId(user.mswdoSequence)
                        : '—'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`text-white ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.barangay?.name || 'N/A'}</TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <UserX className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!canGenerateIdCard(user.role, user.isActive)}
                        title={
                          !canGenerateIdCard(user.role, user.isActive)
                            ? 'Only approved residents can receive an ID card'
                            : 'Generate ID card PDF (photo blank)'
                        }
                        onClick={() => handleGenerateIdCard(user)}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {listModule !== 'residentInsights' && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={fetchUsers}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          )}

          {/* Edit User Dialog */}
          <Dialog open={showEditUser} onOpenChange={(open) => {
            setShowEditUser(open)
            if (!open) {
              resetUserForm()
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditUser} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-firstName">First Name</Label>
                    <Input
                      id="edit-firstName"
                      value={userForm.firstName}
                      onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-lastName">Last Name</Label>
                    <Input
                      id="edit-lastName"
                      value={userForm.lastName}
                      onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                {userForm.role === 'RESIDENT' && (
                  <div>
                    <Label htmlFor="edit-mswdo">MSWDO ID</Label>
                    <Input
                      id="edit-mswdo"
                      readOnly
                      className="font-mono bg-muted"
                      value={
                        selectedUser?.mswdoSequence != null
                          ? formatMswdoId(selectedUser.mswdoSequence)
                          : 'Not assigned yet — saved on next update'
                      }
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="BARANGAY">Barangay Manager</SelectItem>
                      <SelectItem value="RESIDENT">Resident</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(userForm.role === 'BARANGAY' || userForm.role === 'RESIDENT') && (
                  <div>
                    <Label htmlFor="edit-barangayId">Barangay</Label>
                    <Select value={userForm.barangayId} onValueChange={(value) => setUserForm({ ...userForm, barangayId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Barangay" />
                      </SelectTrigger>
                      <SelectContent>
                        {barangays.map((barangay) => (
                          <SelectItem key={barangay.id} value={barangay.id}>
                            {barangay.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {userForm.role === 'RESIDENT' && (
                  <div className="flex items-center space-x-2">
                    <input
                      id="edit-isActive"
                      type="checkbox"
                      checked={userForm.isActive}
                      onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="edit-isActive" className="cursor-pointer">
                      Account active (approved resident)
                    </Label>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Resident Image (Camera Only)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => startCameraCapture('idFilePath')}
                    disabled={uploadingId}
                  >
                    Open Camera (Permission Required)
                  </Button>
                  {userForm.idFilePath && (
                    <p className="text-xs text-green-600 break-all">Saved: {userForm.idFilePath}</p>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditUser(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update User</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showCreateConfirm}
        onOpenChange={setShowCreateConfirm}
        onConfirm={confirmCreateUser}
        title="Create User"
        description={`Are you sure you want to create a new ${userForm.role.toLowerCase()} user with email ${userForm.email}?`}
        action="create"
        loading={loading}
      />

      <ConfirmationDialog
        open={showUpdateConfirm}
        onOpenChange={setShowUpdateConfirm}
        onConfirm={confirmUpdateUser}
        title="Update User"
        description={`Are you sure you want to update ${selectedUser?.firstName} ${selectedUser?.lastName}'s information?`}
        action="update"
        loading={loading}
      />

      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={confirmDeleteUser}
        title="Deactivate User"
        description={`Are you sure you want to deactivate ${selectedUser?.firstName} ${selectedUser?.lastName}? This action can be reversed later.`}
        action="delete"
        loading={loading}
      />

      <Dialog
        open={showCameraDialog}
        onOpenChange={(open) => {
          if (!open) stopCamera()
          else setShowCameraDialog(open)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture ID Image</DialogTitle>
            <DialogDescription>
              Allow camera permission, then capture a clear photo.
            </DialogDescription>
          </DialogHeader>
          {cameraDevices.length > 0 && (
            <div className="space-y-1">
              <Label>Camera Device</Label>
              <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameraDevices.map((device, index) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <video ref={videoRef} className="w-full aspect-video min-h-[240px] rounded-md bg-black object-cover" autoPlay playsInline muted />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={stopCamera}>
              Cancel
            </Button>
            <Button type="button" onClick={captureFromCamera}>
              Capture Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFamilyDetails} onOpenChange={setShowFamilyDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBarangayForFamilies?.name || 'Barangay'} - {getCategoryLabel(familyCategory)} Families
            </DialogTitle>
            <DialogDescription>
              Families matching the selected category.
            </DialogDescription>
          </DialogHeader>
          {familyDetailsLoading ? (
            <div className="py-8 text-center text-gray-600">Loading families...</div>
          ) : familyDetails.length === 0 ? (
            <div className="py-8 text-center text-gray-600">No matching families found.</div>
          ) : (
            <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-auto pr-1 sm:pr-2">
              {familyDetails.map((fam: any) => {
                const matchingMembers = (fam.members || []).filter((m: any) => {
                  if (familyCategory === 'PWD') return !!m.isPWD
                  if (familyCategory === 'STUDENT') return !!m.isStudent
                  if (familyCategory === 'INDIGENT') return !!m.isIndigent
                  if (familyCategory === 'SENIOR') return !!m.isSeniorCitizen
                  if (familyCategory === 'OTHER') {
                    return !(m.isPWD || m.isStudent || m.isIndigent || m.isSeniorCitizen)
                  }
                  return true
                })

                return (
                  <div key={fam.id} className="border rounded-lg p-3 sm:p-4 space-y-2">
                    <div className="text-sm sm:text-base">
                      <span className="font-semibold">Head name:</span>{' '}
                      <span>{fam.head?.firstName} {fam.head?.lastName}</span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed">
                      <span className="font-semibold">Address:</span>{' '}
                      <span>{fam.address || 'N/A'}</span>
                    </div>
                    <div className="pt-1">
                      <div className="text-sm font-semibold text-gray-800 mb-1">
                        {getCategoryListLabel(familyCategory)}:
                      </div>
                      {matchingMembers.length === 0 ? (
                        <span className="text-xs text-gray-500">No matching members in this family.</span>
                      ) : (
                        <ol className="list-decimal pl-5 space-y-1">
                          {matchingMembers.map((m: any) => (
                            <li key={m.id} className="text-sm text-gray-800">
                              {m.name}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

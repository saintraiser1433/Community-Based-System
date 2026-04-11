'use client'

import { useState, useEffect } from 'react'
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
  const [listModule, setListModule] = useState<'staff' | 'residents'>('staff')
  const [barangayFilter, setBarangayFilter] = useState<string>('all')
  
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
  
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'RESIDENT',
    barangayId: '',
    isActive: true
  })

  useEffect(() => {
    fetchUsers()
    fetchBarangays()
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      fetchUsers(1)
    }, 400)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, listModule, barangayFilter])

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
      isActive: true
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
      isActive: user.isActive
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
              setListModule(v as 'staff' | 'residents')
              setCurrentPage(1)
            }}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
              <TabsTrigger value="staff">Staff (Admin & Barangay)</TabsTrigger>
              <TabsTrigger value="residents">Residents</TabsTrigger>
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
          </Tabs>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
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
            <Button type="button" variant="secondary" onClick={() => fetchUsers(1)}>
              Refresh
            </Button>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
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
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {user.role === 'RESIDENT' && user.mswdoSequence != null
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={fetchUsers}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />

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
    </div>
  )
}

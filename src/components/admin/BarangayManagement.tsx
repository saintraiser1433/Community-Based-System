'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Search, MapPin, Users, Calendar } from 'lucide-react'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import Pagination from '@/components/ui/pagination'
import toast from 'react-hot-toast'

interface Barangay {
  id: string
  name: string
  code: string
  description: string
  isActive: boolean
  manager?: {
    firstName: string
    lastName: string
    email: string
  }
  _count?: {
    residents: number
    schedules: number
  }
  createdAt: string
}

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export default function BarangayManagement() {
  const [barangays, setBarangays] = useState<Barangay[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateBarangay, setShowCreateBarangay] = useState(false)
  const [showEditBarangay, setShowEditBarangay] = useState(false)
  const [selectedBarangay, setSelectedBarangay] = useState<Barangay | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10
  const [barangayForm, setBarangayForm] = useState({
    name: '',
    code: '',
    description: ''
  })

  useEffect(() => {
    fetchBarangays()
    fetchUsers()
  }, [])

  // Handle search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      fetchBarangays(1)
    }, 500) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const fetchBarangays = async (page = currentPage) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      params.append('page', page.toString())
      params.append('limit', itemsPerPage.toString())
      
      const response = await fetch(`/api/admin/barangays?${params}`)
      if (response.ok) {
        const data = await response.json()
        setBarangays(data.barangays || data)
        if (data.pagination) {
          setTotalPages(data.pagination.pages)
          setTotalItems(data.pagination.total)
          setCurrentPage(page)
        }
      }
    } catch (error) {
      console.error('Error fetching barangays:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?role=BARANGAY')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const getAvailableManagers = () => {
    // Get all barangay managers
    const allManagers = users.filter(user => user.role === 'BARANGAY')
    
    // Get managers already assigned to other barangays
    const assignedManagerIds = barangays
      .filter(barangay => barangay.manager?.id)
      .map(barangay => barangay.manager?.id)
    
    // Filter out already assigned managers
    return allManagers.filter(manager => !assignedManagerIds.includes(manager.id))
  }

  const getAvailableManagersForEdit = () => {
    // Get all barangay managers
    const allManagers = users.filter(user => user.role === 'BARANGAY')
    
    // Get managers already assigned to other barangays (excluding current barangay)
    const assignedManagerIds = barangays
      .filter(barangay => barangay.manager?.id && barangay.id !== selectedBarangay?.id)
      .map(barangay => barangay.manager?.id)
    
    // Filter out already assigned managers, but include current manager if any
    return allManagers.filter(manager => 
      !assignedManagerIds.includes(manager.id) || 
      manager.id === selectedBarangay?.manager?.id
    )
  }

  const handleCreateBarangay = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const formData = {
        name: barangayForm.name,
        code: barangayForm.code,
        description: barangayForm.description
      }
      
      const response = await fetch('/api/admin/barangays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setShowCreateBarangay(false)
        setBarangayForm({ name: '', code: '', description: '' })
        fetchBarangays()
        toast.success('Barangay created successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create barangay')
      }
    } catch (error) {
      console.error('Error creating barangay:', error)
      toast.error('An error occurred while creating barangay')
    }
  }

  const handleEditBarangay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBarangay) return
    
    try {
      const formData = {
        name: barangayForm.name,
        code: barangayForm.code,
        description: barangayForm.description
      }
      
      const response = await fetch(`/api/admin/barangays/${selectedBarangay.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        setShowEditBarangay(false)
        setSelectedBarangay(null)
        setBarangayForm({ name: '', code: '', description: '' })
        fetchBarangays()
        toast.success('Barangay updated successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update barangay')
      }
    } catch (error) {
      console.error('Error updating barangay:', error)
      toast.error('An error occurred while updating barangay')
    }
  }

  const handleDeleteBarangay = async (barangayId: string) => {
    if (!confirm('Are you sure you want to deactivate this barangay?')) return
    
    try {
      const response = await fetch(`/api/admin/barangays/${barangayId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchBarangays()
        toast.success('Barangay deactivated successfully!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to deactivate barangay')
      }
    } catch (error) {
      console.error('Error deactivating barangay:', error)
      toast.error('An error occurred while deactivating barangay')
    }
  }

  const resetBarangayForm = () => {
    setBarangayForm({
      name: '',
      code: '',
      description: ''
    })
    setSelectedBarangay(null)
  }

  const openCreateBarangay = () => {
    resetBarangayForm()
    setShowCreateBarangay(true)
  }

  const openEditBarangay = (barangay: Barangay) => {
    setSelectedBarangay(barangay)
    setBarangayForm({
      name: barangay.name,
      code: barangay.code,
      description: barangay.description
    })
    setShowEditBarangay(true)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Barangay Management</CardTitle>
              <CardDescription>
                Manage barangays and assign managers
              </CardDescription>
            </div>
            <Dialog open={showCreateBarangay} onOpenChange={(open) => {
              setShowCreateBarangay(open)
              if (!open) resetBarangayForm()
            }}>
              <DialogTrigger asChild>
                <Button onClick={openCreateBarangay}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Barangay
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Barangay</DialogTitle>
                  <DialogDescription>
                    Add a new barangay to the system
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBarangay} className="space-y-6">
                  <div>
                    <Label htmlFor="name">Barangay Name</Label>
                    <Input
                      id="name"
                      value={barangayForm.name}
                      onChange={(e) => setBarangayForm({ ...barangayForm, name: e.target.value })}
                      placeholder="Enter barangay name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Barangay Code</Label>
                    <Input
                      id="code"
                      value={barangayForm.code}
                      onChange={(e) => setBarangayForm({ ...barangayForm, code: e.target.value })}
                      placeholder="Enter unique code (e.g., BRG001)"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={barangayForm.description}
                      onChange={(e) => setBarangayForm({ ...barangayForm, description: e.target.value })}
                      placeholder="Enter description"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateBarangay(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Barangay</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search barangays..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={fetchBarangays}>Search</Button>
          </div>

          {/* Barangays Table */}
          {isLoading ? (
            <div className="text-center py-8">Loading barangays...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Residents</TableHead>
                  <TableHead>Schedules</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barangays.map((barangay) => (
                  <TableRow key={barangay.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{barangay.name}</div>
                        {barangay.description && (
                          <div className="text-sm text-gray-500">{barangay.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{barangay.code}</Badge>
                    </TableCell>
                    <TableCell>
                      {barangay.manager ? (
                        <div>
                          <div className="font-medium">{barangay.manager.firstName} {barangay.manager.lastName}</div>
                          <div className="text-sm text-gray-500">{barangay.manager.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No Manager</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{barangay._count?.residents || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{barangay._count?.schedules || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {barangay.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openEditBarangay(barangay)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteBarangay(barangay.id)}
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
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={fetchBarangays}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />

          {/* Edit Barangay Dialog */}
          <Dialog open={showEditBarangay} onOpenChange={(open) => {
            setShowEditBarangay(open)
            if (!open) {
              resetBarangayForm()
            }
          }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Barangay</DialogTitle>
                <DialogDescription>
                  Update barangay information
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditBarangay} className="space-y-6">
                <div>
                  <Label htmlFor="edit-name">Barangay Name</Label>
                  <Input
                    id="edit-name"
                    value={barangayForm.name}
                    onChange={(e) => setBarangayForm({ ...barangayForm, name: e.target.value })}
                    placeholder="Enter barangay name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-code">Barangay Code</Label>
                  <Input
                    id="edit-code"
                    value={barangayForm.code}
                    onChange={(e) => setBarangayForm({ ...barangayForm, code: e.target.value })}
                    placeholder="Enter unique code (e.g., BRG001)"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={barangayForm.description}
                    onChange={(e) => setBarangayForm({ ...barangayForm, description: e.target.value })}
                    placeholder="Enter description"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowEditBarangay(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Barangay</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}

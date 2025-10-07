'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CheckCircle, XCircle, User, MapPin, Calendar, Mail, Phone, Eye, FileText } from 'lucide-react'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import Pagination from '@/components/ui/pagination'
import toast from 'react-hot-toast'

interface PendingRegistration {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  idFilePath?: string
  createdAt: string
  barangay?: {
    name: string
    code: string
  }
}

export default function PendingRegistrations() {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectConfirm, setShowRejectConfirm] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    fetchPendingRegistrations()
  }, [])

  const fetchPendingRegistrations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/pending-registrations')
      if (response.ok) {
        const data = await response.json()
        setRegistrations(data)
      }
    } catch (error) {
      console.error('Error fetching pending registrations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Pagination helper functions
  const getPaginatedData = (data: PendingRegistration[], page: number, itemsPerPage: number) => {
    const startIndex = (page - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (data: PendingRegistration[], itemsPerPage: number) => {
    return Math.ceil(data.length / itemsPerPage)
  }

  const openApproveConfirm = (registration: PendingRegistration) => {
    setSelectedRegistration(registration)
    setShowApproveConfirm(true)
  }

  const openRejectConfirm = (registration: PendingRegistration) => {
    setSelectedRegistration(registration)
    setShowRejectConfirm(true)
  }

  const openDetailsModal = (registration: PendingRegistration) => {
    setSelectedRegistration(registration)
    setShowDetailsModal(true)
  }

  const confirmApprove = async () => {
    if (!selectedRegistration) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/pending-registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedRegistration.id, action: 'approve' })
      })
      
      if (response.ok) {
        await fetchPendingRegistrations()
        toast.success('Registration approved successfully')
        setShowApproveConfirm(false)
        setSelectedRegistration(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to approve registration')
      }
    } catch (error) {
      console.error('Error approving registration:', error)
      toast.error('An error occurred while approving registration')
    } finally {
      setLoading(false)
    }
  }

  const confirmReject = async () => {
    if (!selectedRegistration) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/pending-registrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedRegistration.id, action: 'reject' })
      })
      
      if (response.ok) {
        await fetchPendingRegistrations()
        toast.success('Registration rejected successfully')
        setShowRejectConfirm(false)
        setSelectedRegistration(null)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to reject registration')
      }
    } catch (error) {
      console.error('Error rejecting registration:', error)
      toast.error('An error occurred while rejecting registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Resident Registrations</CardTitle>
          <CardDescription>
            Review and approve new resident registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading pending registrations...</div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Registrations</h3>
              <p className="text-gray-600">All resident registrations have been processed.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Barangay</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getPaginatedData(registrations, currentPage, itemsPerPage).map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {registration.firstName} {registration.lastName}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{registration.email}</span>
                        </div>
                        {registration.phone && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{registration.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {registration.barangay ? (
                        <div>
                          <div className="font-medium">{registration.barangay.name}</div>
                          <div className="text-sm text-gray-500">{registration.barangay.code}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No Barangay</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(registration.createdAt).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Pending Approval
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openDetailsModal(registration)}
                          className="text-blue-600 hover:text-blue-700 border-blue-600 hover:border-blue-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => openApproveConfirm(registration)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openRejectConfirm(registration)}
                          className="text-red-600 hover:text-red-700 border-red-600 hover:border-red-700"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {registrations.length > itemsPerPage && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={getTotalPages(registrations, itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={registrations.length}
                itemsPerPage={itemsPerPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Confirmation Dialog */}
      <ConfirmationDialog
        open={showApproveConfirm}
        onOpenChange={setShowApproveConfirm}
        onConfirm={confirmApprove}
        title="Approve Registration"
        description={`Are you sure you want to approve the registration for ${selectedRegistration?.firstName} ${selectedRegistration?.lastName}? This will activate their account.`}
        action="create"
        loading={loading}
      />

      {/* Rejection Confirmation Dialog */}
      <ConfirmationDialog
        open={showRejectConfirm}
        onOpenChange={setShowRejectConfirm}
        onConfirm={confirmReject}
        title="Reject Registration"
        description={`Are you sure you want to reject the registration for ${selectedRegistration?.firstName} ${selectedRegistration?.lastName}? This action cannot be undone and will permanently delete their account.`}
        action="delete"
        loading={loading}
      />

      {/* Registration Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Registration Details</span>
            </DialogTitle>
            <DialogDescription>
              Review the registration details and uploaded ID for {selectedRegistration?.firstName} {selectedRegistration?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRegistration && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-sm">{selectedRegistration.firstName} {selectedRegistration.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm">{selectedRegistration.email}</p>
                    </div>
                    {selectedRegistration.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-sm">{selectedRegistration.phone}</p>
                      </div>
                    )}
                    {selectedRegistration.address && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="text-sm">{selectedRegistration.address}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Barangay Information</h3>
                  <div className="space-y-3">
                    {selectedRegistration.barangay ? (
                      <>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Barangay</label>
                          <p className="text-sm">{selectedRegistration.barangay.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Barangay Code</label>
                          <p className="text-sm">{selectedRegistration.barangay.code}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">No barangay information</p>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Registration Date</label>
                      <p className="text-sm">{new Date(selectedRegistration.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ID Document */}
              {selectedRegistration.idFilePath && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Uploaded ID Document</span>
                  </h3>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-center">
                      {selectedRegistration.idFilePath.toLowerCase().includes('.pdf') ? (
                        <div className="text-center">
                          <FileText className="h-16 w-16 text-red-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">PDF Document</p>
                          <a 
                            href={selectedRegistration.idFilePath} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            View PDF Document
                          </a>
                        </div>
                      ) : (
                        <div className="text-center">
                          <img 
                            src={selectedRegistration.idFilePath} 
                            alt="Uploaded ID" 
                            className="max-w-full max-h-96 object-contain rounded-lg border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                          <div className="hidden">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Image not available</p>
                            <a 
                              href={selectedRegistration.idFilePath} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm underline"
                            >
                              View Image
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setShowDetailsModal(false)
                    openRejectConfirm(selectedRegistration)
                  }}
                  variant="outline"
                  className="text-red-600 hover:text-red-700 border-red-600 hover:border-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  onClick={() => {
                    setShowDetailsModal(false)
                    openApproveConfirm(selectedRegistration)
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

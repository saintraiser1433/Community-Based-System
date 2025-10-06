'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, XCircle, User, MapPin, Calendar, Mail, Phone } from 'lucide-react'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import toast from 'react-hot-toast'

interface PendingRegistration {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
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
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null)
  const [loading, setLoading] = useState(false)

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

  const openApproveConfirm = (registration: PendingRegistration) => {
    setSelectedRegistration(registration)
    setShowApproveConfirm(true)
  }

  const openRejectConfirm = (registration: PendingRegistration) => {
    setSelectedRegistration(registration)
    setShowRejectConfirm(true)
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
                {registrations.map((registration) => (
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
    </div>
  )
}

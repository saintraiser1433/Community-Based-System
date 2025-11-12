'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CheckCircle, XCircle, User, MapPin, Calendar, Mail, Phone, Eye, FileText, GraduationCap, Home, Briefcase, Heart, Download } from 'lucide-react'
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
  idBackFilePath?: string
  createdAt: string
  barangay?: {
    name: string
    code: string
  }
  // Personal Information
  gender?: string | null
  dateOfBirth?: string | Date | null
  purok?: string | null
  municipality?: string | null
  // Residency Category
  residencyCategory?: string | null
  // Educational Background
  educationalAttainment?: string | null
  lastSchoolAttended?: string | null
  yearLastAttended?: string | null
  // Household Information
  numberOfHouseholdMembers?: number | null
  numberOfDependents?: number | null
  isHeadOfFamily?: boolean | null
  housingType?: string | null
  barangayCertificatePath?: string | null
  // Occupational and Income Information
  sourceOfIncome?: string | null
  employmentType?: string | null
  estimatedAnnualIncome?: string | null
  lowIncomeCertPath?: string | null
  employmentCertPath?: string | null
  businessPermitPath?: string | null
  // Civil and Social Status
  maritalStatus?: string | null
  marriageContractPath?: string | null
  soloParentIdPath?: string | null
  seniorCitizenIdPath?: string | null
  pwdIdPath?: string | null
  ipCertificatePath?: string | null
  schoolIdPath?: string | null
  outOfSchoolYouthCertPath?: string | null
  // Supporting Documents
  barangayClearancePath?: string | null
  certificateOfIndigencyPath?: string | null
  proofOfResidencyPath?: string | null
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

  // Helper function to format enum values
  const formatEnum = (value: string | null | undefined): string => {
    if (!value) return 'Not provided'
    return value
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Helper function to format date
  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'Not provided'
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Helper function to format income range
  const formatIncome = (value: string | null | undefined): string => {
    if (!value) return 'Not provided'
    const incomeMap: Record<string, string> = {
      'BELOW_50000': 'Below ₱50,000',
      'BETWEEN_50000_100000': '₱50,000 – ₱100,000',
      'BETWEEN_100001_200000': '₱100,001 – ₱200,000',
      'ABOVE_200000': '₱200,001 and above'
    }
    return incomeMap[value] || formatEnum(value)
  }

  // Helper function to render document
  const renderDocument = (filePath: string | null | undefined, label: string) => {
    if (!filePath) return null
    
    const isPDF = filePath.toLowerCase().includes('.pdf')
    
    return (
      <div className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start space-x-2 flex-1 min-w-0">
            <FileText className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <span className="text-sm font-medium break-words">{label}</span>
          </div>
        </div>
        <div className="mt-3">
          {isPDF ? (
            <div className="text-center py-4 bg-white rounded border">
              <FileText className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-xs text-gray-600 mb-2">PDF Document</p>
              <a 
                href={filePath} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs flex items-center justify-center space-x-1 underline"
              >
                <Download className="h-3 w-3" />
                <span>Open PDF</span>
              </a>
            </div>
          ) : (
            <div className="relative">
              <img 
                src={filePath} 
                alt={label}
                className="w-full max-h-48 object-contain rounded border bg-white"
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = `
                      <div class="text-center py-4 bg-white rounded border">
                        <p class="text-xs text-gray-600 mb-2">Image not available</p>
                        <a href="${filePath}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 text-xs flex items-center justify-center space-x-1 underline">
                          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                          </svg>
                          <span>View File</span>
                        </a>
                      </div>
                    `
                  }
                }}
              />
              <a 
                href={filePath} 
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute bottom-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center space-x-1 hover:bg-blue-700 opacity-0 hover:opacity-100 transition-opacity"
              >
                <Download className="h-3 w-3" />
                <span>View</span>
              </a>
            </div>
          )}
        </div>
      </div>
    )
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
        setShowDetailsModal(false)
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
        setShowDetailsModal(false)
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
        <DialogContent 
          className="max-h-[90vh] overflow-y-auto"
          style={{ width: '90vw', maxWidth: '1400px' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Registration Details</span>
            </DialogTitle>
            <DialogDescription>
              Review all registration details and uploaded documents for {selectedRegistration?.firstName} {selectedRegistration?.lastName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRegistration && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>A. Personal Information</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-sm font-medium">{selectedRegistration.firstName} {selectedRegistration.lastName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Sex / Gender</label>
                      <p className="text-sm">{formatEnum(selectedRegistration.gender)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                      <p className="text-sm">{formatDate(selectedRegistration.dateOfBirth)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Complete Address</label>
                      <p className="text-sm">
                        {[selectedRegistration.purok, selectedRegistration.barangay?.name, selectedRegistration.municipality]
                          .filter(Boolean)
                          .join(', ') || selectedRegistration.address || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm">{selectedRegistration.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact Number</label>
                      <p className="text-sm">{selectedRegistration.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>B. Residency Category</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Residency Category</label>
                      <p className="text-sm">{formatEnum(selectedRegistration.residencyCategory)}</p>
                    </div>
                    {selectedRegistration.barangay && (
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
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Registration Date</label>
                      <p className="text-sm">{new Date(selectedRegistration.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Educational Background */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <GraduationCap className="h-5 w-5" />
                  <span>C. Educational Background</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Highest Educational Attainment</label>
                    <p className="text-sm">{formatEnum(selectedRegistration.educationalAttainment)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last School Attended</label>
                    <p className="text-sm">{selectedRegistration.lastSchoolAttended || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Year Last Attended</label>
                    <p className="text-sm">{selectedRegistration.yearLastAttended || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Household Information */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Home className="h-5 w-5" />
                  <span>D. Household Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Number of Household Members</label>
                    <p className="text-sm">{selectedRegistration.numberOfHouseholdMembers || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Number of Dependents</label>
                    <p className="text-sm">{selectedRegistration.numberOfDependents || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Head of Family</label>
                    <p className="text-sm">{selectedRegistration.isHeadOfFamily ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Housing Type</label>
                    <p className="text-sm">{formatEnum(selectedRegistration.housingType)}</p>
                  </div>
                </div>
              </div>

              {/* Occupational and Income Information */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Briefcase className="h-5 w-5" />
                  <span>E. Occupational and Income Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Source of Income</label>
                    <p className="text-sm">{selectedRegistration.sourceOfIncome || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Employment Type</label>
                    <p className="text-sm">{formatEnum(selectedRegistration.employmentType)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Estimated Annual Income</label>
                    <p className="text-sm">{formatIncome(selectedRegistration.estimatedAnnualIncome)}</p>
                  </div>
                </div>
              </div>

              {/* Civil and Social Status */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Heart className="h-5 w-5" />
                  <span>F. Civil and Social Status</span>
                </h3>
                <div>
                  <label className="text-sm font-medium text-gray-500">Marital Status</label>
                  <p className="text-sm">{formatEnum(selectedRegistration.maritalStatus)}</p>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Uploaded Documents</span>
                </h3>
                
                {/* Collect all documents that have file paths */}
                {(() => {
                  const documents = [
                    { path: selectedRegistration.idFilePath, label: 'Valid ID - Front' },
                    { path: selectedRegistration.idBackFilePath, label: 'Valid ID - Back' },
                    { path: selectedRegistration.barangayCertificatePath, label: 'Barangay Certificate of Residency' },
                    { path: selectedRegistration.barangayClearancePath, label: 'Barangay Clearance' },
                    { path: selectedRegistration.certificateOfIndigencyPath, label: 'Certificate of Indigency' },
                    { path: selectedRegistration.lowIncomeCertPath, label: 'Certificate of Low Income' },
                    { path: selectedRegistration.employmentCertPath, label: 'Certificate of Employment / Payslip' },
                    { path: selectedRegistration.businessPermitPath, label: 'Business Permit' },
                    { path: selectedRegistration.marriageContractPath, label: 'Marriage Contract' },
                    { path: selectedRegistration.soloParentIdPath, label: 'Solo Parent ID' },
                    { path: selectedRegistration.seniorCitizenIdPath, label: 'Senior Citizen ID' },
                    { path: selectedRegistration.pwdIdPath, label: 'PWD ID' },
                    { path: selectedRegistration.ipCertificatePath, label: 'IP Certificate / Tribal Certificate' },
                    { path: selectedRegistration.schoolIdPath, label: 'School ID / Certificate of Enrollment' },
                    { path: selectedRegistration.outOfSchoolYouthCertPath, label: 'Out-of-School Youth Certificate' },
                    { path: selectedRegistration.proofOfResidencyPath, label: 'Proof of Residency' },
                  ].filter(doc => doc.path) // Only include documents that have a path
                  
                  if (documents.length === 0) {
                    return (
                      <div className="text-center py-8 border rounded-lg bg-gray-50">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No documents uploaded</p>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {documents.map((doc, index) => (
                        <div key={index}>
                          {renderDocument(doc.path, doc.label)}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

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

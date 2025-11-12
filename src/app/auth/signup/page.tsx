'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Eye, EyeOff, ArrowLeft, UserPlus, CalendarIcon, Upload, FileText } from 'lucide-react'
import Image from 'next/image'
import { format } from 'date-fns'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    gender: '',
    dateOfBirth: null as Date | null,
    purok: '',
    municipality: '',
    barangayId: '',
    
    // Residency Category
    residencyCategory: '',
    
    // Educational Background
    educationalAttainment: '',
    lastSchoolAttended: '',
    yearLastAttended: '',
    
    // Household Information
    numberOfHouseholdMembers: '',
    numberOfDependents: '',
    isHeadOfFamily: false,
    housingType: '',
    
    // Occupational and Income Information
    sourceOfIncome: '',
    employmentType: '',
    estimatedAnnualIncome: '',
    
    // Civil and Social Status
    maritalStatus: '',
  })

  const [barangays, setBarangays] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // File uploads
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({
    idFront: null,
    idBack: null,
    barangayCertificate: null,
    lowIncomeCert: null,
    employmentCert: null,
    businessPermit: null,
    marriageContract: null,
    soloParentId: null,
    seniorCitizenId: null,
    pwdId: null,
    ipCertificate: null,
    schoolId: null,
    outOfSchoolYouthCert: null,
    barangayClearance: null,
    certificateOfIndigency: null,
    proofOfResidency: null,
  })
  
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFilePaths, setUploadedFilePaths] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    fetchBarangays()
  }, [])

  const fetchBarangays = async () => {
    try {
      const response = await fetch('/api/barangays')
      if (response.ok) {
        const data = await response.json()
        setBarangays(data)
      }
    } catch (error) {
      console.error('Error fetching barangays:', error)
    } finally {
      setIsLoadingBarangays(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 11) value = value.substring(0, 11)
    if (value.length > 4) value = value.substring(0, 4) + ' ' + value.substring(4)
    if (value.length > 8) value = value.substring(0, 8) + ' ' + value.substring(8)
    setFormData(prev => ({ ...prev, phone: value }))
  }

  const handleFileChange = (fieldName: string, file: File | null) => {
    setSelectedFiles(prev => ({ ...prev, [fieldName]: file }))
    setError('')
  }

  const uploadFile = async (file: File, fieldName: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('field', fieldName)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const data = await response.json()
      setUploadedFilePaths(prev => ({ ...prev, [fieldName]: data.filePath }))
      return data.filePath
    } else {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Upload failed')
    }
  }

  const uploadAllFiles = async () => {
    setIsUploading(true)
    const paths: Record<string, string> = {}
    
    try {
      for (const [fieldName, file] of Object.entries(selectedFiles)) {
        if (file) {
          const path = await uploadFile(file, fieldName)
          paths[fieldName] = path
        }
      }
      return paths
    } catch (error) {
      console.error('File upload error:', error)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setIsLoading(false)
      return
    }

    const cleanPhone = formData.phone.replace(/\D/g, '')
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('09')) {
      setError('Please enter a valid Philippine mobile number (09XXXXXXXXX)')
      setIsLoading(false)
      return
    }

    if (!formData.barangayId) {
      setError('Please select a barangay')
      setIsLoading(false)
      return
    }

    if (!selectedFiles.idFront) {
      setError('Please upload a valid ID (front) as proof of identity')
      setIsLoading(false)
      return
    }

    try {
      // Upload all files
      const filePaths = await uploadAllFiles()
      
      // Prepare registration data - convert empty strings to null for optional fields
      const registrationData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        barangayId: formData.barangayId,
        role: 'RESIDENT',
        
        // Personal Information
        gender: formData.gender || null,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth.toISOString() : null,
        purok: formData.purok || null,
        municipality: formData.municipality || null,
        
        // Residency Category
        residencyCategory: formData.residencyCategory || null,
        
        // Educational Background
        educationalAttainment: formData.educationalAttainment || null,
        lastSchoolAttended: formData.lastSchoolAttended || null,
        yearLastAttended: formData.yearLastAttended || null,
        
        // Household Information
        numberOfHouseholdMembers: formData.numberOfHouseholdMembers || null,
        numberOfDependents: formData.numberOfDependents || null,
        isHeadOfFamily: formData.isHeadOfFamily,
        housingType: formData.housingType || null,
        
        // Occupational and Income Information
        sourceOfIncome: formData.sourceOfIncome || null,
        employmentType: formData.employmentType || null,
        estimatedAnnualIncome: formData.estimatedAnnualIncome || null,
        
        // Civil and Social Status
        maritalStatus: formData.maritalStatus || null,
        
        // File paths - only include if file was uploaded
        idFilePath: filePaths.idFront || null,
        idBackFilePath: filePaths.idBack || null,
        barangayCertificatePath: filePaths.barangayCertificate || null,
        lowIncomeCertPath: filePaths.lowIncomeCert || null,
        employmentCertPath: filePaths.employmentCert || null,
        businessPermitPath: filePaths.businessPermit || null,
        marriageContractPath: filePaths.marriageContract || null,
        soloParentIdPath: filePaths.soloParentId || null,
        seniorCitizenIdPath: filePaths.seniorCitizenId || null,
        pwdIdPath: filePaths.pwdId || null,
        ipCertificatePath: filePaths.ipCertificate || null,
        schoolIdPath: filePaths.schoolId || null,
        outOfSchoolYouthCertPath: filePaths.outOfSchoolYouthCert || null,
        barangayClearancePath: filePaths.barangayClearance || null,
        certificateOfIndigencyPath: filePaths.certificateOfIndigency || null,
        proofOfResidencyPath: filePaths.proofOfResidency || null,
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        const data = await response.json()
        const errorMsg = data.error || 'Registration failed'
        const details = data.details ? ` Details: ${data.details}` : ''
        setError(`${errorMsg}${details}`)
        console.error('Registration error:', data)
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <UserPlus className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Your account has been created. Please wait for admin approval before signing in.
              </p>
              <Button onClick={() => router.push('/auth/signin')} className="bg-pink-500 hover:bg-pink-600">
                Go to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center text-pink-500 hover:text-pink-600 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Image src="/glanlogos.png" alt="Glan Logo" width={32} height={32} className="h-8 w-8" />
            <span className="text-2xl font-bold text-gray-900">MSWDO-GLAN CBDS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register as Resident</h1>
          <p className="text-gray-600">Complete the form below to register in the Community-Based Donation System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resident Registration</CardTitle>
            <CardDescription>
              Please provide accurate and complete information. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="residency">Residency</TabsTrigger>
                  <TabsTrigger value="education">Education</TabsTrigger>
                  <TabsTrigger value="household">Household</TabsTrigger>
                  <TabsTrigger value="occupation">Occupation</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                {/* Personal Information Tab */}
                <TabsContent value="personal" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">A. Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Full Name - First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="Enter your first name"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Full Name - Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Enter your last name"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gender">Sex / Gender *</Label>
                      <Select value={formData.gender} onValueChange={(value) => handleSelectChange('gender', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.dateOfBirth ? format(formData.dateOfBirth, 'PPP') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.dateOfBirth || undefined}
                            onSelect={(date) => setFormData({ ...formData, dateOfBirth: date || null })}
                            initialFocus
                            disabled={(date) => date > new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Complete Address *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        id="purok"
                        name="purok"
                        placeholder="Purok/Sitio"
                        value={formData.purok}
                        onChange={handleChange}
                        required
                      />
                      <Select value={formData.barangayId} onValueChange={(value) => handleSelectChange('barangayId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingBarangays ? "Loading..." : "Select Barangay"} />
                        </SelectTrigger>
                        <SelectContent>
                          {barangays.map((barangay: any) => (
                            <SelectItem key={barangay.id} value={barangay.id}>
                              {barangay.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="municipality"
                        name="municipality"
                        placeholder="Municipality"
                        value={formData.municipality}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Number / Active Mobile Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="09XX XXX XXXX"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      required
                    />
                    <p className="text-xs text-gray-500">Enter your mobile number for SMS notifications</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Residency Category Tab */}
                <TabsContent value="residency" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">B. Residency Category</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="residencyCategory">Residency Category *</Label>
                    <Select value={formData.residencyCategory} onValueChange={(value) => handleSelectChange('residencyCategory', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select residency category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BONAFIDE_RESIDENT">Bonafide Resident</SelectItem>
                        <SelectItem value="BONAFIDE_RESIDENT_IP">Bonafide Resident (Indigenous People - IP)</SelectItem>
                        <SelectItem value="TRANSIENT_RESIDENT">Transient Resident</SelectItem>
                        <SelectItem value="TRANSFERRED_RESIDENT">Transferred Resident</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Barangay staff may request verification if your residency is less than 6 months.
                    </p>
                  </div>
                </TabsContent>

                {/* Educational Background Tab */}
                <TabsContent value="education" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">C. Educational Background</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="educationalAttainment">Highest Educational Attainment *</Label>
                    <Select value={formData.educationalAttainment} onValueChange={(value) => handleSelectChange('educationalAttainment', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select educational attainment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NO_FORMAL_EDUCATION">No Formal Education</SelectItem>
                        <SelectItem value="ELEMENTARY_LEVEL">Elementary Level</SelectItem>
                        <SelectItem value="ELEMENTARY_GRADUATE">Elementary Graduate</SelectItem>
                        <SelectItem value="HIGH_SCHOOL_LEVEL">High School Level</SelectItem>
                        <SelectItem value="HIGH_SCHOOL_GRADUATE">High School Graduate</SelectItem>
                        <SelectItem value="SENIOR_HIGH_SCHOOL">Senior High School</SelectItem>
                        <SelectItem value="VOCATIONAL_TESDA">Vocational / TESDA Graduate</SelectItem>
                        <SelectItem value="COLLEGE_LEVEL">College Level</SelectItem>
                        <SelectItem value="COLLEGE_GRADUATE">College Graduate</SelectItem>
                        <SelectItem value="POST_GRADUATE">Post-Graduate (Master's / Doctorate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lastSchoolAttended">Name of Last School Attended (Optional)</Label>
                      <Input
                        id="lastSchoolAttended"
                        name="lastSchoolAttended"
                        placeholder="Enter school name"
                        value={formData.lastSchoolAttended}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearLastAttended">Year Last Attended (Optional)</Label>
                      <Input
                        id="yearLastAttended"
                        name="yearLastAttended"
                        placeholder="e.g., 2020"
                        value={formData.yearLastAttended}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Household Information Tab */}
                <TabsContent value="household" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">D. Household Information</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numberOfHouseholdMembers">Number of Household Members *</Label>
                      <Input
                        id="numberOfHouseholdMembers"
                        name="numberOfHouseholdMembers"
                        type="number"
                        min="1"
                        placeholder="Enter number"
                        value={formData.numberOfHouseholdMembers}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numberOfDependents">Number of Dependents *</Label>
                      <Input
                        id="numberOfDependents"
                        name="numberOfDependents"
                        type="number"
                        min="0"
                        placeholder="Children, Senior Citizens, or PWDs"
                        value={formData.numberOfDependents}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="isHeadOfFamily">Head of the Family *</Label>
                      <Select 
                        value={formData.isHeadOfFamily ? 'yes' : 'no'} 
                        onValueChange={(value) => setFormData({ ...formData, isHeadOfFamily: value === 'yes' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="housingType">Housing Type *</Label>
                      <Select value={formData.housingType} onValueChange={(value) => handleSelectChange('housingType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select housing type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OWNED">Owned</SelectItem>
                          <SelectItem value="RENTED">Rented</SelectItem>
                          <SelectItem value="SHARED">Shared</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Occupational and Income Information Tab */}
                <TabsContent value="occupation" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">E. Occupational and Income Information</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sourceOfIncome">Source of Income *</Label>
                    <Input
                      id="sourceOfIncome"
                      name="sourceOfIncome"
                      placeholder="e.g., Farming, Self-Employed, Government Employee, etc."
                      value={formData.sourceOfIncome}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employmentType">Employment Type *</Label>
                      <Select value={formData.employmentType} onValueChange={(value) => handleSelectChange('employmentType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PERMANENT">Permanent</SelectItem>
                          <SelectItem value="CONTRACTUAL">Contractual</SelectItem>
                          <SelectItem value="PART_TIME">Part-time</SelectItem>
                          <SelectItem value="SEASONAL">Seasonal</SelectItem>
                          <SelectItem value="UNEMPLOYED">Unemployed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedAnnualIncome">Estimated Annual Income *</Label>
                      <Select value={formData.estimatedAnnualIncome} onValueChange={(value) => handleSelectChange('estimatedAnnualIncome', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select income range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BELOW_50000">Below ₱50,000</SelectItem>
                          <SelectItem value="BETWEEN_50000_100000">₱50,000 – ₱100,000</SelectItem>
                          <SelectItem value="BETWEEN_100001_200000">₱100,001 – ₱200,000</SelectItem>
                          <SelectItem value="ABOVE_200000">₱200,001 and above</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">F. Civil and Social Status</h4>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Marital Status *</Label>
                    <Select value={formData.maritalStatus} onValueChange={(value) => handleSelectChange('maritalStatus', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select marital status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE">Single</SelectItem>
                        <SelectItem value="MARRIED">Married</SelectItem>
                        <SelectItem value="WIDOWED">Widowed</SelectItem>
                        <SelectItem value="SOLO_PARENT">Solo Parent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Required Documents</h3>
                    <p className="text-sm text-gray-600">Upload clear photos or scanned copies of the following documents</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="idFront">Valid ID - Front *</Label>
                      <Input
                        id="idFront"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange('idFront', e.target.files?.[0] || null)}
                        required
                      />
                      <p className="text-xs text-gray-500">National ID, Voter's ID, or Barangay ID (Front)</p>
                      {selectedFiles.idFront && (
                        <p className="text-xs text-green-600">Selected: {selectedFiles.idFront.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="idBack">Valid ID - Back</Label>
                      <Input
                        id="idBack"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange('idBack', e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-gray-500">National ID, Voter's ID, or Barangay ID (Back)</p>
                      {selectedFiles.idBack && (
                        <p className="text-xs text-green-600">Selected: {selectedFiles.idBack.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="barangayCertificate">Barangay Certificate of Residency</Label>
                      <Input
                        id="barangayCertificate"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange('barangayCertificate', e.target.files?.[0] || null)}
                      />
                      {selectedFiles.barangayCertificate && (
                        <p className="text-xs text-green-600">Selected: {selectedFiles.barangayCertificate.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="barangayClearance">Barangay Clearance (Latest)</Label>
                      <Input
                        id="barangayClearance"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange('barangayClearance', e.target.files?.[0] || null)}
                      />
                      {selectedFiles.barangayClearance && (
                        <p className="text-xs text-green-600">Selected: {selectedFiles.barangayClearance.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="certificateOfIndigency">Certificate of Indigency (if applicable)</Label>
                      <Input
                        id="certificateOfIndigency"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange('certificateOfIndigency', e.target.files?.[0] || null)}
                      />
                      {selectedFiles.certificateOfIndigency && (
                        <p className="text-xs text-green-600">Selected: {selectedFiles.certificateOfIndigency.name}</p>
                      )}
                    </div>

                    {/* Conditional documents based on income */}
                    {formData.estimatedAnnualIncome === 'BELOW_50000' && (
                      <div className="space-y-2">
                        <Label htmlFor="lowIncomeCert">Certificate of Low Income</Label>
                        <Input
                          id="lowIncomeCert"
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileChange('lowIncomeCert', e.target.files?.[0] || null)}
                        />
                        {selectedFiles.lowIncomeCert && (
                          <p className="text-xs text-green-600">Selected: {selectedFiles.lowIncomeCert.name}</p>
                        )}
                      </div>
                    )}

                    {/* Conditional documents based on employment */}
                    {(formData.employmentType === 'PERMANENT' || formData.employmentType === 'CONTRACTUAL' || formData.employmentType === 'PART_TIME') && (
                      <div className="space-y-2">
                        <Label htmlFor="employmentCert">Certificate of Employment or Payslip</Label>
                        <Input
                          id="employmentCert"
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileChange('employmentCert', e.target.files?.[0] || null)}
                        />
                        {selectedFiles.employmentCert && (
                          <p className="text-xs text-green-600">Selected: {selectedFiles.employmentCert.name}</p>
                        )}
                      </div>
                    )}

                    {/* Conditional documents for self-employed */}
                    {formData.sourceOfIncome?.toLowerCase().includes('business') && (
                      <div className="space-y-2">
                        <Label htmlFor="businessPermit">Business Permit</Label>
                        <Input
                          id="businessPermit"
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileChange('businessPermit', e.target.files?.[0] || null)}
                        />
                        {selectedFiles.businessPermit && (
                          <p className="text-xs text-green-600">Selected: {selectedFiles.businessPermit.name}</p>
                        )}
                      </div>
                    )}

                    {/* Conditional documents based on marital status */}
                    {formData.maritalStatus === 'MARRIED' && (
                      <div className="space-y-2">
                        <Label htmlFor="marriageContract">Marriage Contract</Label>
                        <Input
                          id="marriageContract"
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileChange('marriageContract', e.target.files?.[0] || null)}
                        />
                        {selectedFiles.marriageContract && (
                          <p className="text-xs text-green-600">Selected: {selectedFiles.marriageContract.name}</p>
                        )}
                      </div>
                    )}

                    {formData.maritalStatus === 'SOLO_PARENT' && (
                      <div className="space-y-2">
                        <Label htmlFor="soloParentId">Solo Parent ID</Label>
                        <Input
                          id="soloParentId"
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileChange('soloParentId', e.target.files?.[0] || null)}
                        />
                        {selectedFiles.soloParentId && (
                          <p className="text-xs text-green-600">Selected: {selectedFiles.soloParentId.name}</p>
                        )}
                      </div>
                    )}

                    {/* Special sector documents */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Special Sector Documents (if applicable)</Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="seniorCitizenId">Senior Citizen ID</Label>
                      <Input
                        id="seniorCitizenId"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange('seniorCitizenId', e.target.files?.[0] || null)}
                      />
                      {selectedFiles.seniorCitizenId && (
                        <p className="text-xs text-green-600">Selected: {selectedFiles.seniorCitizenId.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pwdId">PWD ID</Label>
                      <Input
                        id="pwdId"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange('pwdId', e.target.files?.[0] || null)}
                      />
                      {selectedFiles.pwdId && (
                        <p className="text-xs text-green-600">Selected: {selectedFiles.pwdId.name}</p>
                      )}
                    </div>

                    {formData.residencyCategory === 'BONAFIDE_RESIDENT_IP' && (
                      <div className="space-y-2">
                        <Label htmlFor="ipCertificate">Certificate of Indigency / Tribal Certificate</Label>
                        <Input
                          id="ipCertificate"
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={(e) => handleFileChange('ipCertificate', e.target.files?.[0] || null)}
                        />
                        {selectedFiles.ipCertificate && (
                          <p className="text-xs text-green-600">Selected: {selectedFiles.ipCertificate.name}</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="schoolId">School ID or Certificate of Enrollment (if Student)</Label>
                      <Input
                        id="schoolId"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange('schoolId', e.target.files?.[0] || null)}
                      />
                      {selectedFiles.schoolId && (
                        <p className="text-xs text-green-600">Selected: {selectedFiles.schoolId.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="outOfSchoolYouthCert">Certificate from Barangay or DSWD (if Out-of-School Youth)</Label>
                      <Input
                        id="outOfSchoolYouthCert"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange('outOfSchoolYouthCert', e.target.files?.[0] || null)}
                      />
                      {selectedFiles.outOfSchoolYouthCert && (
                        <p className="text-xs text-green-600">Selected: {selectedFiles.outOfSchoolYouthCert.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="proofOfResidency">Proof of Residency (Optional but recommended)</Label>
                      <Input
                        id="proofOfResidency"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(e) => handleFileChange('proofOfResidency', e.target.files?.[0] || null)}
                      />
                      {selectedFiles.proofOfResidency && (
                        <p className="text-xs text-green-600">Selected: {selectedFiles.proofOfResidency.name}</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="submit" className="bg-pink-500 hover:bg-pink-600" disabled={isLoading || isUploading}>
                  {isLoading ? 'Submitting...' : isUploading ? 'Uploading Files...' : 'Submit Registration'}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/signin" className="text-pink-500 hover:text-pink-600 font-medium">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

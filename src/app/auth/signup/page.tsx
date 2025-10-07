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
import { Eye, EyeOff, ArrowLeft, UserPlus } from 'lucide-react'
import Image from 'next/image'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    barangayId: ''
  })
  const [barangays, setBarangays] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFilePath, setUploadedFilePath] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchBarangays()
  }, [])

  const fetchBarangays = async () => {
    try {
      console.log('Fetching barangays...')
      const response = await fetch('/api/barangays')
      console.log('Barangays response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Barangays data:', data)
        setBarangays(data)
      } else {
        const errorData = await response.json()
        console.error('Failed to fetch barangays:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error fetching barangays:', error)
    } finally {
      setIsLoadingBarangays(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError('')
    }
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setUploadedFilePath(data.filePath)
        return data.filePath
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }
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

    console.log('Form data:', formData)

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

    if (!formData.barangayId) {
      setError('Please select a barangay')
      setIsLoading(false)
      return
    }

    if (!selectedFile) {
      setError('Please upload a valid ID as proof of barangay residence')
      setIsLoading(false)
      return
    }

    try {
      console.log('Uploading ID file...')
      const filePath = await uploadFile(selectedFile)
      
      console.log('Submitting registration...')
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          idFilePath: filePath,
          role: 'RESIDENT'
        }),
      })

      console.log('Registration response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Registration success:', data)
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        const data = await response.json()
        console.error('Registration failed:', data)
        setError(data.error || 'Registration failed')
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
                Your account has been created. You can now sign in with your credentials.
              </p>
              <Button onClick={() => router.push('/auth/signin')} className="bg-pink-500 hover:bg-pink-600 text-sm sm:text-base">
                Go to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/" className="inline-flex items-center text-pink-500 hover:text-pink-600 mb-4 text-sm sm:text-base">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Image src="/glanlogos.png" alt="Glan Logo" width={32} height={32} className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="text-lg sm:text-2xl font-bold text-gray-900">MSWDO-GLAN CBDS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Register as Resident</h1>
          <p className="text-sm sm:text-base text-gray-600">Create your MSWDO-GLAN account to access donation schedules</p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg sm:text-xl">Resident Registration</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Fill out the form below to register as a resident
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Enter your last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Enter your full address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barangayId">Barangay</Label>
                <Select value={formData.barangayId} onValueChange={(value) => setFormData({ ...formData, barangayId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingBarangays ? "Loading barangays..." : "Select your barangay"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingBarangays ? (
                      <SelectItem value="loading" disabled>Loading barangays...</SelectItem>
                    ) : barangays.length === 0 ? (
                      <SelectItem value="no-data" disabled>No barangays available</SelectItem>
                    ) : (
                      barangays.map((barangay: any) => (
                        <SelectItem key={barangay.id} value={barangay.id}>
                          {barangay.name} ({barangay.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idFile">Valid ID (Required)</Label>
                <div className="space-y-2">
                  <Input
                    id="idFile"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    required
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Upload a valid ID (JPEG, PNG, or PDF) as proof of barangay residence. Maximum file size: 5MB.
                  </p>
                  {selectedFile && (
                    <div className="text-xs text-green-600">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-sm sm:text-base" disabled={isLoading || isUploading}>
                {isLoading ? 'Creating Account...' : isUploading ? 'Uploading ID...' : 'Register as Resident'}
              </Button>
            </form>

            <div className="mt-4 sm:mt-6 text-center">
              <p className="text-xs sm:text-sm text-gray-600">
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

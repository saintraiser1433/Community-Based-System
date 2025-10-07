'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Smartphone, 
  Save, 
  TestTube, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SMSSettings {
  id: string
  username: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function SMSSettings() {
  const [settings, setSettings] = useState<SMSSettings | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/sms-settings')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings(data.settings)
          setUsername(data.settings.username)
          setIsActive(data.settings.isActive)
        }
      }
    } catch (error) {
      console.error('Error fetching SMS settings:', error)
      toast.error('Failed to load SMS settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!username || !password) {
      toast.error('Please enter both username and password')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/sms-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          isActive
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        toast.success('SMS settings saved successfully!')
        setPassword('') // Clear password for security
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to save SMS settings')
      }
    } catch (error) {
      console.error('Error saving SMS settings:', error)
      toast.error('Failed to save SMS settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    if (!username || !password) {
      toast.error('Please enter both username and password')
      return
    }

    setIsTesting(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/admin/sms-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password
        }),
      })

      const data = await response.json()
      setTestResult({
        success: data.success,
        message: data.message
      })

      if (data.success) {
        toast.success('SMS connection test successful!')
      } else {
        toast.error(data.message || 'SMS connection test failed')
      }
    } catch (error) {
      console.error('Error testing SMS connection:', error)
      setTestResult({
        success: false,
        message: 'Failed to test SMS connection'
      })
      toast.error('Failed to test SMS connection')
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SMS settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          <Smartphone className="h-6 w-6" />
          <span>SMS Gateway Settings</span>
        </h2>
        <p className="text-gray-600">Configure Android SMS Gateway for sending notifications</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Gateway Configuration</span>
          </CardTitle>
          <CardDescription>
            Enter your Android SMS Gateway credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter SMS gateway username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter SMS gateway password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Enable SMS Gateway</Label>
          </div>

          {settings && (
            <div className="text-sm text-gray-500">
              <p>Last updated: {new Date(settings.updatedAt).toLocaleString()}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving || !username || !password}
              className="flex-1 sm:flex-none"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>

            <Button
              onClick={handleTest}
              disabled={isTesting || !username || !password}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>

          {testResult && (
            <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                {testResult.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About SMS Gateway</CardTitle>
          <CardDescription>
            Information about the Android SMS Gateway integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>
              The Android SMS Gateway allows the system to send SMS notifications to residents 
              about donation schedules, claim confirmations, and other important updates.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Test your connection before enabling the gateway</li>
              <li>Keep your credentials secure and don't share them</li>
              <li>Monitor SMS delivery through the gateway dashboard</li>
              <li>Contact your SMS provider for support if needed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

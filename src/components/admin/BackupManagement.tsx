'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { 
  Database, 
  Download, 
  Trash2, 
  Upload, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Backup {
  name: string
  filename: string
  size: number
  createdAt: string
  modifiedAt: string
}

export default function BackupManagement() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateBackup, setShowCreateBackup] = useState(false)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)
  const [backupName, setBackupName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    try {
      const response = await fetch('/api/admin/backup')
      if (response.ok) {
        const data = await response.json()
        setBackups(data.backups)
      }
    } catch (error) {
      console.error('Error fetching backups:', error)
    }
  }

  const handleCreateBackup = async () => {
    if (!backupName.trim()) {
      toast.error('Please enter a backup name')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: backupName.trim() })
      })

      if (response.ok) {
        toast.success('Database backup created successfully')
        setShowCreateBackup(false)
        setBackupName('')
        await fetchBackups()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create backup')
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      toast.error('An error occurred while creating backup')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadBackup = async (backup: Backup) => {
    try {
      const response = await fetch(`/api/admin/backup/${backup.filename}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = backup.filename
        link.click()
        window.URL.revokeObjectURL(url)
        toast.success('Backup downloaded successfully')
      } else {
        toast.error('Failed to download backup')
      }
    } catch (error) {
      console.error('Error downloading backup:', error)
      toast.error('An error occurred while downloading backup')
    }
  }

  const handleDeleteBackup = async () => {
    if (!selectedBackup) return

    try {
      const response = await fetch(`/api/admin/backup/${selectedBackup.filename}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Backup deleted successfully')
        setShowDeleteConfirm(false)
        setSelectedBackup(null)
        await fetchBackups()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete backup')
      }
    } catch (error) {
      console.error('Error deleting backup:', error)
      toast.error('An error occurred while deleting backup')
    }
  }

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupName: selectedBackup.name })
      })

      if (response.ok) {
        toast.success('Database restored successfully. Please refresh the page.')
        setShowRestoreConfirm(false)
        setSelectedBackup(null)
        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to restore backup')
      }
    } catch (error) {
      console.error('Error restoring backup:', error)
      toast.error('An error occurred while restoring backup')
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">Database Backup & Restore</h2>
          <p className="text-sm text-gray-600">Manage database backups and restore from previous states</p>
        </div>
        <div className="flex justify-end">
          <Dialog open={showCreateBackup} onOpenChange={setShowCreateBackup}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Database className="h-4 w-4 mr-2" />
                Create Backup
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">Create Database Backup</DialogTitle>
              <DialogDescription className="text-sm">
                Create a backup of the current database state
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="backupName" className="text-sm">Backup Name</Label>
                <Input
                  id="backupName"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  placeholder="Enter backup name"
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateBackup(false)}
                  className="w-full sm:w-auto text-sm"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateBackup} 
                  disabled={isLoading}
                  className="w-full sm:w-auto text-sm"
                >
                  {isLoading ? 'Creating...' : 'Create Backup'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Backups</CardTitle>
          <CardDescription>
            Manage your database backups. You can download, restore, or delete backups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No backups available</p>
              <p className="text-sm text-gray-400">Create your first backup to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div key={backup.name} className="border rounded-lg overflow-hidden">
                  <div className="p-4">
                    <div className="flex flex-col space-y-3">
                      {/* Backup Info */}
                      <div className="flex items-start space-x-3">
                        <Database className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm truncate">{backup.name}</h3>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-xs text-gray-500 mt-1">
                            <span>{formatFileSize(backup.size)}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="break-all sm:break-normal">{formatDate(backup.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadBackup(backup)}
                          className="flex-1 sm:flex-none text-xs h-8"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBackup(backup)
                            setShowRestoreConfirm(true)
                          }}
                          className="flex-1 sm:flex-none text-orange-600 hover:text-orange-700 text-xs h-8"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBackup(backup)
                            setShowDeleteConfirm(true)
                          }}
                          className="flex-1 sm:flex-none text-red-600 hover:text-red-700 text-xs h-8"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <ConfirmationDialog
        open={showRestoreConfirm}
        onOpenChange={setShowRestoreConfirm}
        onConfirm={handleRestoreBackup}
        title="Restore Database"
        description={`Are you sure you want to restore the database from "${selectedBackup?.name}"? This will replace the current database with the backup. A backup of the current database will be created before restoration.`}
        action="restore"
        loading={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDeleteBackup}
        title="Delete Backup"
        description={`Are you sure you want to delete the backup "${selectedBackup?.name}"? This action cannot be undone.`}
        action="delete"
        loading={false}
      />
    </div>
  )
}

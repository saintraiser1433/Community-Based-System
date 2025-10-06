import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { backupName } = await request.json()
    
    if (!backupName) {
      return NextResponse.json({ error: 'Backup name is required' }, { status: 400 })
    }

    const backupsDir = path.join(process.cwd(), 'backups')
    const backupPath = path.join(backupsDir, `${backupName}.db`)
    
    // Check if backup file exists
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 })
    }

    // Get the database file path from DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 })
    }

    // Extract database file path from SQLite URL
    const dbPath = databaseUrl.replace('file:', '').replace('?schema=public', '')
    
    // Create a backup of current database before restore
    const currentBackupPath = path.join(backupsDir, `pre_restore_${Date.now()}.db`)
    fs.copyFileSync(dbPath, currentBackupPath)
    
    // Restore from backup
    fs.copyFileSync(backupPath, dbPath)
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DATABASE_RESTORED',
        details: `Restored database from backup: ${backupName}`
      }
    })

    return NextResponse.json({ 
      message: 'Database restored successfully',
      restoredFrom: backupName,
      currentBackup: `pre_restore_${Date.now()}.db`
    })
  } catch (error) {
    console.error('Error restoring database:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

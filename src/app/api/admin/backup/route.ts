import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name } = await request.json()
    const backupName = name || `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`
    
    // Create backups directory if it doesn't exist
    const backupsDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
    }

    const backupPath = path.join(backupsDir, `${backupName}.db`)
    
    // Get the database file path from DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json({ error: 'Database URL not configured' }, { status: 500 })
    }

    // Extract database file path from SQLite URL
    const dbPath = databaseUrl.replace('file:', '').replace('?schema=public', '')
    
    // Copy the database file
    fs.copyFileSync(dbPath, backupPath)
    
    // Get file stats
    const stats = fs.statSync(backupPath)
    
    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DATABASE_BACKUP_CREATED',
        details: `Created database backup: ${backupName}`
      }
    })

    return NextResponse.json({ 
      message: 'Database backup created successfully',
      backup: {
        name: backupName,
        path: backupPath,
        size: stats.size,
        createdAt: stats.birthtime
      }
    })
  } catch (error) {
    console.error('Error creating database backup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // List all backup files
    const backupsDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ backups: [] })
    }

    const files = fs.readdirSync(backupsDir)
    const backups = files
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupsDir, file)
        const stats = fs.statSync(filePath)
        return {
          name: file.replace('.db', ''),
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ backups })
  } catch (error) {
    console.error('Error listing database backups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

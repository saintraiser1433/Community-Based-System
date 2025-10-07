import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { testSMSConnection } from '@/lib/sms'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get SMS settings
    const smsSettings = await prisma.sMSSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!smsSettings) {
      return NextResponse.json({ 
        settings: null,
        message: 'No SMS settings configured'
      })
    }

    // Return settings without password for security
    return NextResponse.json({
      settings: {
        id: smsSettings.id,
        username: smsSettings.username,
        isActive: smsSettings.isActive,
        createdAt: smsSettings.createdAt,
        updatedAt: smsSettings.updatedAt
      }
    })

  } catch (error) {
    console.error('Error fetching SMS settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { username, password, isActive = false } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Check if SMS settings already exist
    const existingSettings = await prisma.sMSSettings.findFirst()
    
    let smsSettings
    if (existingSettings) {
      // Update existing settings
      smsSettings = await prisma.sMSSettings.update({
        where: { id: existingSettings.id },
        data: {
          username,
          password,
          isActive
        }
      })
    } else {
      // Create new settings
      smsSettings = await prisma.sMSSettings.create({
        data: {
          username,
          password,
          isActive
        }
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SMS_SETTINGS_UPDATED',
        details: `Updated SMS settings for username: ${username}`
      }
    })

    return NextResponse.json({
      success: true,
      settings: {
        id: smsSettings.id,
        username: smsSettings.username,
        isActive: smsSettings.isActive,
        createdAt: smsSettings.createdAt,
        updatedAt: smsSettings.updatedAt
      }
    })

  } catch (error) {
    console.error('Error updating SMS settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

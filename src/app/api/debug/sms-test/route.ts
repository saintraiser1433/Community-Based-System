import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendScheduleNotificationToResidents } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { barangayId } = await request.json()

    if (!barangayId) {
      return NextResponse.json({ error: 'Barangay ID is required' }, { status: 400 })
    }

    // Get barangay info
    const barangay = await prisma.barangay.findUnique({
      where: { id: barangayId }
    })

    if (!barangay) {
      return NextResponse.json({ error: 'Barangay not found' }, { status: 404 })
    }

    // Get residents in the barangay
    const residents = await prisma.user.findMany({
      where: {
        barangayId: barangayId,
        role: 'RESIDENT',
        isActive: true,
        phone: { not: null }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true
      }
    })

    // Get SMS settings
    const smsSettings = await prisma.sMSSettings.findFirst({
      where: { isActive: true }
    })

    // Test SMS notification
    const testResult = await sendScheduleNotificationToResidents({
      title: 'TEST SMS NOTIFICATION',
      message: 'This is a test SMS to verify the notification system is working.',
      scheduleId: 'test-schedule-id',
      barangayId: barangayId
    })

    return NextResponse.json({
      success: true,
      debug: {
        barangay: {
          id: barangay.id,
          name: barangay.name,
          code: barangay.code
        },
        residents: {
          total: residents.length,
          withPhones: residents.filter(r => r.phone).length,
          list: residents.map(r => ({
            name: `${r.firstName} ${r.lastName}`,
            phone: r.phone
          }))
        },
        smsSettings: {
          exists: !!smsSettings,
          isActive: smsSettings?.isActive,
          hasUsername: !!smsSettings?.username,
          hasPassword: !!smsSettings?.password
        },
        testResult
      }
    })

  } catch (error: any) {
    console.error('Debug SMS test error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

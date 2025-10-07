import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendClaimReminderNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'BARANGAY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { scheduleId } = await request.json()

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    // Get user's barangay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { barangay: true }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    // Verify the schedule belongs to the user's barangay
    const schedule = await prisma.donationSchedule.findFirst({
      where: {
        id: scheduleId,
        barangayId: user.barangayId
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Send reminder notifications
    const reminderResult = await sendClaimReminderNotification(scheduleId, user.barangayId)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'REMINDER_SENT',
        details: `Sent reminder notifications for schedule: ${schedule.title}`
      }
    })

    return NextResponse.json({
      success: reminderResult.success,
      message: reminderResult.success 
        ? `Reminder sent to ${reminderResult.sentCount} residents`
        : 'Failed to send reminders',
      details: reminderResult
    })

  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

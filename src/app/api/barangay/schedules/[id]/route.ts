import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendScheduleCancellationNotification } from '@/lib/notifications'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'BARANGAY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user's barangay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { barangay: true }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    const { id } = await params

    const schedule = await prisma.donationSchedule.findFirst({
      where: {
        id,
        barangayId: user.barangayId
      },
      include: {
        claims: {
          include: {
            family: {
              include: {
                head: true
              }
            }
          }
        }
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    return NextResponse.json(schedule)
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'BARANGAY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, description, date, startTime, endTime, location, maxRecipients, status, targetClassification, type } = await request.json()

    // Check if this is a status-only update (for Mark as Distributed/Cancel actions)
    const isStatusOnlyUpdate = !title && !description && !date && !startTime && !endTime && !location && status

    if (!isStatusOnlyUpdate) {
      // Validate required fields for full updates
      if (!title || !description || !date || !startTime || !endTime || !location) {
        return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
      }

      // Validate date - must be today or future
      const scheduleDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of today
      
      if (scheduleDate < today) {
        return NextResponse.json({ 
          error: 'Schedule date cannot be in the past. Please select today or a future date.' 
        }, { status: 400 })
      }
    }

    // Get user's barangay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { barangay: true }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    const { id } = await params

    // Check if schedule exists and belongs to user's barangay
    const existingSchedule = await prisma.donationSchedule.findFirst({
      where: {
        id,
        barangayId: user.barangayId
      }
    })

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Update the schedule
    const updateData = isStatusOnlyUpdate 
      ? { status } // Only update status for status-only updates
      : {
          title,
          description,
          date: date ? new Date(date) : undefined,
          startTime,
          endTime,
          location,
          maxRecipients: maxRecipients ? parseInt(maxRecipients) : null,
          status,
          targetClassification: targetClassification && targetClassification !== 'all' ? targetClassification : null,
          type: type || 'GENERAL'
        }

    const schedule = await prisma.donationSchedule.update({
      where: { id },
      data: updateData
    })

    // Send SMS notification if schedule is cancelled
    if (isStatusOnlyUpdate && status === 'CANCELLED') {
      try {
        console.log('Sending SMS cancellation notification...')
        const notificationResult = await sendScheduleCancellationNotification(
          schedule.id,
          user.barangayId,
          'Schedule has been cancelled'
        )

        if (notificationResult.success) {
          console.log(`SMS cancellation notifications sent successfully to ${notificationResult.sentCount} residents`)
        } else {
          console.error('SMS cancellation notifications failed:', notificationResult.errors)
        }
      } catch (smsError) {
        console.error('Error sending SMS cancellation notifications:', smsError)
        // Don't fail the update if SMS fails
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: isStatusOnlyUpdate ? 'SCHEDULE_STATUS_UPDATED' : 'SCHEDULE_UPDATED',
        details: isStatusOnlyUpdate 
          ? `Updated schedule status to: ${status}` 
          : `Updated donation schedule: ${title}`
      }
    })

    return NextResponse.json({ 
      message: 'Schedule updated successfully', 
      schedule,
      smsNotification: (isStatusOnlyUpdate && status === 'CANCELLED') ? {
        sent: true,
        message: 'SMS cancellation notifications sent to residents'
      } : undefined
    })
  } catch (error) {
    console.error('Error updating schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'BARANGAY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user's barangay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { barangay: true }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    const { id } = await params

    // Check if schedule exists and belongs to user's barangay
    const schedule = await prisma.donationSchedule.findFirst({
      where: {
        id,
        barangayId: user.barangayId
      },
      include: {
        _count: {
          select: {
            claims: true
          }
        }
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    // Check if schedule has claims
    if (schedule._count.claims > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete schedule with existing claims. Change status to CANCELLED instead.' 
      }, { status: 400 })
    }

    // Send SMS cancellation notification before deleting
    try {
      console.log('Sending SMS cancellation notification...')
      const notificationResult = await sendScheduleCancellationNotification(
        schedule.id,
        user.barangayId,
        'Schedule has been cancelled'
      )

      if (notificationResult.success) {
        console.log(`SMS cancellation notifications sent successfully to ${notificationResult.sentCount} residents`)
      } else {
        console.error('SMS cancellation notifications failed:', notificationResult.errors)
      }
    } catch (smsError) {
      console.error('Error sending SMS cancellation notifications:', smsError)
      // Don't fail the deletion if SMS fails
    }

    // Delete the schedule
    await prisma.donationSchedule.delete({
      where: { id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SCHEDULE_DELETED',
        details: `Deleted donation schedule: ${schedule.title}`
      }
    })

    return NextResponse.json({ 
      message: 'Schedule deleted successfully',
      smsNotification: {
        sent: true,
        message: 'SMS cancellation notifications sent to residents'
      }
    })
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


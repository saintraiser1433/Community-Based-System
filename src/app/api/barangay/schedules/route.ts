import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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

    // Get donation schedules for the user's barangay
    const schedules = await prisma.donationSchedule.findMany({
      where: {
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
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Auto-update past schedules from SCHEDULED to DISTRIBUTED
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Start of today

    const pastScheduledSchedules = schedules.filter(schedule => 
      schedule.status === 'SCHEDULED' && 
      new Date(schedule.date) < today
    )

    if (pastScheduledSchedules.length > 0) {
      const scheduleIds = pastScheduledSchedules.map(schedule => schedule.id)
      
      await prisma.donationSchedule.updateMany({
        where: {
          id: { in: scheduleIds }
        },
        data: {
          status: 'DISTRIBUTED'
        }
      })

      // Create audit log for auto-update
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SCHEDULE_AUTO_UPDATED',
          details: `Auto-updated ${pastScheduledSchedules.length} past schedules from SCHEDULED to DISTRIBUTED`
        }
      })

      // Refetch schedules to get updated statuses
      const updatedSchedules = await prisma.donationSchedule.findMany({
        where: {
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
        },
        orderBy: {
          date: 'desc'
        }
      })

      return NextResponse.json(updatedSchedules)
    }

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Error fetching schedules:', error)
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

    if (session.user.role !== 'BARANGAY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { title, description, date, startTime, endTime, location, maxRecipients } = await request.json()

    // Validate required fields
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

    // Get user's barangay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { barangay: true }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    // Create the schedule
    const schedule = await prisma.donationSchedule.create({
      data: {
        barangayId: user.barangayId,
        title,
        description,
        date: new Date(date),
        startTime,
        endTime,
        location,
        maxRecipients: maxRecipients ? parseInt(maxRecipients) : null,
        status: 'SCHEDULED'
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SCHEDULE_CREATED',
        details: `Created donation schedule: ${title}`
      }
    })

    return NextResponse.json({ message: 'Schedule created successfully', schedule })
  } catch (error) {
    console.error('Error creating schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

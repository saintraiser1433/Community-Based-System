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

    const { searchParams } = new URL(request.url)
    const scheduleId = searchParams.get('scheduleId')

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

    // Get residents who haven't claimed this schedule
    const unclaimedResidents = await prisma.user.findMany({
      where: {
        barangayId: user.barangayId,
        role: 'RESIDENT',
        isActive: true,
        families: {
          some: {
            claims: {
              none: {
                scheduleId: scheduleId
              }
            }
          }
        }
      },
      include: {
        families: {
          include: {
            members: true
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    return NextResponse.json(unclaimedResidents)
  } catch (error) {
    console.error('Error fetching unclaimed residents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


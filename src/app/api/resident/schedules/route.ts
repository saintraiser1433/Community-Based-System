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

    if (session.user.role !== 'RESIDENT') {
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
        barangayId: user.barangayId,
        status: 'SCHEDULED'
      },
      include: {
        claims: {
          where: {
            family: {
              headId: user.id
            }
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Add claim status to each schedule
    const schedulesWithClaimStatus = schedules.map(schedule => ({
      ...schedule,
      hasClaimed: schedule.claims.length > 0
    }))

    return NextResponse.json(schedulesWithClaimStatus)
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

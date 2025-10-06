import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { scheduleId } = await request.json()

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID is required' }, { status: 400 })
    }

    // Get user's family
    const family = await prisma.family.findFirst({
      where: {
        headId: session.user.id
      }
    })

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    // Check if family has already claimed this schedule
    const existingClaim = await prisma.claim.findUnique({
      where: {
        familyId_scheduleId: {
          familyId: family.id,
          scheduleId: scheduleId
        }
      }
    })

    if (existingClaim) {
      return NextResponse.json({ error: 'Family has already claimed this donation' }, { status: 400 })
    }

    // Get the schedule
    const schedule = await prisma.donationSchedule.findUnique({
      where: { id: scheduleId }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (schedule.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Schedule is not available for claiming' }, { status: 400 })
    }

    // Create the claim
    const claim = await prisma.claim.create({
      data: {
        familyId: family.id,
        scheduleId: scheduleId,
        claimedBy: session.user.id,
        barangayId: family.barangayId,
        status: 'CLAIMED',
        notes: `Claimed by ${session.user.name}`
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DONATION_CLAIMED',
        details: `Family claimed donation: ${schedule.title}`
      }
    })

    return NextResponse.json({ message: 'Donation claimed successfully', claim })
  } catch (error) {
    console.error('Error claiming donation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

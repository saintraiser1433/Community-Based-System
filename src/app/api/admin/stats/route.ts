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

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get overall statistics
    const [
      totalUsers,
      activeUsers,
      totalBarangays,
      totalSchedules,
      totalClaims,
      upcomingSchedules
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.barangay.count(),
      prisma.donationSchedule.count(),
      prisma.claim.count(),
      prisma.donationSchedule.count({
        where: {
          date: { gt: new Date() },
          status: 'SCHEDULED'
        }
      })
    ])

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalBarangays,
      totalSchedules,
      totalClaims,
      upcomingSchedules
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

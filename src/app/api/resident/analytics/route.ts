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
      include: { 
        barangay: true,
        families: {
          include: {
            members: true,
            claims: {
              include: {
                schedule: true
              }
            }
          }
        }
      }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    // Get overview statistics
    const [
      totalClaims,
      totalSchedules,
      upcomingSchedules
    ] = await Promise.all([
      prisma.claim.count({
        where: {
          family: {
            headId: user.id
          }
        }
      }),
      prisma.donationSchedule.count({
        where: { barangayId: user.barangayId }
      }),
      prisma.donationSchedule.count({
        where: {
          barangayId: user.barangayId,
          date: { gte: new Date() },
          status: 'SCHEDULED'
        }
      })
    ])

    // Calculate claim rate
    const claimRate = totalSchedules > 0 ? Math.round((totalClaims / totalSchedules) * 100) : 0

    // Get family members count
    const familyMembers = user.families.reduce((sum, family) => sum + family.members.length, 0)

    // Calculate average wait time (mock data for now)
    const averageWaitTime = 15 // This would be calculated from actual claim data

    // Get claim history
    const claimHistory = await prisma.claim.findMany({
      where: {
        family: {
          headId: user.id
        }
      },
      include: {
        schedule: true
      },
      orderBy: { claimedAt: 'desc' },
      take: 5
    })

    // Get family statistics from database
    const familyStats = user.families.flatMap(family => 
      family.members.map(member => ({
        name: `${member.firstName} ${member.lastName}`,
        relationship: member.relationship,
        claims: family.claims.filter(claim => 
          claim.claimedByUserId === member.id
        ).length,
        lastClaim: family.claims
          .filter(claim => claim.claimedByUserId === member.id)
          .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime())[0]
          ?.claimedAt || family.createdAt
      }))
    )

    // Get monthly activity using Prisma ORM
    const userFamilies = await prisma.family.findMany({
      where: {
        headId: user.id
      },
      include: {
        claims: {
          where: {
            claimedAt: {
              gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) // 12 months ago
            }
          },
          include: {
            schedule: true
          }
        }
      }
    })

    // Group data by month
    const activityMap = new Map()
    
    userFamilies.forEach(family => {
      family.claims.forEach(claim => {
        const month = claim.claimedAt.toISOString().slice(0, 7)
        if (!activityMap.has(month)) {
          activityMap.set(month, {
            claims: 0,
            schedules: new Set()
          })
        }
        
        const activity = activityMap.get(month)
        activity.claims += 1
        activity.schedules.add(claim.schedule.id)
      })
    })

    const monthlyActivity = Array.from(activityMap.entries()).map(([month, data]) => ({
      month,
      claims: data.claims,
      schedules: data.schedules.size
    })).sort((a, b) => a.month.localeCompare(b.month))

    // Generate achievements
    const achievements = [
      {
        title: "First Claim",
        description: "Make your first donation claim",
        earned: totalClaims > 0,
        progress: totalClaims > 0 ? 100 : 0
      },
      {
        title: "Regular Participant",
        description: "Claim donations 5 times",
        earned: totalClaims >= 5,
        progress: Math.min((totalClaims / 5) * 100, 100)
      },
      {
        title: "Family Helper",
        description: "Help 3 family members claim donations",
        earned: familyMembers >= 3,
        progress: Math.min((familyMembers / 3) * 100, 100)
      },
      {
        title: "Monthly Contributor",
        description: "Claim donations for 3 consecutive months",
        earned: false, // This would need more complex logic
        progress: 0
      },
      {
        title: "Community Champion",
        description: "Claim donations 20 times",
        earned: totalClaims >= 20,
        progress: Math.min((totalClaims / 20) * 100, 100)
      }
    ]

    // Get upcoming opportunities
    const upcomingOpportunities = await prisma.donationSchedule.findMany({
      where: {
        barangayId: user.barangayId,
        date: { gte: new Date() },
        status: 'SCHEDULED'
      },
      orderBy: { date: 'asc' },
      take: 3
    })

    const analytics = {
      overview: {
        totalClaims,
        totalSchedules,
        upcomingSchedules,
        familyMembers,
        claimRate,
        averageWaitTime
      },
      claimHistory: claimHistory.map(claim => ({
        id: claim.id,
        scheduleTitle: claim.schedule.title,
        claimedAt: claim.claimedAt,
        status: claim.status,
        location: claim.schedule.location
      })),
      familyStats,
      monthlyActivity: monthlyActivity || [],
      achievements,
      upcomingOpportunities: upcomingOpportunities.map(schedule => ({
        id: schedule.id,
        title: schedule.title,
        date: schedule.date,
        location: schedule.location,
        timeSlot: `${schedule.startTime} - ${schedule.endTime}`
      }))
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error fetching resident analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

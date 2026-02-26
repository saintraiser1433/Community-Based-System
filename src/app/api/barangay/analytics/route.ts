import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('Barangay analytics API called')
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'BARANGAY') {
      console.log('User role is not BARANGAY:', session.user.role)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('User authenticated:', session.user.email, 'Role:', session.user.role)

    // Get user's barangay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { barangay: true }
    })

    if (!user?.barangayId) {
      console.log('User not assigned to a barangay')
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    console.log('User barangay ID:', user.barangayId)

    // Get overview statistics
    const [
      totalResidents,
      totalFamilyMembers,
      totalSchedules,
      totalClaims,
      upcomingSchedules
    ] = await Promise.all([
      prisma.user.count({
        where: { 
          barangayId: user.barangayId,
          role: 'RESIDENT',
          isActive: true
        }
      }),
      prisma.familyMember.count({
        where: {
          family: {
            barangayId: user.barangayId
          }
        }
      }),
      prisma.donationSchedule.count({
        where: { barangayId: user.barangayId }
      }),
      prisma.claim.count({
        where: {
          schedule: {
            barangayId: user.barangayId
          }
        }
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

    // Calculate average attendance
    const schedulesWithMaxRecipients = await prisma.donationSchedule.findMany({
      where: {
        barangayId: user.barangayId,
        maxRecipients: { not: null }
      },
      include: {
        _count: {
          select: { claims: true }
        }
      }
    })

    const averageAttendance = schedulesWithMaxRecipients.length > 0
      ? Math.round(
          schedulesWithMaxRecipients.reduce((sum, schedule) => {
            const attendance = schedule.maxRecipients 
              ? (schedule._count.claims / schedule.maxRecipients) * 100
              : 0
            return sum + attendance
          }, 0) / schedulesWithMaxRecipients.length
        )
      : 0

    // Get schedule status distribution
    const scheduleStats = await prisma.donationSchedule.groupBy({
      by: ['status'],
      where: { barangayId: user.barangayId },
      _count: { status: true }
    })

    const totalSchedulesForStats = scheduleStats.reduce((sum, stat) => sum + stat._count.status, 0)
    
    const scheduleStatusDistribution = scheduleStats.map(stat => ({
      status: stat.status,
      count: stat._count.status,
      percentage: totalSchedulesForStats > 0 
        ? Math.round((stat._count.status / totalSchedulesForStats) * 100)
        : 0
    }))

    // Get recent schedules
    const recentSchedules = await prisma.donationSchedule.findMany({
      where: { barangayId: user.barangayId },
      include: {
        _count: {
          select: { claims: true }
        }
      },
      orderBy: { date: 'desc' },
      take: 5
    })

    // Get top residents by claims
    const topResidents = await prisma.user.findMany({
      where: {
        barangayId: user.barangayId,
        role: 'RESIDENT',
        isActive: true
      },
      include: {
        families: {
          include: {
            _count: {
              select: { claims: true }
            },
            claims: {
              orderBy: { claimedAt: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    const topResidentsWithClaims = topResidents
      .map(resident => {
        const totalClaims = resident.families.reduce((sum, family) => sum + family._count.claims, 0)
        const lastClaim = resident.families
          .flatMap(family => family.claims)
          .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime())[0]
        
        return {
          id: resident.id,
          name: `${resident.firstName} ${resident.lastName}`,
          claims: totalClaims,
          lastClaim: lastClaim?.claimedAt || resident.createdAt
        }
      })
      .sort((a, b) => b.claims - a.claims)
      .slice(0, 5)

    // Get monthly trends using Prisma ORM
    const schedules = await prisma.donationSchedule.findMany({
      where: {
        barangayId: user.barangayId,
        date: {
          gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) // 12 months ago
        }
      },
      include: {
        claims: true
      }
    })

    // Group data by month
    const trendsMap = new Map()
    
    schedules.forEach(schedule => {
      const month = schedule.date.toISOString().slice(0, 7)
      if (!trendsMap.has(month)) {
        trendsMap.set(month, {
          schedules: 0,
          claims: 0,
          attendance: 0
        })
      }
      
      const trend = trendsMap.get(month)
      trend.schedules += 1
      trend.claims += schedule.claims.length
      trend.attendance = schedule.claims.length > 0 ? 100 : 0
    })

    const monthlyTrends = Array.from(trendsMap.entries()).map(([month, data]) => ({
      month,
      schedules: data.schedules,
      claims: data.claims,
      attendance: data.attendance
    })).sort((a, b) => a.month.localeCompare(b.month))

    // Calculate performance metrics
    const completedSchedules = await prisma.donationSchedule.count({
      where: {
        barangayId: user.barangayId,
        status: 'DISTRIBUTED'
      }
    })

    const scheduleCompletion = totalSchedules > 0 ? Math.round((completedSchedules / totalSchedules) * 100) : 0
    
    const residentEngagement = totalResidents > 0 
      ? Math.round((topResidentsWithClaims.filter(r => r.claims > 0).length / totalResidents) * 100)
      : 0

    const claimEfficiency = totalClaims > 0 
      ? Math.round((totalClaims / (totalSchedules * 10)) * 100) // Assuming 10 is average expected claims per schedule
      : 0

    // Get unclaimed residents (residents with no claims)
    console.log('Fetching unclaimed residents...')
    const unclaimedResidents = await prisma.user.findMany({
      where: {
        barangayId: user.barangayId,
        role: 'RESIDENT',
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('Found residents:', unclaimedResidents.length)

    const unclaimedResidentsData = unclaimedResidents.map(resident => ({
      id: resident.id,
      name: `${resident.firstName} ${resident.lastName}`,
      email: resident.email,
      phone: resident.phone || 'N/A',
      lastClaim: null,
      totalClaims: 0,
      registrationDate: resident.createdAt
    }))

    console.log('Unclaimed residents data:', unclaimedResidentsData.length)

    // Detailed population breakdown for clickable charts
    const residentsWithFamilies = await prisma.user.findMany({
      where: {
        barangayId: user.barangayId,
        role: 'RESIDENT',
        isActive: true
      },
      include: {
        families: {
          include: {
            members: true
          }
        }
      }
    })

    const populationDetails = {
      residents: residentsWithFamilies.map((resident) => ({
        id: resident.id,
        name: `${resident.firstName} ${resident.lastName}`,
        email: resident.email,
        phone: resident.phone || 'N/A',
        families: resident.families.map((family) => ({
          id: family.id,
          address: family.address,
          membersCount: family.members.length
        }))
      })),
      familyMembers: residentsWithFamilies.flatMap((resident) =>
        resident.families.flatMap((family) =>
          family.members.map((member) => ({
            id: member.id,
            name: member.name,
            relation: member.relation,
            familyId: family.id,
            familyAddress: family.address,
            headName: `${resident.firstName} ${resident.lastName}`
          }))
        )
      )
    }

    const analytics = {
      overview: {
        totalResidents,
        totalFamilyMembers,
        totalPopulation: totalResidents + totalFamilyMembers,
        totalSchedules,
        totalClaims,
        upcomingSchedules,
        claimRate,
        averageAttendance
      },
      scheduleStats: scheduleStatusDistribution,
      recentSchedules: recentSchedules.map(schedule => ({
        id: schedule.id,
        title: schedule.title,
        date: schedule.date,
        status: schedule.status,
        claims: schedule._count.claims,
        maxRecipients: schedule.maxRecipients
      })),
      topResidents: topResidentsWithClaims,
      monthlyTrends: monthlyTrends || [],
      performanceMetrics: {
        scheduleCompletion,
        residentEngagement,
        claimEfficiency
      },
      unclaimedResidents: unclaimedResidentsData,
      populationDetails
    }

    console.log('Analytics data being returned:', JSON.stringify(analytics, null, 2))
    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error fetching barangay analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

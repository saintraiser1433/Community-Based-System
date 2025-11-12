import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Analytics reports API called')
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      console.log('❌ User is not admin:', session.user.role)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('✅ Admin user authenticated:', session.user.email)

    const { searchParams } = new URL(request.url)
    const barangayId = searchParams.get('barangayId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clauses for filtering
    const userWhere: any = {}
    const scheduleWhere: any = {}
    const claimWhere: any = {}
    const barangayWhere: any = {}

    if (barangayId && barangayId !== 'all') {
      userWhere.barangayId = barangayId
      scheduleWhere.barangayId = barangayId
      claimWhere.barangayId = barangayId
      barangayWhere.id = barangayId
    }

    if (startDate || endDate) {
      const dateFilter: any = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999) // Include the entire end date
        dateFilter.lte = end
      }
      scheduleWhere.createdAt = dateFilter
      claimWhere.claimedAt = dateFilter
      userWhere.createdAt = dateFilter
    }

    // Get comprehensive analytics data
    console.log('🔍 Fetching analytics data...', { barangayId, startDate, endDate })
    const [
      totalUsers,
      activeUsers,
      totalBarangays,
      totalSchedules,
      totalClaims,
      barangayStats,
      recentActivity
    ] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.user.count({ where: { ...userWhere, isActive: true } }),
      barangayId && barangayId !== 'all' ? prisma.barangay.count({ where: barangayWhere }) : prisma.barangay.count(),
      prisma.donationSchedule.count({ where: scheduleWhere }),
      prisma.claim.count({ where: claimWhere }),
      prisma.barangay.findMany({
        where: barangayId && barangayId !== 'all' ? barangayWhere : undefined,
        include: {
          schedules: {
            where: scheduleWhere.createdAt || scheduleWhere.barangayId ? scheduleWhere : undefined,
            select: { id: true }
          },
          claims: {
            where: claimWhere.claimedAt || claimWhere.barangayId ? claimWhere : undefined,
            select: { id: true }
          },
          residents: {
            where: userWhere.barangayId || userWhere.createdAt ? userWhere : undefined,
            select: { id: true }
          }
        }
      }).then(barangays => barangays.map(b => ({
        ...b,
        _count: {
          schedules: b.schedules.length,
          claims: b.claims.length,
          residents: b.residents.length
        }
      }))),
      prisma.auditLog.findMany({
        where: startDate || endDate ? {
          createdAt: startDate || endDate ? {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { 
              lte: (() => {
                const end = new Date(endDate)
                end.setHours(23, 59, 59, 999)
                return end
              })()
            } : {})
          } : undefined
        } : undefined,
        take: 10,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ])
    console.log('✅ Analytics data fetched:', { totalUsers, activeUsers, totalBarangays, totalSchedules, totalClaims })

    const analyticsData = {
      title: 'System Analytics Report',
      date: new Date().toLocaleDateString(),
      data: [
        {
          'Metric': 'Total Users',
          'Value': totalUsers,
          'Category': 'Users'
        },
        {
          'Metric': 'Active Users',
          'Value': activeUsers,
          'Category': 'Users'
        },
        {
          'Metric': 'Total Barangays',
          'Value': totalBarangays,
          'Category': 'Barangays'
        },
        {
          'Metric': 'Total Schedules',
          'Value': totalSchedules,
          'Category': 'Schedules'
        },
        {
          'Metric': 'Total Claims',
          'Value': totalClaims,
          'Category': 'Claims'
        },
        ...(barangayStats.length > 0 ? [
          ...barangayStats.map(barangay => ({
            'Metric': `${barangay.name} - Schedules`,
            'Value': barangay._count.schedules,
            'Category': 'Barangay Performance'
          })),
          ...barangayStats.map(barangay => ({
            'Metric': `${barangay.name} - Claims`,
            'Value': barangay._count.claims,
            'Category': 'Barangay Performance'
          })),
          ...barangayStats.map(barangay => ({
            'Metric': `${barangay.name} - Residents`,
            'Value': barangay._count.residents,
            'Category': 'Barangay Performance'
          }))
        ] : [{
          'Metric': 'No Barangays',
          'Value': 0,
          'Category': 'Barangay Performance'
        }])
      ],
      summary: {
        'Total Users': totalUsers,
        'Active Users': activeUsers,
        'Total Barangays': totalBarangays,
        'Total Schedules': totalSchedules,
        'Total Claims': totalClaims,
        'Active Barangays': barangayStats.filter(b => b._count.schedules > 0).length,
        'Report Generated': new Date().toLocaleString(),
        'Report Period': startDate && endDate ? `${startDate} to ${endDate}` : 
                        startDate ? `From ${startDate}` : 
                        endDate ? `Until ${endDate}` : 'All Time',
        'Barangay Filter': barangayId && barangayId !== 'all' 
          ? barangayStats.find(b => b.id === barangayId)?.name || 'Selected Barangay'
          : 'All Barangays'
      }
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Error generating analytics report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

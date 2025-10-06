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

    // Get comprehensive analytics data
    console.log('🔍 Fetching analytics data...')
    const [
      totalUsers,
      activeUsers,
      totalBarangays,
      totalSchedules,
      totalClaims,
      barangayStats,
      recentActivity
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.barangay.count(),
      prisma.donationSchedule.count(),
      prisma.claim.count(),
      prisma.barangay.findMany({
        include: {
          _count: {
            select: {
              schedules: true,
              claims: true,
              residents: true
            }
          }
        }
      }),
      prisma.auditLog.findMany({
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
        'Report Generated': new Date().toLocaleString()
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

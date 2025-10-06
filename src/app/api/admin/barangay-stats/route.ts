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

    // Get barangay statistics
    const barangayStats = await prisma.barangay.findMany({
      include: {
        _count: {
          select: {
            schedules: true,
            claims: true,
            residents: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    const stats = barangayStats.map(barangay => ({
      id: barangay.id,
      name: barangay.name,
      code: barangay.code,
      totalSchedules: barangay._count.schedules,
      totalClaims: barangay._count.claims,
      totalResidents: barangay._count.residents,
      isActive: barangay.isActive
    }))

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching barangay stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

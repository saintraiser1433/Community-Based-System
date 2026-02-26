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

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ]
    }

    // If page/limit are not provided, return full list (for dropdowns, reports, etc.)
    if (!pageParam || !limitParam) {
      const barangays = await prisma.barangay.findMany({
        where,
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              residents: true,
              schedules: true,
              claims: true
            }
          }
        },
        orderBy: { name: 'asc' }
      })

      return NextResponse.json(barangays)
    }

    const page = parseInt(pageParam || '1', 10) || 1
    const limit = parseInt(limitParam || '10', 10) || 10

    const [barangays, total] = await Promise.all([
      prisma.barangay.findMany({
        where,
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          _count: {
            select: {
              residents: true,
              schedules: true,
              claims: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.barangay.count({ where })
    ])

    return NextResponse.json({
      barangays,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching barangays:', error)
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

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, code, description, managerId } = await request.json()

    // Check if code already exists
    const existingBarangay = await prisma.barangay.findUnique({
      where: { code }
    })

    if (existingBarangay) {
      return NextResponse.json({ error: 'Barangay code already exists' }, { status: 400 })
    }

    // Validate manager if provided
    if (managerId && managerId !== 'none' && managerId !== '') {
      const manager = await prisma.user.findUnique({
        where: { id: managerId }
      })
      
      if (!manager || manager.role !== 'BARANGAY') {
        return NextResponse.json({ error: 'Invalid manager selected' }, { status: 400 })
      }
      
      // Check if manager is already assigned to another barangay
      const existingManager = await prisma.barangay.findFirst({
        where: { managerId }
      })

      if (existingManager) {
        return NextResponse.json({ error: 'Manager is already assigned to another barangay' }, { status: 400 })
      }
    }

    // Create barangay
    const barangay = await prisma.barangay.create({
      data: {
        name,
        code,
        description,
        managerId: managerId && managerId !== 'none' && managerId !== '' ? managerId : null,
        isActive: true
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BARANGAY_CREATED',
        details: `Created barangay: ${name} (${code})`
      }
    })

    return NextResponse.json({ message: 'Barangay created successfully', barangay })
  } catch (error) {
    console.error('Error creating barangay:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

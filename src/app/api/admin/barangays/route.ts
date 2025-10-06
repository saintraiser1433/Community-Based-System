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

    const barangays = await prisma.barangay.findMany({
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

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const barangay = await prisma.barangay.findUnique({
      where: { id: params.id },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        residents: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true
          }
        },
        schedules: {
          include: {
            _count: {
              select: {
                claims: true
              }
            }
          },
          orderBy: { date: 'desc' },
          take: 10
        },
        _count: {
          select: {
            residents: true,
            schedules: true,
            claims: true
          }
        }
      }
    })

    if (!barangay) {
      return NextResponse.json({ error: 'Barangay not found' }, { status: 404 })
    }

    return NextResponse.json(barangay)
  } catch (error) {
    console.error('Error fetching barangay:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, code, description, managerId, isActive } = await request.json()

    // Check if barangay exists
    const existingBarangay = await prisma.barangay.findUnique({
      where: { id: params.id }
    })

    if (!existingBarangay) {
      return NextResponse.json({ error: 'Barangay not found' }, { status: 404 })
    }

    // Check if code is taken by another barangay
    if (code && code !== existingBarangay.code) {
      const codeTaken = await prisma.barangay.findUnique({
        where: { code }
      })
      if (codeTaken) {
        return NextResponse.json({ error: 'Barangay code already taken' }, { status: 400 })
      }
    }

    // Validate manager if provided
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId }
      })
      
      if (!manager || manager.role !== 'BARANGAY') {
        return NextResponse.json({ error: 'Invalid manager selected' }, { status: 400 })
      }
    }

    // Update barangay
    const barangay = await prisma.barangay.update({
      where: { id: params.id },
      data: {
        name,
        code,
        description,
        managerId,
        isActive
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
        action: 'BARANGAY_UPDATED',
        details: `Updated barangay: ${name} (${code})`
      }
    })

    return NextResponse.json({ message: 'Barangay updated successfully', barangay })
  } catch (error) {
    console.error('Error updating barangay:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if barangay exists
    const barangay = await prisma.barangay.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            residents: true,
            schedules: true
          }
        }
      }
    })

    if (!barangay) {
      return NextResponse.json({ error: 'Barangay not found' }, { status: 404 })
    }

    // Check if barangay has residents or schedules
    if (barangay._count.residents > 0 || barangay._count.schedules > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete barangay with existing residents or schedules. Deactivate instead.' 
      }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    await prisma.barangay.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BARANGAY_DELETED',
        details: `Deactivated barangay: ${barangay.name} (${barangay.code})`
      }
    })

    return NextResponse.json({ message: 'Barangay deactivated successfully' })
  } catch (error) {
    console.error('Error deleting barangay:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




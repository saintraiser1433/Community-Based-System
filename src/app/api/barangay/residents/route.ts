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

    if (session.user.role !== 'BARANGAY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user's barangay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { barangay: true }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    // Get residents in the user's barangay
    const residents = await prisma.user.findMany({
      where: {
        barangayId: user.barangayId,
        role: 'RESIDENT'
      },
      include: {
        families: {
          include: {
            members: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(residents)
  } catch (error) {
    console.error('Error fetching residents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'BARANGAY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { residentId, idFilePath, idBackFilePath } = await request.json()
    if (!residentId) {
      return NextResponse.json({ error: 'residentId is required' }, { status: 400 })
    }

    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { barangayId: true }
    })

    if (!manager?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    const resident = await prisma.user.findFirst({
      where: {
        id: residentId,
        role: 'RESIDENT',
        barangayId: manager.barangayId
      },
      select: { id: true }
    })

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found in your barangay' }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id: residentId },
      data: {
        idFilePath: typeof idFilePath === 'string' ? idFilePath : null,
        idBackFilePath: typeof idBackFilePath === 'string' ? idBackFilePath : null
      },
      select: {
        id: true,
        idFilePath: true,
        idBackFilePath: true
      }
    })

    return NextResponse.json({ message: 'Resident ID documents updated', resident: updated })
  } catch (error) {
    console.error('Error updating resident ID documents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

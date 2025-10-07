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

    // Get claims for the user's barangay
    const claims = await prisma.claim.findMany({
      where: {
        barangayId: user.barangayId
      },
      include: {
        schedule: true,
        family: {
          include: {
            head: true,
            members: true
          }
        },
        claimedByUser: true,
        verifiedByUser: true
      },
      orderBy: {
        claimedAt: 'desc'
      }
    })

    return NextResponse.json(claims)
  } catch (error) {
    console.error('Error fetching claims:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Get user's family
    const family = await prisma.family.findFirst({
      where: {
        headId: session.user.id
      }
    })

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    // Get user's claims
    const claims = await prisma.claim.findMany({
      where: {
        familyId: family.id
      },
      include: {
        schedule: true,
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

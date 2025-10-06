import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'BARANGAY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { isVerified } = await request.json()

    // Get user's barangay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { barangay: true }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    // Check if claim exists and belongs to user's barangay
    const existingClaim = await prisma.claim.findFirst({
      where: {
        id,
        barangayId: user.barangayId
      },
      include: {
        schedule: true,
        claimedByUser: true
      }
    })

    if (!existingClaim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    // Update the claim verification status
    const claim = await prisma.claim.update({
      where: { id },
      data: { 
        isVerified,
        verifiedAt: isVerified ? new Date() : null
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CLAIM_VERIFIED',
        details: `Verified claim for ${existingClaim.schedule.title} by ${existingClaim.claimedByUser.firstName} ${existingClaim.claimedByUser.lastName}`
      }
    })

    return NextResponse.json({ message: 'Claim updated successfully', claim })
  } catch (error) {
    console.error('Error updating claim:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

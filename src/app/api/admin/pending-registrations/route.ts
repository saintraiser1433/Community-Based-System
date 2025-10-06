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

    // Get pending registrations (users with isActive = false)
    const pendingRegistrations = await prisma.user.findMany({
      where: {
        isActive: false,
        role: 'RESIDENT'
      },
      include: {
        barangay: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(pendingRegistrations)
  } catch (error) {
    console.error('Error fetching pending registrations:', error)
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

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, action } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (action === 'approve') {
      // Activate the user
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: true }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'USER_APPROVED',
          details: `Approved resident registration for user ${userId}`
        }
      })

      return NextResponse.json({ message: 'User approved successfully' })
    } else if (action === 'reject') {
      // First, delete related records to avoid foreign key constraints
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
          families: {
            include: {
              members: true,
              claims: true
            }
          },
          claims: true,
          auditLogs: true,
          accounts: true,
          sessions: true
        }
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Delete in the correct order to avoid foreign key constraints
      
      // 1. Delete family members first
      for (const family of user.families) {
        await prisma.familyMember.deleteMany({
          where: { familyId: family.id }
        })
      }

      // 2. Delete claims associated with families
      for (const family of user.families) {
        await prisma.claim.deleteMany({
          where: { familyId: family.id }
        })
      }

      // 3. Delete claims where user is the claimant
      await prisma.claim.deleteMany({
        where: { claimedBy: userId }
      })

      // 4. Delete families
      await prisma.family.deleteMany({
        where: { headId: userId }
      })

      // 5. Delete audit logs
      await prisma.auditLog.deleteMany({
        where: { userId: userId }
      })

      // 6. Delete NextAuth records
      await prisma.account.deleteMany({
        where: { userId: userId }
      })

      await prisma.session.deleteMany({
        where: { userId: userId }
      })

      // 7. Finally delete the user
      await prisma.user.delete({
        where: { id: userId }
      })

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'USER_REJECTED',
          details: `Rejected resident registration for user ${userId}`
        }
      })

      return NextResponse.json({ message: 'User rejected successfully' })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

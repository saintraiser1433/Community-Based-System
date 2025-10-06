import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, relation, age } = await request.json()

    // Get user's family
    const family = await prisma.family.findFirst({
      where: {
        headId: session.user.id
      }
    })

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    // Check if member exists and belongs to user's family
    const existingMember = await prisma.familyMember.findFirst({
      where: {
        id: params.id,
        familyId: family.id
      }
    })

    if (!existingMember) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
    }

    // Update family member
    const member = await prisma.familyMember.update({
      where: { id: params.id },
      data: {
        name,
        relation,
        age: age ? parseInt(age) : null
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FAMILY_MEMBER_UPDATED',
        details: `Updated family member: ${name} (${relation})`
      }
    })

    return NextResponse.json({ message: 'Family member updated successfully', member })
  } catch (error) {
    console.error('Error updating family member:', error)
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

    // Check if member exists and belongs to user's family
    const member = await prisma.familyMember.findFirst({
      where: {
        id: params.id,
        familyId: family.id
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
    }

    // Delete family member
    await prisma.familyMember.delete({
      where: { id: params.id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FAMILY_MEMBER_REMOVED',
        details: `Removed family member: ${member.name} (${member.relation})`
      }
    })

    return NextResponse.json({ message: 'Family member removed successfully' })
  } catch (error) {
    console.error('Error removing family member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




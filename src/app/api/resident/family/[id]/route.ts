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

    if (session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { name, relation, age } = await request.json()

    if (!name || !relation) {
      return NextResponse.json({ error: 'Name and relation are required' }, { status: 400 })
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

    // Check if the family member belongs to this user's family
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        id,
        familyId: family.id
      }
    })

    if (!familyMember) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
    }

    // Update family member
    const updatedMember = await prisma.familyMember.update({
      where: { id },
      data: {
        name,
        relation: relation.toUpperCase() as any, // Convert to enum value
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

    return NextResponse.json({ message: 'Family member updated successfully', member: updatedMember })
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Get user's family
    const family = await prisma.family.findFirst({
      where: {
        headId: session.user.id
      }
    })

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    // Check if the family member belongs to this user's family
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        id,
        familyId: family.id
      }
    })

    if (!familyMember) {
      return NextResponse.json({ error: 'Family member not found' }, { status: 404 })
    }

    // Delete family member
    await prisma.familyMember.delete({
      where: { id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FAMILY_MEMBER_DELETED',
        details: `Deleted family member: ${familyMember.name}`
      }
    })

    return NextResponse.json({ message: 'Family member deleted successfully' })
  } catch (error) {
    console.error('Error deleting family member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    // Create family member
    const member = await prisma.familyMember.create({
      data: {
        familyId: family.id,
        name,
        relation,
        age: age ? parseInt(age) : null
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FAMILY_MEMBER_ADDED',
        details: `Added family member: ${name} (${relation})`
      }
    })

    return NextResponse.json({ message: 'Family member added successfully', member })
  } catch (error) {
    console.error('Error adding family member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}




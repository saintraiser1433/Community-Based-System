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
      },
      include: {
        members: true
      }
    })

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 })
    }

    return NextResponse.json(family)
  } catch (error) {
    console.error('Error fetching family:', error)
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

    if (session.user.role !== 'RESIDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      relation,
      age,
      isIndigent,
      indigencyCertPath,
      isSeniorCitizen,
      seniorCardPath,
      isPWD,
      pwdProofPath,
      isStudent,
      studentIdPath,
      educationLevel
    } = body

    if (!name || !relation) {
      return NextResponse.json({ error: 'Name and relation are required' }, { status: 400 })
    }

    const ageNum = age ? parseInt(age, 10) : null
    if (isSeniorCitizen && (ageNum === null || ageNum < 60)) {
      return NextResponse.json(
        { error: 'Senior Citizen can only be set when age is 60 or above.' },
        { status: 400 }
      )
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

    const educationLevelValue =
      educationLevel && ['ELEMENTARY', 'HIGH_SCHOOL', 'COLLEGE'].includes(educationLevel)
        ? educationLevel
        : null

    const baseData = {
      name,
      relation: relation.toUpperCase() as any,
      age: ageNum,
      isIndigent: false,
      indigencyCertPath: indigencyCertPath || null,
      indigentVerificationStatus: isIndigent ? 'PENDING' : null,
      isSeniorCitizen: false,
      seniorCardPath: seniorCardPath || null,
      seniorVerificationStatus: isSeniorCitizen ? 'PENDING' : null,
      isPWD: false,
      pwdProofPath: pwdProofPath || null,
      pwdVerificationStatus: isPWD ? 'PENDING' : null,
      familyId: family.id
    }
    let familyMember
    try {
      familyMember = await prisma.familyMember.create({
        data: {
          ...baseData,
          isStudent: !!isStudent,
          studentIdPath: studentIdPath || null,
          educationLevel: educationLevelValue
        } as any
      })
    } catch (err: any) {
      if (err?.message?.includes('Unknown argument') && err?.message?.includes('isStudent')) {
        familyMember = await prisma.familyMember.create({
          data: baseData as any
        })
      } else {
        throw err
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FAMILY_MEMBER_ADDED',
        details: `Added family member: ${name} (${relation})`
      }
    })

    return NextResponse.json({ message: 'Family member added successfully', member: familyMember })
  } catch (error) {
    console.error('Error adding family member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
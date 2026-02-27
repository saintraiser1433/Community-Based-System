import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { VerificationStatus } from '@prisma/client'
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

    // Compute current age from dateOfBirth and auto-approve seniors based on age
    const now = new Date()
    const membersToAutoApprove: string[] = []

    const computedMembers = family.members.map((m: any) => {
      let age = m.age

      if (m.dateOfBirth) {
        const birth = new Date(m.dateOfBirth)
        age = now.getFullYear() - birth.getFullYear()
        const monthDiff = now.getMonth() - birth.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
          age--
        }
      }

      let isSeniorCitizen = m.isSeniorCitizen
      let seniorVerificationStatus = m.seniorVerificationStatus as VerificationStatus | null

      if (
        age !== null &&
        age !== undefined &&
        age >= 60 &&
        seniorVerificationStatus !== VerificationStatus.APPROVED
      ) {
        isSeniorCitizen = true
        seniorVerificationStatus = VerificationStatus.APPROVED
        membersToAutoApprove.push(m.id)
      }

      return {
        ...m,
        age,
        isSeniorCitizen,
        seniorVerificationStatus
      }
    })

    if (membersToAutoApprove.length > 0) {
      await prisma.familyMember.updateMany({
        where: {
          id: {
            in: membersToAutoApprove
          }
        },
        data: {
          isSeniorCitizen: true,
          seniorVerificationStatus: VerificationStatus.APPROVED
        }
      })
    }

    const computedFamily = {
      ...family,
      members: computedMembers
    }

    return NextResponse.json(computedFamily)
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
      dateOfBirth,
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

    const qualifiesSeniorByAge = ageNum !== null && ageNum >= 60

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

    // Create family member; senior is auto-approved when age is 60+, otherwise follows verification flow
    const familyMember = await prisma.familyMember.create({
      data: {
        name,
        relation: relation.toUpperCase() as any,
        age: ageNum,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        isIndigent: false,
        indigencyCertPath: indigencyCertPath || null,
        indigentVerificationStatus: isIndigent ? 'PENDING' : null,
        isSeniorCitizen: qualifiesSeniorByAge || !!isSeniorCitizen,
        seniorCardPath: seniorCardPath || null,
        seniorVerificationStatus: qualifiesSeniorByAge
          ? 'APPROVED'
          : isSeniorCitizen
            ? 'PENDING'
            : null,
        isPWD: false,
        pwdProofPath: pwdProofPath || null,
        pwdVerificationStatus: isPWD ? 'PENDING' : null,
        isStudent: false,
        studentIdPath: studentIdPath || null,
        studentVerificationStatus: isStudent ? 'PENDING' : null,
        educationLevel: educationLevelValue,
        familyId: family.id
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

    return NextResponse.json({ message: 'Family member added successfully', member: familyMember })
  } catch (error) {
    console.error('Error adding family member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
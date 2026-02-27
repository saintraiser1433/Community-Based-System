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

    const educationLevelValue =
      educationLevel && ['ELEMENTARY', 'HIGH_SCHOOL', 'COLLEGE'].includes(educationLevel)
        ? educationLevel
        : null

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

    // Update family member; keep existing verification decisions unless this is a new request.
    const wantsStudent = !!isStudent
    const studentApproved = familyMember.studentVerificationStatus === 'APPROVED'

    // Indigent – allow re-request if not approved yet
    let nextIsIndigent = familyMember.isIndigent
    let nextIndigentStatus = familyMember.indigentVerificationStatus
    if (nextIndigentStatus !== 'APPROVED') {
      if (isIndigent) {
        nextIsIndigent = false
        nextIndigentStatus = 'PENDING'
      } else {
        nextIsIndigent = false
        nextIndigentStatus = null
      }
    }

    // Senior – auto-approve when age is 60+; otherwise follow verification flow
    let nextIsSenior = familyMember.isSeniorCitizen
    let nextSeniorStatus = familyMember.seniorVerificationStatus
    if (nextSeniorStatus !== 'APPROVED') {
      if (qualifiesSeniorByAge || !!isSeniorCitizen) {
        nextIsSenior = true
        nextSeniorStatus = 'APPROVED'
      } else {
        nextIsSenior = false
        nextSeniorStatus = null
      }
    }

    // PWD – allow re-request if not approved yet
    let nextIsPWD = familyMember.isPWD
    let nextPWDStatus = familyMember.pwdVerificationStatus
    if (nextPWDStatus !== 'APPROVED') {
      if (isPWD) {
        nextIsPWD = false
        nextPWDStatus = 'PENDING'
      } else {
        nextIsPWD = false
        nextPWDStatus = null
      }
    }

    // Student – allow re-request if not approved yet
    let nextIsStudent = familyMember.isStudent
    let nextStudentStatus = familyMember.studentVerificationStatus
    if (nextStudentStatus !== 'APPROVED') {
      if (wantsStudent) {
        nextIsStudent = false
        nextStudentStatus = 'PENDING'
      } else {
        nextIsStudent = false
        nextStudentStatus = null
      }
    }

    const updatedMember = await prisma.familyMember.update({
      where: { id },
      data: {
        name,
        relation: relation.toUpperCase() as any,
        age: ageNum,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : familyMember.dateOfBirth,
        isIndigent: nextIsIndigent,
        indigencyCertPath: indigencyCertPath || familyMember.indigencyCertPath || null,
        indigentVerificationStatus: nextIndigentStatus as any,
        isSeniorCitizen: nextIsSenior,
        seniorCardPath: seniorCardPath || familyMember.seniorCardPath || null,
        seniorVerificationStatus: nextSeniorStatus as any,
        isPWD: nextIsPWD,
        pwdProofPath: pwdProofPath || familyMember.pwdProofPath || null,
        pwdVerificationStatus: nextPWDStatus as any,
        isStudent: studentApproved || nextIsStudent,
        studentIdPath: studentIdPath || familyMember.studentIdPath || null,
        studentVerificationStatus: studentApproved ? 'APPROVED' : (nextStudentStatus as any),
        educationLevel: educationLevelValue ?? familyMember.educationLevel
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



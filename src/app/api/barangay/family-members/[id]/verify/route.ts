import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { VerificationStatus } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type VerificationField = 'indigent' | 'senior' | 'pwd' | 'student'
type VerificationAction = 'APPROVE' | 'REJECT'

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
    const { field, action } = (await request.json()) as {
      field: VerificationField
      action: VerificationAction
    }

    if (!field || !action) {
      return NextResponse.json(
        { error: 'field and action are required' },
        { status: 400 }
      )
    }

    if (!['indigent', 'senior', 'pwd', 'student'].includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Ensure barangay manager only approves members from their barangay
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { managedBarangay: true }
    })

    if (!manager?.managedBarangay?.id) {
      return NextResponse.json(
        { error: 'Barangay manager not linked to a barangay' },
        { status: 400 }
      )
    }

    const member = await prisma.familyMember.findFirst({
      where: {
        id,
        family: {
          barangayId: manager.managedBarangay.id
        }
      },
      include: {
        family: {
          include: {
            head: true
          }
        }
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Family member not found in your barangay' },
        { status: 404 }
      )
    }

    const approved = action === 'APPROVE'
    const status: VerificationStatus = approved ? VerificationStatus.APPROVED : VerificationStatus.REJECTED

    const data: {
      isIndigent?: boolean
      indigentVerificationStatus?: VerificationStatus
      isSeniorCitizen?: boolean
      seniorVerificationStatus?: VerificationStatus
      isPWD?: boolean
      pwdVerificationStatus?: VerificationStatus
      isStudent?: boolean
      studentVerificationStatus?: VerificationStatus
    } = {}

    if (field === 'indigent') {
      data.isIndigent = approved
      data.indigentVerificationStatus = status
    } else if (field === 'senior') {
      data.isSeniorCitizen = approved
      data.seniorVerificationStatus = status
    } else if (field === 'pwd') {
      data.isPWD = approved
      data.pwdVerificationStatus = status
    } else if (field === 'student') {
      data.isStudent = approved
      data.studentVerificationStatus = status
    }

    const updatedMember = await prisma.familyMember.update({
      where: { id: member.id },
      data
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FAMILY_MEMBER_VERIFICATION_UPDATED',
        details: `Updated ${field} verification for ${member.name} to ${action}`
      }
    })

    return NextResponse.json({
      message: 'Verification updated successfully',
      member: updatedMember
    })
  } catch (error) {
    console.error('Error updating verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


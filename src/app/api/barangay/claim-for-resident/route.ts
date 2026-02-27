import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'BARANGAY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { scheduleId, residentId, familyMemberId, familyMemberName, notes } = await request.json()

    if (!scheduleId || !residentId) {
      return NextResponse.json({ error: 'Schedule ID and Resident ID are required' }, { status: 400 })
    }

    // Get user's barangay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { barangay: true }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    // Get the resident
    const resident = await prisma.user.findFirst({
      where: {
        id: residentId,
        barangayId: user.barangayId,
        role: 'RESIDENT'
      },
      include: {
        families: {
          include: {
            members: true
          }
        }
      }
    })

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 })
    }

    const family = resident.families[0]
    if (!family) {
      return NextResponse.json({ error: 'Resident has no family record' }, { status: 404 })
    }

    // Check if family has already claimed this schedule
    const existingClaim = await prisma.claim.findUnique({
      where: {
        familyId_scheduleId: {
          familyId: family.id,
          scheduleId: scheduleId
        }
      }
    })

    if (existingClaim) {
      return NextResponse.json({ error: 'Family has already claimed this donation' }, { status: 400 })
    }

    // Get the schedule
    const schedule = await prisma.donationSchedule.findFirst({
      where: {
        id: scheduleId,
        barangayId: user.barangayId
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    if (schedule.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Schedule is not available for claiming' }, { status: 400 })
    }

    // Determine who is claiming
    let claimerName = `${resident.firstName} ${resident.lastName}`
    
    if (familyMemberId && familyMemberName) {
      // Verify the family member exists
      const familyMember = family.members.find(member => member.id === familyMemberId)
      if (!familyMember) {
        return NextResponse.json({ error: 'Selected family member not found' }, { status: 400 })
      }
      claimerName = familyMemberName
    }

    // Create the claim
    const claim = await prisma.claim.create({
      data: {
        familyId: family.id,
        scheduleId: scheduleId,
        claimedBy: resident.id,
        barangayId: family.barangayId,
        status: 'CLAIMED',
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: session.user.id,
        claimedAtPhysical: new Date(),
        notes: `Claimed by ${claimerName} (processed by barangay official: ${user.firstName} ${user.lastName})${notes ? ` - ${notes}` : ''}`
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BARANGAY_CLAIMED_FOR_RESIDENT',
        details: `Barangay official claimed donation for resident: ${resident.firstName} ${resident.lastName} (${claimerName}) - Schedule: ${schedule.title}`
      }
    })

    // Notify the family head / registered resident via SMS
    try {
      const smsSettings = await prisma.sMSSettings.findFirst({
        where: { isActive: true }
      })

      if (smsSettings && resident.phone) {
        let phone = resident.phone.replace(/\D/g, '')

        if (phone.startsWith('09')) {
          phone = '+63' + phone.substring(1)
        } else if (phone.startsWith('9')) {
          phone = '+63' + phone
        } else if (phone.startsWith('63')) {
          phone = '+' + phone
        } else {
          phone = '+63' + phone
        }

        if (phone.startsWith('+63') && phone.length === 13) {
          const claimedAt = claim.claimedAtPhysical || new Date()
          const claimedAtText = claimedAt.toLocaleString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })

          const smsMessage = `DONATION CLAIMED\n\nHi ${resident.firstName} ${resident.lastName},\n\n${claimerName} has claimed the donation "${schedule.title}" on ${claimedAtText}.\n\n- MSWDO-GLAN CBDS`

          await sendSMS(smsSettings.username, smsSettings.password, {
            message: smsMessage,
            phoneNumbers: [phone]
          })
        }
      }
    } catch (smsError) {
      console.error('Error sending claim SMS notification:', smsError)
    }

    return NextResponse.json({ 
      message: 'Donation claimed successfully on behalf of resident', 
      claim,
      resident: {
        id: resident.id,
        name: `${resident.firstName} ${resident.lastName}`,
        claimerName
      }
    })
  } catch (error) {
    console.error('Error claiming donation for resident:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

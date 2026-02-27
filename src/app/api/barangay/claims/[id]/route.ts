import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'

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
    const { action, notes } = await request.json() // action: 'verify' | 'claim' | 'reject'

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
        claimedByUser: true,
        family: {
          include: {
            head: true
          }
        }
      }
    })

    if (!existingClaim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    let updatedClaim
    let auditAction = ''
    let auditDetails = ''

    switch (action) {
      case 'verify':
        if (existingClaim.status !== 'PENDING') {
          return NextResponse.json({ error: 'Only pending claims can be verified' }, { status: 400 })
        }
        
        updatedClaim = await prisma.claim.update({
          where: { id },
          data: { 
            status: 'VERIFIED',
            isVerified: true,
            verifiedAt: new Date(),
            verifiedBy: session.user.id,
            notes: notes || existingClaim.notes
          }
        })
        
        auditAction = 'CLAIM_VERIFIED'
        auditDetails = `Verified claim for ${existingClaim.schedule.title} by ${existingClaim.claimedByUser.firstName} ${existingClaim.claimedByUser.lastName}`
        break

      case 'claim':
        if (existingClaim.status !== 'VERIFIED') {
          return NextResponse.json({ error: 'Only verified claims can be marked as claimed' }, { status: 400 })
        }
        
        updatedClaim = await prisma.claim.update({
          where: { id },
          data: { 
            status: 'CLAIMED',
            claimedAtPhysical: new Date(),
            notes: notes || existingClaim.notes
          }
        })
        
        auditAction = 'CLAIM_COMPLETED'
        auditDetails = `Marked claim as physically claimed for ${existingClaim.schedule.title} by ${existingClaim.claimedByUser.firstName} ${existingClaim.claimedByUser.lastName}`

        // Notify family head via SMS that the donation has been claimed
        try {
          const smsSettings = await prisma.sMSSettings.findFirst({
            where: { isActive: true }
          })

          const head = existingClaim.family.head
          if (smsSettings && head?.phone) {
            let phone = head.phone.replace(/\D/g, '')

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
              const claimedAt = updatedClaim.claimedAtPhysical || new Date()
              const claimedAtText = claimedAt.toLocaleString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })

              const claimerName = `${existingClaim.claimedByUser.firstName} ${existingClaim.claimedByUser.lastName}`
              const smsMessage = `DONATION CLAIMED\n\nHi ${head.firstName} ${head.lastName},\n\nYour family's donation "${existingClaim.schedule.title}" has been marked as CLAIMED.\n\nClaimed by: ${claimerName}\nDate: ${claimedAtText}\n\n- MSWDO-GLAN CBDS`

              await sendSMS(smsSettings.username, smsSettings.password, {
                message: smsMessage,
                phoneNumbers: [phone]
              })
            }
          }
        } catch (smsError) {
          console.error('Error sending claim SMS notification:', smsError)
        }
        break

      case 'reject':
        if (existingClaim.status !== 'PENDING') {
          return NextResponse.json({ error: 'Only pending claims can be rejected' }, { status: 400 })
        }
        
        updatedClaim = await prisma.claim.update({
          where: { id },
          data: { 
            status: 'REJECTED',
            verifiedBy: session.user.id,
            notes: notes || existingClaim.notes
          }
        })
        
        auditAction = 'CLAIM_REJECTED'
        auditDetails = `Rejected claim for ${existingClaim.schedule.title} by ${existingClaim.claimedByUser.firstName} ${existingClaim.claimedByUser.lastName}`
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: auditAction,
        details: auditDetails
      }
    })

    return NextResponse.json({ message: 'Claim updated successfully', claim: updatedClaim })
  } catch (error) {
    console.error('Error updating claim:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

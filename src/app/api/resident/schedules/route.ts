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

    // Get user with all necessary fields for eligibility checks
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        barangay: true,
        families: {
          include: {
            members: true
          }
        }
      }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    const userFamily = user.families[0]

    // Get donation schedules for the user's barangay
    const allSchedules = await prisma.donationSchedule.findMany({
      where: {
        barangayId: user.barangayId,
        status: 'SCHEDULED'
      },
      include: {
        claims: {
          where: {
            family: {
              headId: user.id
            }
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Filter schedules based on classification and type eligibility
    const eligibleSchedules = allSchedules.filter(schedule => {
      // Check classification eligibility
      if (schedule.targetClassification) {
        // If schedule has a target classification, user must match
        if (user.familyClassification !== schedule.targetClassification) {
          return false
        }
      }

      // Check type eligibility
      if (schedule.type === 'EDUCATION') {
        // For education type, check if user or any family member is a student
        // Check if user has schoolIdPath or is currently a student
        const userHasSchoolId = !!user.schoolIdPath
        const userIsStudent = userHasSchoolId || (user.educationalAttainment && 
          ['ELEMENTARY_LEVEL', 'HIGH_SCHOOL_LEVEL', 'SENIOR_HIGH_SCHOOL', 'COLLEGE_LEVEL'].includes(user.educationalAttainment))
        
        // If user is a student, eligible
        if (userIsStudent) {
          return true
        }
        
        // Note: Family members don't have student info in the current schema
        // But if they did, we would check them here
        // For now, if user is not a student, they're not eligible
        return false
      } else if (schedule.type === 'WHEELCHAIR') {
        // For wheelchair, check if user has PWD ID or IP certificate
        return !!(user.pwdIdPath || user.ipCertificatePath)
      } else if (schedule.type === 'PWD') {
        // For PWD, check if user has PWD ID
        return !!user.pwdIdPath
      } else if (schedule.type === 'IP') {
        // For IP, check if user has IP certificate
        return !!user.ipCertificatePath
      } else if (schedule.type === 'SENIOR_CITIZEN') {
        // For senior citizen, check if user has senior citizen ID
        return !!user.seniorCitizenIdPath
      } else if (schedule.type === 'SOLO_PARENT') {
        // For solo parent, check if user has solo parent ID
        return !!user.soloParentIdPath
      }
      
      // GENERAL type or no specific type requirement - eligible
      return true
    })

    // Add claim status to each schedule
    const schedulesWithClaimStatus = eligibleSchedules.map(schedule => ({
      ...schedule,
      hasClaimed: schedule.claims.length > 0
    }))

    return NextResponse.json(schedulesWithClaimStatus)
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const barangayId = params.id

    const barangay = await prisma.barangay.findUnique({
      where: { id: barangayId, isActive: true }
    })

    if (!barangay) {
      return NextResponse.json({ error: 'Barangay not found' }, { status: 404 })
    }

    const [totalResidents, totalFamilyMembers] = await Promise.all([
      prisma.user.count({
        where: {
          barangayId,
          role: 'RESIDENT',
          isActive: true
        }
      }),
      prisma.familyMember.count({
        where: {
          family: {
            barangayId
          }
        }
      })
    ])

    const residentsWithFamilies = await prisma.user.findMany({
      where: {
        barangayId,
        role: 'RESIDENT',
        isActive: true
      },
      include: {
        families: {
          include: {
            members: true
          }
        }
      }
    })

    const populationDetails = {
      residents: residentsWithFamilies.map((resident) => ({
        id: resident.id,
        name: `${resident.firstName} ${resident.lastName}`,
        email: resident.email,
        phone: resident.phone || 'N/A',
        families: resident.families.map((family) => ({
          id: family.id,
          address: family.address,
          membersCount: family.members.length
        }))
      })),
      familyMembers: residentsWithFamilies.flatMap((resident) =>
        resident.families.flatMap((family) =>
          family.members.map((member) => ({
            id: member.id,
            name: member.name,
            relation: member.relation,
            familyId: family.id,
            familyAddress: family.address,
            headName: `${resident.firstName} ${resident.lastName}`
          }))
        )
      )
    }

    return NextResponse.json({
      barangay: {
        id: barangay.id,
        name: barangay.name
      },
      overview: {
        totalResidents,
        totalFamilyMembers,
        totalPopulation: totalResidents + totalFamilyMembers
      },
      populationDetails
    })
  } catch (error) {
    console.error('Error fetching admin barangay population:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


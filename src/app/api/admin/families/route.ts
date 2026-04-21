import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type FamilyCategory = 'PWD' | 'STUDENT' | 'INDIGENT' | 'SENIOR' | 'OTHER' | 'ALL'

function parseCategory(raw: string | null): FamilyCategory {
  const v = (raw || '').toUpperCase()
  if (v === 'PWD') return 'PWD'
  if (v === 'STUDENT') return 'STUDENT'
  if (v === 'INDIGENT') return 'INDIGENT'
  if (v === 'SENIOR') return 'SENIOR'
  if (v === 'OTHER') return 'OTHER'
  return 'ALL'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const barangayId = searchParams.get('barangayId')
    const category = parseCategory(searchParams.get('category'))

    if (!barangayId) {
      return NextResponse.json({ error: 'barangayId is required' }, { status: 400 })
    }

    const where: any = {
      head: {
        barangayId
      }
    }

    if (category === 'PWD') where.members = { some: { isPWD: true } }
    if (category === 'STUDENT') where.members = { some: { isStudent: true } }
    if (category === 'INDIGENT') where.members = { some: { isIndigent: true } }
    if (category === 'SENIOR') where.members = { some: { isSeniorCitizen: true } }
    if (category === 'OTHER') {
      where.members = {
        none: {
          OR: [{ isPWD: true }, { isStudent: true }, { isIndigent: true }, { isSeniorCitizen: true }]
        }
      }
    }

    const families = await prisma.family.findMany({
      where,
      include: {
        head: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        members: {
          select: {
            id: true,
            name: true,
            relation: true,
            age: true,
            dateOfBirth: true,
            isIndigent: true,
            indigentVerificationStatus: true,
            isSeniorCitizen: true,
            seniorVerificationStatus: true,
            isPWD: true,
            pwdVerificationStatus: true,
            isStudent: true,
            educationLevel: true,
            studentVerificationStatus: true
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ barangayId, category, families })
  } catch (error) {
    console.error('Error fetching admin families:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


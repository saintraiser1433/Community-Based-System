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
    const category = parseCategory(searchParams.get('category'))

    const [barangays, families] = await Promise.all([
      prisma.barangay.findMany({
        select: { id: true, name: true, code: true, isActive: true },
        orderBy: { name: 'asc' }
      }),
      prisma.family.findMany({
        select: {
          id: true,
          barangayId: true,
          head: {
            select: {
              barangayId: true
            }
          },
          members: {
            select: { isPWD: true, isStudent: true, isIndigent: true, isSeniorCitizen: true, educationLevel: true }
          }
        }
      })
    ])

    const byBarangay: Record<
      string,
      {
        totalFamilies: number
        pwdFamilies: number
        studentFamilies: number
        studentElementaryCount: number
        studentHighSchoolCount: number
        studentSeniorHighSchoolCount: number
        studentCollegeCount: number
        notStudentCount: number
        indigentFamilies: number
        seniorFamilies: number
        otherFamilies: number
      }
    > = {}

    for (const b of barangays) {
      byBarangay[b.id] = {
        totalFamilies: 0,
        pwdFamilies: 0,
        studentFamilies: 0,
        studentElementaryCount: 0,
        studentHighSchoolCount: 0,
        studentSeniorHighSchoolCount: 0,
        studentCollegeCount: 0,
        notStudentCount: 0,
        indigentFamilies: 0,
        seniorFamilies: 0,
        otherFamilies: 0
      }
    }

    for (const f of families) {
      const effectiveBarangayId = f.head?.barangayId || f.barangayId
      if (!effectiveBarangayId) continue

      if (!byBarangay[effectiveBarangayId]) {
        byBarangay[effectiveBarangayId] = {
          totalFamilies: 0,
          pwdFamilies: 0,
          studentFamilies: 0,
          studentElementaryCount: 0,
          studentHighSchoolCount: 0,
          studentSeniorHighSchoolCount: 0,
          studentCollegeCount: 0,
          notStudentCount: 0,
          indigentFamilies: 0,
          seniorFamilies: 0,
          otherFamilies: 0
        }
      }

      const hasPWD = f.members.some((m) => m.isPWD)
      const hasStudent = f.members.some((m) => m.isStudent)
      const hasIndigent = f.members.some((m) => m.isIndigent)
      const hasSenior = f.members.some((m) => m.isSeniorCitizen)
      const hasAnyFlag = hasPWD || hasStudent || hasIndigent || hasSenior

      byBarangay[effectiveBarangayId].totalFamilies += 1
      if (hasPWD) byBarangay[effectiveBarangayId].pwdFamilies += 1
      if (hasStudent) byBarangay[effectiveBarangayId].studentFamilies += 1
      for (const m of f.members) {
        if (m.isStudent) {
          const level = String(m.educationLevel || '')
          if (level === 'ELEMENTARY') byBarangay[effectiveBarangayId].studentElementaryCount += 1
          else if (level === 'HIGH_SCHOOL') byBarangay[effectiveBarangayId].studentHighSchoolCount += 1
          else if (level === 'SENIOR_HIGH_SCHOOL') byBarangay[effectiveBarangayId].studentSeniorHighSchoolCount += 1
          else if (level === 'COLLEGE') byBarangay[effectiveBarangayId].studentCollegeCount += 1
        } else {
          byBarangay[effectiveBarangayId].notStudentCount += 1
        }
      }
      if (hasIndigent) byBarangay[effectiveBarangayId].indigentFamilies += 1
      if (hasSenior) byBarangay[effectiveBarangayId].seniorFamilies += 1
      if (!hasAnyFlag) byBarangay[effectiveBarangayId].otherFamilies += 1
    }

    const rows = barangays.map((b) => {
      const stats =
        byBarangay[b.id] ||
        ({
          totalFamilies: 0,
          pwdFamilies: 0,
          studentFamilies: 0,
          studentElementaryCount: 0,
          studentHighSchoolCount: 0,
          studentSeniorHighSchoolCount: 0,
          studentCollegeCount: 0,
          notStudentCount: 0,
          indigentFamilies: 0,
          seniorFamilies: 0,
          otherFamilies: 0
        } as const)

      let matchingFamilies = stats.totalFamilies
      if (category === 'PWD') matchingFamilies = stats.pwdFamilies
      if (category === 'STUDENT') matchingFamilies = stats.studentFamilies
      if (category === 'INDIGENT') matchingFamilies = stats.indigentFamilies
      if (category === 'SENIOR') matchingFamilies = stats.seniorFamilies
      if (category === 'OTHER') matchingFamilies = stats.otherFamilies

      return {
        id: b.id,
        name: b.name,
        code: b.code,
        isActive: b.isActive,
        ...stats,
        matchingFamilies
      }
    })

    return NextResponse.json({ category, rows })
  } catch (error) {
    console.error('Error fetching admin family stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


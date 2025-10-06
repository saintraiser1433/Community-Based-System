import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const barangays = await prisma.barangay.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(barangays)
  } catch (error) {
    console.error('Error fetching barangays:', error)
    return NextResponse.json(
      { error: 'Failed to fetch barangays' },
      { status: 500 }
    )
  }
}




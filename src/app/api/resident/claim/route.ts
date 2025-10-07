import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Direct claiming is no longer available. Please contact your barangay office to register for donations.' },
    { status: 403 }
  )
}

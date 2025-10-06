import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, phone, password, address, barangayId, role = 'RESIDENT' } = await request.json()

    // Only allow resident registration through this endpoint
    if (role !== 'RESIDENT') {
      return NextResponse.json(
        { error: 'Only resident registration is allowed through this endpoint' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Validate barangay exists
    if (!barangayId) {
      return NextResponse.json(
        { error: 'Barangay selection is required' },
        { status: 400 }
      )
    }

    const barangay = await prisma.barangay.findUnique({
      where: { id: barangayId }
    })

    if (!barangay) {
      return NextResponse.json(
        { error: 'Invalid barangay selected' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user (inactive by default for residents)
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        role: 'RESIDENT',
        isActive: false, // Inactive until approved by admin
        barangayId
      }
    })

    // Create a family record
    await prisma.family.create({
      data: {
        headId: user.id,
        barangayId,
        address
      }
    })

    return NextResponse.json(
      { message: 'Registration submitted successfully. Please wait for admin approval.', userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

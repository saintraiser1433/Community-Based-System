import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    const where: any = {}
    if (role && role !== 'all') {
      where.role = role
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          barangay: true,
          _count: {
            select: {
              families: true,
              claims: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Session in POST /api/admin/users:', session)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { email, password, firstName, lastName, phone, role, barangayId } = await request.json()

    console.log('Creating user with data:', { email, role, barangayId })

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Validate barangayId for BARANGAY role
    let validatedBarangayId = null
    if (role === 'BARANGAY') {
      if (!barangayId || barangayId === '' || barangayId === 'none') {
        return NextResponse.json({ error: 'Barangay is required for Barangay Manager role' }, { status: 400 })
      }
      
      // Check if barangay exists
      const barangay = await prisma.barangay.findUnique({
        where: { id: barangayId }
      })
      
      if (!barangay) {
        return NextResponse.json({ error: 'Selected barangay does not exist' }, { status: 400 })
      }
      
      validatedBarangayId = barangayId
    } else if (role === 'ADMIN') {
      // Admin users don't need a barangay
      validatedBarangayId = null
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        barangayId: validatedBarangayId,
        isActive: true
      },
      include: {
        barangay: true
      }
    })

    // If user is BARANGAY role, update the barangay's managerId
    if (role === 'BARANGAY' && validatedBarangayId) {
      await prisma.barangay.update({
        where: { id: validatedBarangayId },
        data: { managerId: user.id }
      })
    }

    // Create audit log
    console.log('Creating audit log with userId:', session.user.id)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_CREATED',
        details: `Created user: ${firstName} ${lastName} (${email})`
      }
    })

    // Remove password from response
    const { password: _, ...userResponse } = user

    return NextResponse.json({ message: 'User created successfully', user: userResponse })
  } catch (error) {
    console.error('Error creating user:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        barangay: true,
        families: {
          include: {
            members: true
          }
        },
        claims: {
          include: {
            schedule: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove password from response
    const { password: _, ...userResponse } = user

    return NextResponse.json(userResponse)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Session in PUT /api/admin/users/[id]:', session)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const { email, password, firstName, lastName, phone, role, barangayId, isActive } = await request.json()

    console.log('Updating user with data:', { email, role, barangayId })

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email }
      })
      if (emailTaken) {
        return NextResponse.json({ error: 'Email already taken' }, { status: 400 })
      }
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

    // Prepare update data
    const updateData: any = {
      email,
      firstName,
      lastName,
      phone,
      role,
      barangayId: validatedBarangayId,
      isActive
    }

    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        barangay: true
      }
    })

    // Handle barangay manager assignment
    if (role === 'BARANGAY' && validatedBarangayId) {
      // Set this user as manager of the barangay
      await prisma.barangay.update({
        where: { id: validatedBarangayId },
        data: { managerId: user.id }
      })
    } else if (existingUser.role === 'BARANGAY' && existingUser.barangayId) {
      // If user was previously a barangay manager, remove them from that barangay
      await prisma.barangay.update({
        where: { id: existingUser.barangayId },
        data: { managerId: null }
      })
    }

    // Create audit log
    console.log('Creating audit log with userId:', session.user.id)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_UPDATED',
        details: `Updated user: ${firstName} ${lastName} (${email})`
      }
    })

    // Remove password from response
    const { password: _, ...userResponse } = user

    return NextResponse.json({ message: 'User updated successfully', user: userResponse })
  } catch (error) {
    console.error('Error updating user:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('Session in DELETE /api/admin/users/[id]:', session)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting self
    if (user.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Soft delete by setting isActive to false instead of hard delete
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })

    // Create audit log
    console.log('Creating audit log with userId:', session.user.id)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_DELETED',
        details: `Deactivated user: ${user.firstName} ${user.lastName} (${user.email})`
      }
    })

    return NextResponse.json({ message: 'User deactivated successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

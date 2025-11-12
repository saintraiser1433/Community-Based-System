import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'BARANGAY') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { residentId, classification } = await request.json()

    if (!residentId) {
      return NextResponse.json({ error: 'Resident ID is required' }, { status: 400 })
    }

    // Get user's barangay
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { barangay: true }
    })

    if (!user?.barangayId) {
      return NextResponse.json({ error: 'User not assigned to a barangay' }, { status: 400 })
    }

    // Verify the resident belongs to the user's barangay
    const resident = await prisma.user.findFirst({
      where: {
        id: residentId,
        barangayId: user.barangayId,
        role: 'RESIDENT'
      }
    })

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found or does not belong to your barangay' }, { status: 404 })
    }

    // Validate classification value
    const validClassifications = ['HIGH_CLASS', 'MIDDLE_CLASS', 'LOW_CLASS', 'UNCLASSIFIED']
    const normalizedClassification = classification || 'UNCLASSIFIED'
    
    if (!validClassifications.includes(normalizedClassification)) {
      return NextResponse.json({ 
        error: 'Invalid classification value',
        received: classification,
        valid: validClassifications
      }, { status: 400 })
    }

    // Update the resident's classification
    const updatedResident = await prisma.user.update({
      where: { id: residentId },
      data: {
        familyClassification: normalizedClassification as 'HIGH_CLASS' | 'MIDDLE_CLASS' | 'LOW_CLASS' | 'UNCLASSIFIED'
      }
    })

    return NextResponse.json({ 
      message: 'Classification updated successfully',
      resident: updatedResident
    })
  } catch (error: any) {
    console.error('Error updating classification:', error)
    
    // Provide more detailed error messages
    let errorMessage = 'Internal server error'
    
    if (error.code === 'P2002') {
      errorMessage = 'A record with this value already exists'
    } else if (error.code === 'P2025') {
      errorMessage = 'Resident not found'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}


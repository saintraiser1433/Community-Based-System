import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const {
      // Basic info
      firstName,
      lastName,
      email,
      phone,
      password,
      barangayId,
      role = 'RESIDENT',
      
      // Personal Information
      gender,
      dateOfBirth,
      purok,
      municipality,
      
      // Residency Category
      residencyCategory,
      
      // Educational Background
      educationalAttainment,
      lastSchoolAttended,
      yearLastAttended,
      
      // Household Information
      numberOfHouseholdMembers,
      numberOfDependents,
      isHeadOfFamily,
      housingType,
      barangayCertificatePath,
      
      // Occupational and Income Information
      sourceOfIncome,
      employmentType,
      estimatedAnnualIncome,
      lowIncomeCertPath,
      employmentCertPath,
      businessPermitPath,
      
      // Civil and Social Status
      maritalStatus,
      marriageContractPath,
      soloParentIdPath,
      seniorCitizenIdPath,
      pwdIdPath,
      ipCertificatePath,
      schoolIdPath,
      outOfSchoolYouthCertPath,
      
      // Supporting Documents
      barangayClearancePath,
      certificateOfIndigencyPath,
      proofOfResidencyPath,
      
      // Valid ID
      idFilePath,
      idBackFilePath,
    } = await request.json()

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

    // Format phone number for SMS compatibility
    const cleanPhone = phone.replace(/\D/g, '') // Remove all non-numeric characters
    const formattedPhone = cleanPhone.startsWith('09') ? cleanPhone : `09${cleanPhone}`

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Construct address from purok, barangay, and municipality
    const addressParts = [purok, barangay.name, municipality].filter(Boolean)
    const address = addressParts.join(', ')

    // Create user (inactive by default for residents)
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone: formattedPhone,
        password: hashedPassword,
        role: 'RESIDENT',
        isActive: false, // Inactive until approved by admin
        barangayId,
        
        // Personal Information
        gender: gender && gender !== '' ? gender : null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        purok: purok && purok !== '' ? purok : null,
        municipality: municipality && municipality !== '' ? municipality : null,
        
        // Residency Category
        residencyCategory: residencyCategory && residencyCategory !== '' ? residencyCategory : null,
        
        // Educational Background
        educationalAttainment: educationalAttainment && educationalAttainment !== '' ? educationalAttainment : null,
        lastSchoolAttended: lastSchoolAttended && lastSchoolAttended !== '' ? lastSchoolAttended : null,
        yearLastAttended: yearLastAttended && yearLastAttended !== '' ? yearLastAttended : null,
        
        // Household Information
        numberOfHouseholdMembers: numberOfHouseholdMembers && numberOfHouseholdMembers !== '' ? parseInt(String(numberOfHouseholdMembers)) : null,
        numberOfDependents: numberOfDependents && numberOfDependents !== '' ? parseInt(String(numberOfDependents)) : null,
        isHeadOfFamily: isHeadOfFamily === true || isHeadOfFamily === 'true',
        housingType: housingType && housingType !== '' ? housingType : null,
        barangayCertificatePath: barangayCertificatePath || null,
        
        // Occupational and Income Information
        sourceOfIncome: sourceOfIncome && sourceOfIncome !== '' ? sourceOfIncome : null,
        employmentType: employmentType && employmentType !== '' ? employmentType : null,
        estimatedAnnualIncome: estimatedAnnualIncome && estimatedAnnualIncome !== '' ? estimatedAnnualIncome : null,
        lowIncomeCertPath: lowIncomeCertPath || null,
        employmentCertPath: employmentCertPath || null,
        businessPermitPath: businessPermitPath || null,
        
        // Civil and Social Status
        maritalStatus: maritalStatus && maritalStatus !== '' ? maritalStatus : null,
        marriageContractPath: marriageContractPath || null,
        soloParentIdPath: soloParentIdPath || null,
        seniorCitizenIdPath: seniorCitizenIdPath || null,
        pwdIdPath: pwdIdPath || null,
        ipCertificatePath: ipCertificatePath || null,
        schoolIdPath: schoolIdPath || null,
        outOfSchoolYouthCertPath: outOfSchoolYouthCertPath || null,
        
        // Supporting Documents
        barangayClearancePath: barangayClearancePath || null,
        certificateOfIndigencyPath: certificateOfIndigencyPath || null,
        proofOfResidencyPath: proofOfResidencyPath || null,
        
        // Valid ID
        idFilePath: idFilePath || null,
        idBackFilePath: idBackFilePath || null,
      }
    })

    // Create a family record
    await prisma.family.create({
      data: {
        headId: user.id,
        barangayId,
        address: address || 'Address not provided'
      }
    })

    return NextResponse.json(
      { message: 'Registration submitted successfully. Please wait for admin approval.', userId: user.id },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    
    // Provide more detailed error messages
    let errorMessage = 'Internal server error'
    
    if (error.code === 'P2002') {
      errorMessage = 'A user with this email already exists'
    } else if (error.code === 'P2003') {
      errorMessage = 'Invalid reference. Please check your barangay selection.'
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

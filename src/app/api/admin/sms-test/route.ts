import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { testSMSConnection } from '@/lib/sms'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    console.log('Testing SMS connection with username:', username)

    // Test SMS connection
    const result = await testSMSConnection(username, password)

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SMS_CONNECTION_TESTED',
        details: `SMS connection test ${result.success ? 'succeeded' : 'failed'}: ${result.error || 'Success'}`
      }
    })

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'SMS connection test successful!' 
        : result.error || 'SMS connection test failed',
      details: result
    })

  } catch (error) {
    console.error('Error testing SMS connection:', error)
    
    // Create audit log for error
    try {
      await prisma.auditLog.create({
        data: {
          userId: (await getServerSession(authOptions))?.user?.id || 'unknown',
          action: 'SMS_CONNECTION_TEST_FAILED',
          details: `SMS connection test failed with error: ${error}`
        }
      })
    } catch (auditError) {
      console.error('Error creating audit log:', auditError)
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to test SMS connection'
      },
      { status: 500 }
    )
  }
}

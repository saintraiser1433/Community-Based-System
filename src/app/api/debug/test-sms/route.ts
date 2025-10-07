import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendSMS } from '@/lib/sms'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { username, password, phoneNumber, message } = await request.json()

    if (!username || !password || !phoneNumber || !message) {
      return NextResponse.json({ 
        error: 'Username, password, phone number, and message are required' 
      }, { status: 400 })
    }

    console.log('Testing SMS with:', { username, phoneNumber, message: message.substring(0, 50) + '...' })

    // Test SMS sending
    const result = await sendSMS(username, password, {
      message: message,
      phoneNumbers: [phoneNumber]
    })

    console.log('SMS Test Result:', result)

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      debug: {
        username,
        phoneNumber,
        messageLength: message.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Debug SMS test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing dynamic import of android-sms-gateway...')
    
    // Test dynamic import
    const AndroidSMSGateway = await import('android-sms-gateway')
    console.log('Import successful:', !!AndroidSMSGateway.default)
    console.log('Available exports:', Object.keys(AndroidSMSGateway))
    
    const Client = AndroidSMSGateway.default
    console.log('Client type:', typeof Client)
    
    return NextResponse.json({
      success: true,
      message: 'Dynamic import successful',
      hasDefault: !!AndroidSMSGateway.default,
      exports: Object.keys(AndroidSMSGateway),
      clientType: typeof Client
    })

  } catch (error: any) {
    console.error('Import test error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Import failed', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

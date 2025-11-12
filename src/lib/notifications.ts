import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'

// Helper function to convert 24-hour time to 12-hour format
const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':')
  const hour24 = parseInt(hours)
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24
  const ampm = hour24 >= 12 ? 'PM' : 'AM'
  return `${hour12}:${minutes} ${ampm}`
}

export interface NotificationData {
  title: string
  message: string
  scheduleId: string
  barangayId: string
  targetClassification?: string | null
  type?: string
  userId?: string // User ID for audit logging
}

export interface SMSNotificationResult {
  success: boolean
  sentCount: number
  failedCount: number
  errors: string[]
}

export const sendScheduleNotificationToResidents = async (
  notificationData: NotificationData
): Promise<SMSNotificationResult> => {
  try {
    console.log('Starting SMS notification process...', notificationData)

    // Check if SMS is enabled
    const smsSettings = await prisma.sMSSettings.findFirst({
      where: { isActive: true }
    })

    console.log('SMS Settings found:', smsSettings ? 'Yes' : 'No')
    if (smsSettings) {
      console.log('SMS Settings:', { 
        username: smsSettings.username, 
        isActive: smsSettings.isActive,
        hasPassword: !!smsSettings.password 
      })
    }

    if (!smsSettings) {
      console.log('SMS is not enabled or configured')
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['SMS is not enabled or configured']
      }
    }

    // Build where clause for filtering residents
    const whereClause: any = {
      barangayId: notificationData.barangayId,
      role: 'RESIDENT',
      isActive: true,
      phone: { not: null }
    }

    // Filter by classification if specified
    if (notificationData.targetClassification) {
      whereClause.familyClassification = notificationData.targetClassification
    }

    // Get all active residents in the barangay (filtered by classification if specified)
    console.log('Querying residents for barangay:', notificationData.barangayId, 'with classification:', notificationData.targetClassification || 'all')
    const residents = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        familyClassification: true
      }
    })

    console.log(`Found ${residents.length} residents to notify`)
    console.log('Residents found:', residents.map(r => ({ 
      name: `${r.firstName} ${r.lastName}`, 
      phone: r.phone 
    })))

    if (residents.length === 0) {
      return {
        success: true,
        sentCount: 0,
        failedCount: 0,
        errors: []
      }
    }

    // Get schedule details for SMS message
    const schedule = await prisma.donationSchedule.findUnique({
      where: { id: notificationData.scheduleId },
      select: {
        date: true,
        startTime: true,
        endTime: true,
        location: true
      }
    })

    // Format date and time for SMS
    const scheduleDate = schedule ? new Date(schedule.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'TBD'
    
    const timeRange = schedule ? `${formatTime12Hour(schedule.startTime)} - ${formatTime12Hour(schedule.endTime)}` : 'TBD'
    const location = schedule?.location || 'TBD'

    // Prepare SMS message with date and time
    const smsMessage = `NEW DONATION SCHEDULE!\n\n${notificationData.title}\n\n${notificationData.message}\n\n Date: ${scheduleDate}\n🕐 Time: ${timeRange}\n📍 Location: ${location}\n\nPlease check your resident dashboard for more details.\n\n- MSWDO-GLAN CBDS`

    // Get phone numbers and format them for SMS gateway (international format)
    const phoneNumbers = residents
      .filter(resident => resident.phone)
      .map(resident => {
        let phone = resident.phone!
        console.log(`Original phone: ${phone}`)
        // Remove all non-numeric characters
        phone = phone.replace(/\D/g, '')
        console.log(`Cleaned phone: ${phone}`)
        
        // Convert to international format (+63)
        if (phone.startsWith('09')) {
          // Remove the 0 and add +63
          const international = '+63' + phone.substring(1)
          console.log(`Converted 09 to international: ${international}`)
          return international
        } else if (phone.startsWith('9')) {
          // Add +63 prefix
          const international = '+63' + phone
          console.log(`Converted 9 to international: ${international}`)
          return international
        } else if (phone.startsWith('63')) {
          // Already has country code, add +
          const international = '+' + phone
          console.log(`Added + to 63: ${international}`)
          return international
        } else {
          // Assume it's a 10-digit number, add +63
          const international = '+63' + phone
          console.log(`Added +63 prefix: ${international}`)
          return international
        }
      })
      .filter(phone => {
        // Validate international format: +63XXXXXXXXX (13 characters total)
        const isValid = phone.startsWith('+63') && phone.length === 13
        console.log(`Phone ${phone} is valid international format: ${isValid}`)
        return isValid
      })

    console.log(`Final phone numbers to send SMS to:`, phoneNumbers)
    console.log(`Sending SMS to ${phoneNumbers.length} residents`)

    // Send SMS
    console.log('Attempting to send SMS with settings:', {
      username: smsSettings.username,
      hasPassword: !!smsSettings.password,
      phoneCount: phoneNumbers.length,
      messageLength: smsMessage.length
    })
    
    const smsResult = await sendSMS(
      smsSettings.username,
      smsSettings.password,
      {
        message: smsMessage,
        phoneNumbers: phoneNumbers
      }
    )

    console.log('SMS Result:', smsResult)

    if (smsResult.success) {
      console.log('SMS sent successfully to all residents')
      
      // Log notification in audit log (only if userId is provided)
      if (notificationData.userId) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: notificationData.userId,
              action: 'SMS_NOTIFICATION_SENT',
              details: `SMS notification sent to ${phoneNumbers.length} residents for schedule: ${notificationData.title}`
            }
          })
        } catch (auditError) {
          // Don't fail SMS notification if audit log fails
          console.error('Failed to create audit log:', auditError)
        }
      }

      return {
        success: true,
        sentCount: phoneNumbers.length,
        failedCount: 0,
        errors: []
      }
    } else {
      console.error('SMS sending failed:', smsResult.error)
      return {
        success: false,
        sentCount: 0,
        failedCount: phoneNumbers.length,
        errors: [smsResult.error || 'SMS sending failed']
      }
    }

  } catch (error: any) {
    console.error('Error sending SMS notifications:', error)
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: [error.message || 'Failed to send notifications']
    }
  }
}

export const sendScheduleCancellationNotification = async (
  scheduleId: string,
  barangayId: string,
  reason?: string
): Promise<SMSNotificationResult> => {
  try {
    console.log('Starting SMS cancellation notification process...', { scheduleId, barangayId, reason })

    // Check if SMS is enabled
    const smsSettings = await prisma.sMSSettings.findFirst({
      where: { isActive: true }
    })

    if (!smsSettings) {
      console.log('SMS is not enabled or configured')
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['SMS is not enabled or configured']
      }
    }

    // Get schedule details
    const schedule = await prisma.donationSchedule.findUnique({
      where: { id: scheduleId },
      select: {
        title: true,
        date: true,
        startTime: true,
        endTime: true,
        location: true
      }
    })

    if (!schedule) {
      throw new Error('Schedule not found')
    }

    // Get all active residents in the barangay
    const residents = await prisma.user.findMany({
      where: {
        barangayId: barangayId,
        role: 'RESIDENT',
        isActive: true,
        phone: { not: null }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true
      }
    })

    console.log(`Found ${residents.length} residents to notify about cancellation`)

    if (residents.length === 0) {
      return {
        success: true,
        sentCount: 0,
        failedCount: 0,
        errors: []
      }
    }

    // Format date and time for cancellation SMS
    const scheduleDate = new Date(schedule.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const timeRange = `${formatTime12Hour(schedule.startTime)} - ${formatTime12Hour(schedule.endTime)}`

    // Prepare cancellation message
    const cancellationMessage = `❌ SCHEDULE CANCELLED!\n\n${schedule.title}\n\n📅 Date: ${scheduleDate}\n🕐 Time: ${timeRange}\n📍 Location: ${schedule.location}\n\n${reason ? `Reason: ${reason}\n\n` : ''}We apologize for any inconvenience. Please check your resident dashboard for updates.\n\n- MSWDO-GLAN CBDS`

    // Get phone numbers and format them for SMS gateway (international format)
    const phoneNumbers = residents
      .filter(resident => resident.phone)
      .map(resident => {
        let phone = resident.phone!
        // Remove all non-numeric characters
        phone = phone.replace(/\D/g, '')
        
        // Convert to international format (+63)
        if (phone.startsWith('09')) {
          return '+63' + phone.substring(1)
        } else if (phone.startsWith('9')) {
          return '+63' + phone
        } else if (phone.startsWith('63')) {
          return '+' + phone
        } else {
          return '+63' + phone
        }
      })
      .filter(phone => phone.startsWith('+63') && phone.length === 13)

    console.log(`Sending cancellation SMS to ${phoneNumbers.length} residents`)

    // Send SMS
    const smsResult = await sendSMS(
      smsSettings.username,
      smsSettings.password,
      {
        message: cancellationMessage,
        phoneNumbers: phoneNumbers
      }
    )

    if (smsResult.success) {
      console.log('Cancellation SMS sent successfully to all residents')
      
      // Log notification in audit log (skip if no userId provided)
      // Note: This function doesn't receive userId, so we skip audit logging
      // The cancellation is logged when the schedule status is updated

      return {
        success: true,
        sentCount: phoneNumbers.length,
        failedCount: 0,
        errors: []
      }
    } else {
      console.error('Cancellation SMS sending failed:', smsResult.error)
      return {
        success: false,
        sentCount: 0,
        failedCount: phoneNumbers.length,
        errors: [smsResult.error || 'SMS sending failed']
      }
    }

  } catch (error: any) {
    console.error('Error sending cancellation SMS notifications:', error)
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: [error.message || 'Failed to send cancellation notifications']
    }
  }
}


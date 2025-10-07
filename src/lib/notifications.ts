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

    // Get all active residents in the barangay
    console.log('Querying residents for barangay:', notificationData.barangayId)
    const residents = await prisma.user.findMany({
      where: {
        barangayId: notificationData.barangayId,
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
      
      // Log notification in audit log
      await prisma.auditLog.create({
        data: {
          userId: 'system', // System-generated notification
          action: 'SMS_NOTIFICATION_SENT',
          details: `SMS notification sent to ${phoneNumbers.length} residents for schedule: ${notificationData.title}`
        }
      })

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
      
      // Log notification in audit log
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          action: 'SMS_CANCELLATION_SENT',
          details: `Cancellation SMS sent to ${phoneNumbers.length} residents for schedule: ${schedule.title}`
        }
      })

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

export const sendClaimReminderNotification = async (
  scheduleId: string,
  barangayId: string
): Promise<SMSNotificationResult> => {
  try {
    // Get schedule details
    const schedule = await prisma.donationSchedule.findUnique({
      where: { id: scheduleId },
      include: { barangay: true }
    })

    if (!schedule) {
      throw new Error('Schedule not found')
    }

    // Get residents who haven't claimed yet
    const residents = await prisma.user.findMany({
      where: {
        barangayId: barangayId,
        role: 'RESIDENT',
        isActive: true,
        phone: { not: null },
        claims: {
          none: {
            scheduleId: scheduleId
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true
      }
    })

    if (residents.length === 0) {
      return {
        success: true,
        sentCount: 0,
        failedCount: 0,
        errors: []
      }
    }

    // Check if SMS is enabled
    const smsSettings = await prisma.sMSSettings.findFirst({
      where: { isActive: true }
    })

    if (!smsSettings) {
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['SMS is not enabled']
      }
    }

    // Format date and time for reminder SMS
    const scheduleDate = new Date(schedule.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const timeRange = `${formatTime12Hour(schedule.startTime)} - ${formatTime12Hour(schedule.endTime)}`

    // Prepare reminder message with detailed information
    const reminderMessage = `⏰ REMINDER: Donation Schedule Tomorrow!\n\n${schedule.title}\n\n📅 Date: ${scheduleDate}\n🕐 Time: ${timeRange}\n📍 Location: ${schedule.location}\n\nDon't miss out on this opportunity!\n\n- MSWDO-GLAN CBDS`

    const phoneNumbers = residents
      .filter(resident => resident.phone)
      .map(resident => {
        let phone = resident.phone!
        // Remove all non-numeric characters
        phone = phone.replace(/\D/g, '')
        
        // Convert to international format (+63)
        if (phone.startsWith('09')) {
          // Remove the 0 and add +63
          return '+63' + phone.substring(1)
        } else if (phone.startsWith('9')) {
          // Add +63 prefix
          return '+63' + phone
        } else if (phone.startsWith('63')) {
          // Already has country code, add +
          return '+' + phone
        } else {
          // Assume it's a 10-digit number, add +63
          return '+63' + phone
        }
      })
      .filter(phone => phone.startsWith('+63') && phone.length === 13) // Only include valid international format

    const smsResult = await sendSMS(
      smsSettings.username,
      smsSettings.password,
      {
        message: reminderMessage,
        phoneNumbers: phoneNumbers
      }
    )

    if (smsResult.success) {
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          action: 'SMS_REMINDER_SENT',
          details: `Reminder SMS sent to ${phoneNumbers.length} residents for schedule: ${schedule.title}`
        }
      })

      return {
        success: true,
        sentCount: phoneNumbers.length,
        failedCount: 0,
        errors: []
      }
    } else {
      return {
        success: false,
        sentCount: 0,
        failedCount: phoneNumbers.length,
        errors: [smsResult.error || 'SMS sending failed']
      }
    }

  } catch (error: any) {
    console.error('Error sending reminder notifications:', error)
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      errors: [error.message || 'Failed to send reminders']
    }
  }
}

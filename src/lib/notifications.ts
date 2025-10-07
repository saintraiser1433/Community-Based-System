import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'

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

    if (residents.length === 0) {
      return {
        success: true,
        sentCount: 0,
        failedCount: 0,
        errors: []
      }
    }

    // Prepare SMS message
    const smsMessage = `🎉 NEW DONATION SCHEDULE!\n\n${notificationData.title}\n\n${notificationData.message}\n\nPlease check your resident dashboard for more details.\n\n- MSWDO-GLAN CBDS`

    // Get phone numbers
    const phoneNumbers = residents
      .filter(resident => resident.phone)
      .map(resident => resident.phone!)

    console.log(`Sending SMS to ${phoneNumbers.length} residents`)

    // Send SMS
    const smsResult = await sendSMS(
      smsSettings.username,
      smsSettings.password,
      {
        message: smsMessage,
        phoneNumbers: phoneNumbers
      }
    )

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

    // Prepare reminder message
    const reminderMessage = `⏰ REMINDER: Donation Schedule Tomorrow!\n\n${schedule.title}\n\nDate: ${new Date(schedule.date).toLocaleDateString()}\nTime: ${schedule.startTime} - ${schedule.endTime}\nLocation: ${schedule.location}\n\nDon't miss out on this opportunity!\n\n- MSWDO-GLAN CBDS`

    const phoneNumbers = residents
      .filter(resident => resident.phone)
      .map(resident => resident.phone!)

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

# Phone Number Format Guide

## 📱 **Phone Number Format for SMS Notifications**

### **Required Format:**
- **Philippine Mobile Numbers Only**
- **Local Format:** `09XXXXXXXXX` (11 digits) - for user input
- **SMS Gateway Format:** `+63XXXXXXXXX` (13 characters) - for sending SMS
- **Example:** `09123456789` → `+639123456789`

### **Input Format in Frontend:**
- **Display Format:** `09XX XXX XXXX` (with spaces for readability)
- **Example:** `0912 345 6789`
- **Auto-formatting:** Spaces are automatically added while typing

### **Accepted Input Variations:**
1. **`09123456789`** ✅ (11 digits starting with 09)
2. **`9123456789`** ✅ (10 digits starting with 9 - auto-converted to 09)
3. **`0912 345 6789`** ✅ (with spaces - spaces removed automatically)
4. **`+639123456789`** ✅ (international format - converted to 09)

### **Rejected Formats:**
- ❌ `123456789` (too short)
- ❌ `091234567890` (too long)
- ❌ `08123456789` (doesn't start with 09)
- ❌ `+1234567890` (not Philippine number)

## 🔧 **Technical Implementation:**

### **Frontend Validation:**
```typescript
// Phone number input with auto-formatting
const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  let value = e.target.value
  
  // Remove all non-numeric characters
  value = value.replace(/\D/g, '')
  
  // Limit to 11 digits for Philippine mobile numbers
  if (value.length > 11) {
    value = value.substring(0, 11)
  }
  
  // Format as 09XX XXX XXXX while typing
  if (value.length > 4) {
    value = value.substring(0, 4) + ' ' + value.substring(4)
  }
  if (value.length > 8) {
    value = value.substring(0, 8) + ' ' + value.substring(8)
  }
  
  setFormData(prev => ({
    ...prev,
    phone: value
  }))
}
```

### **Backend Formatting:**
```typescript
// Format phone number for SMS compatibility
const cleanPhone = phone.replace(/\D/g, '') // Remove all non-numeric characters
const formattedPhone = cleanPhone.startsWith('09') ? cleanPhone : `09${cleanPhone}`
```

### **SMS Gateway Formatting (International Format):**
```typescript
// Format phone numbers for Android SMS Gateway (international format)
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
```

## 📋 **User Instructions:**

### **For Residents (Signup):**
1. **Enter your mobile number** in the format: `09XX XXX XXXX`
2. **Example:** Type `09123456789` or `0912 345 6789`
3. **The system will automatically format** your input
4. **Only Philippine mobile numbers** are accepted
5. **This number will be used for SMS notifications**

### **For Barangay Officials:**
1. **Residents' phone numbers** are automatically formatted
2. **SMS notifications** are sent to all residents with valid phone numbers
3. **Invalid phone numbers** are automatically filtered out
4. **SMS delivery status** is logged for tracking

## 🎯 **SMS Notification Features:**

### **Automatic Notifications:**
- ✅ **New Schedule Alerts:** Sent when barangay creates donation schedules
- ✅ **Reminder Notifications:** Sent to residents who haven't claimed yet
- ✅ **Professional Format:** Well-formatted messages with emojis and branding

### **Message Examples:**
```
NEW DONATION SCHEDULE!

Rice and Canned Goods Distribution

Free distribution of rice and canned goods for all residents

📅 Date: Monday, December 16, 2024
🕐 Time: 8:00 AM - 12:00 PM
📍 Location: Barangay Hall

Please check your resident dashboard for more details.

- MSWDO-GLAN CBDS
```

### **Reminder Message Example:**
```
⏰ REMINDER: Donation Schedule Tomorrow!

Rice and Canned Goods Distribution

📅 Date: Monday, December 16, 2024
🕐 Time: 8:00 AM - 12:00 PM
📍 Location: Barangay Hall

Don't miss out on this opportunity!

- MSWDO-GLAN CBDS
```

### **Cancellation Message Example:**
```
❌ SCHEDULE CANCELLED!

Rice and Canned Goods Distribution

📅 Date: Monday, December 16, 2024
🕐 Time: 8:00 AM - 12:00 PM
📍 Location: Barangay Hall

Reason: Due to weather conditions

We apologize for any inconvenience. Please check your resident dashboard for updates.

- MSWDO-GLAN CBDS
```

## 🔍 **Troubleshooting:**

### **Common Issues:**
1. **SMS not received:** Check if phone number is in correct format (09XXXXXXXXX)
2. **Invalid number error:** Ensure number starts with 09 and has 11 digits
3. **SMS gateway issues:** Check SMS settings in admin panel

### **Validation Rules:**
- ✅ Must be 11 digits long
- ✅ Must start with 09
- ✅ Must be a Philippine mobile number
- ✅ No special characters except spaces (which are removed)

## 📞 **Supported Carriers:**
- **Globe/TM:** 09XX XXX XXXX
- **Smart/TNT:** 09XX XXX XXXX
- **Sun Cellular:** 09XX XXX XXXX
- **DITO:** 09XX XXX XXXX

All Philippine mobile carriers are supported as long as the number follows the 09XXXXXXXXX format.

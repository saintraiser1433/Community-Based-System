import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper function to generate random dates within a range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Helper function to generate random time
function randomTime(): string {
  const hour = Math.floor(Math.random() * 12) + 6 // 6 AM to 6 PM
  const minute = Math.floor(Math.random() * 60)
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

async function main() {
  console.log('🌱 Starting comprehensive database seeding...')
  
  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Clearing existing data...')
  await prisma.claim.deleteMany()
  await prisma.donationSchedule.deleteMany()
  await prisma.familyMember.deleteMany()
  await prisma.family.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
  await prisma.barangay.deleteMany()
  await prisma.fAQ.deleteMany()
  await prisma.contactInfo.deleteMany()
  console.log('✅ Cleared existing data')

  // Create multiple barangays for better analytics
  const barangays = await Promise.all([
    prisma.barangay.create({
      data: {
        name: 'Barangay San Antonio',
        code: 'SA001',
        description: 'A peaceful community in the heart of the city'
      }
    }),
    prisma.barangay.create({
      data: {
        name: 'Barangay San Jose',
        code: 'SJ002',
        description: 'A vibrant community with strong social bonds'
      }
    }),
    prisma.barangay.create({
      data: {
        name: 'Barangay Santa Maria',
        code: 'SM003',
        description: 'A growing community focused on development'
      }
    }),
    prisma.barangay.create({
      data: {
        name: 'Barangay San Pedro',
        code: 'SP004',
        description: 'A coastal community with fishing traditions'
      }
    }),
    prisma.barangay.create({
      data: {
        name: 'Barangay San Miguel',
        code: 'SM005',
        description: 'An urban community with modern facilities'
      }
    }),
    prisma.barangay.create({
      data: {
        name: 'Barangay San Isidro',
        code: 'SI006',
        description: 'A rural community focused on agriculture'
      }
    })
  ])

  console.log(`✅ Created ${barangays.length} barangays`)

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@cbds.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      phone: '+63-912-345-6789',
      role: 'ADMIN',
      isActive: true
    }
  })

  console.log('✅ Created admin user')

  // Create barangay managers for each barangay
  const barangayManagers = []
  for (let i = 0; i < barangays.length; i++) {
    const managerPassword = await bcrypt.hash('manager123', 12)
    const manager = await prisma.user.create({
      data: {
        email: `manager${i + 1}@cbds.com`,
        password: managerPassword,
        firstName: ['Maria', 'Juan', 'Carmen', 'Pedro', 'Ana', 'Luis'][i],
        lastName: ['Santos', 'Cruz', 'Reyes', 'Lopez', 'Garcia', 'Torres'][i],
        phone: `+63-912-345-678${i}`,
        role: 'BARANGAY',
        barangayId: barangays[i].id,
        isActive: true
      }
    })
    barangayManagers.push(manager)

    // Update barangay with manager
    await prisma.barangay.update({
      where: { id: barangays[i].id },
      data: { managerId: manager.id }
    })
  }

  console.log(`✅ Created ${barangayManagers.length} barangay managers`)

  // Create many residents across all barangays
  const residents = []
  const firstNames = ['Ana', 'Pedro', 'Carmen', 'Jose', 'Maria', 'Luis', 'Elena', 'Miguel', 'Rosa', 'Carlos', 'Isabel', 'Fernando', 'Patricia', 'Antonio', 'Sofia', 'Rafael', 'Lucia', 'Diego', 'Valentina', 'Santiago']
  const lastNames = ['Garcia', 'Lopez', 'Reyes', 'Santos', 'Cruz', 'Torres', 'Morales', 'Gonzalez', 'Hernandez', 'Martinez', 'Jimenez', 'Perez', 'Sanchez', 'Ramirez', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Vargas', 'Mendoza']
  
  let residentCounter = 1
  for (let barangayIndex = 0; barangayIndex < barangays.length; barangayIndex++) {
    // Create 8-15 residents per barangay for realistic data
    const residentsPerBarangay = Math.floor(Math.random() * 8) + 8
    
    for (let i = 0; i < residentsPerBarangay; i++) {
      const residentPassword = await bcrypt.hash('resident123', 12)
      const resident = await prisma.user.create({
        data: {
          email: `resident${residentCounter}@cbds.com`,
          password: residentPassword,
          firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
          lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
          phone: `+63-912-345-${String(residentCounter).padStart(4, '0')}`,
          role: 'RESIDENT',
          barangayId: barangays[barangayIndex].id,
          isActive: Math.random() > 0.1, // 90% active residents
          createdAt: randomDate(new Date('2023-01-01'), new Date()) // Random registration dates
        }
      })
      residents.push(resident)
      residentCounter++
    }
  }

  console.log(`✅ Created ${residents.length} residents across ${barangays.length} barangays`)

  // Create families for all residents
  const families = []
  const streetNames = ['Main Street', 'Oak Avenue', 'Pine Street', 'Maple Drive', 'Cedar Lane', 'Elm Street', 'First Avenue', 'Second Street', 'Third Road', 'Fourth Boulevard']
  
  for (const resident of residents) {
    const family = await prisma.family.create({
      data: {
        headId: resident.id,
        barangayId: resident.barangayId!,
        address: `${Math.floor(Math.random() * 999) + 1} ${streetNames[Math.floor(Math.random() * streetNames.length)]}, ${barangays.find(b => b.id === resident.barangayId)?.name}`
      }
    })
    families.push(family)
  }

  console.log(`✅ Created ${families.length} families`)

  // Create family members for each family
  const familyMemberData = []
  const memberNames = ['Jose', 'Maria', 'Carlos', 'Elena', 'Miguel', 'Roberto', 'Isabella', 'Fernando', 'Patricia', 'Antonio', 'Sofia', 'Rafael', 'Lucia', 'Diego', 'Valentina', 'Santiago', 'Camila', 'Sebastian', 'Gabriela', 'Alejandro']
  const relations = ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING']
  
  for (const family of families) {
    // Each family has 1-4 members
    const memberCount = Math.floor(Math.random() * 4) + 1
    
    for (let i = 0; i < memberCount; i++) {
      const relation = i === 0 ? 'SPOUSE' : relations[Math.floor(Math.random() * relations.length)]
      const age = relation === 'CHILD' ? Math.floor(Math.random() * 18) + 1 : Math.floor(Math.random() * 50) + 18
      
      familyMemberData.push({
        familyId: family.id,
        name: memberNames[Math.floor(Math.random() * memberNames.length)],
        relation,
        age
      })
    }
  }

  await prisma.familyMember.createMany({
    data: familyMemberData
  })

  console.log(`✅ Created ${familyMemberData.length} family members`)

  // Create many donation schedules across all barangays with various statuses
  const schedules = []
  const scheduleTitles = [
    'Weekly Food Distribution', 'Monthly Rice Distribution', 'Emergency Relief Distribution',
    'Medical Supplies Distribution', 'Educational Materials Distribution', 'Clothing Distribution',
    'Hygiene Kit Distribution', 'Nutritional Supplement Distribution', 'Winter Clothing Drive',
    'School Supplies Distribution', 'Holiday Food Basket', 'Community Garden Seeds'
  ]
  const locations = ['Barangay Hall', 'Community Center', 'School Gymnasium', 'Church Hall', 'Sports Complex', 'Public Market', 'Health Center', 'Library', 'Recreation Center', 'Cultural Center']
  const statuses = ['SCHEDULED', 'DISTRIBUTED', 'CLAIMED', 'CANCELLED']
  
  // Create schedules for the past 6 months and future 3 months
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 6)
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 3)
  
  for (const barangay of barangays) {
    // Create 8-15 schedules per barangay
    const schedulesPerBarangay = Math.floor(Math.random() * 8) + 8
    
    for (let i = 0; i < schedulesPerBarangay; i++) {
      const scheduleDate = randomDate(startDate, endDate)
      const isPast = scheduleDate < new Date()
      const status = isPast ? (Math.random() > 0.1 ? 'DISTRIBUTED' : 'CANCELLED') : 'SCHEDULED'
      
      const schedule = await prisma.donationSchedule.create({
        data: {
          barangayId: barangay.id,
          title: scheduleTitles[Math.floor(Math.random() * scheduleTitles.length)],
          description: `Distribution program for ${barangay.name} residents`,
          date: scheduleDate,
          startTime: randomTime(),
          endTime: randomTime(),
          location: `${locations[Math.floor(Math.random() * locations.length)]}, ${barangay.name}`,
          maxRecipients: Math.floor(Math.random() * 50) + 20,
          status,
          createdAt: randomDate(new Date('2023-01-01'), new Date())
        }
      })
      schedules.push(schedule)
    }
  }

  console.log(`✅ Created ${schedules.length} donation schedules`)

  // Create many claims for completed schedules
  const claims = []
  const completedSchedules = schedules.filter(s => s.status === 'DISTRIBUTED')
  
  for (const schedule of completedSchedules) {
    // Get families from the same barangay
    const barangayFamilies = families.filter(f => f.barangayId === schedule.barangayId)
    
    // 60-90% of families claim from each schedule
    const claimRate = 0.6 + Math.random() * 0.3
    const familiesToClaim = Math.floor(barangayFamilies.length * claimRate)
    
    // Randomly select families to claim
    const shuffledFamilies = barangayFamilies.sort(() => 0.5 - Math.random())
    const claimingFamilies = shuffledFamilies.slice(0, familiesToClaim)
    
    for (const family of claimingFamilies) {
      const claimDate = new Date(schedule.date)
      claimDate.setHours(claimDate.getHours() + Math.floor(Math.random() * 8)) // Random time during the day
      
      const claim = await prisma.claim.create({
        data: {
          familyId: family.id,
          scheduleId: schedule.id,
          claimedBy: family.headId,
          barangayId: schedule.barangayId,
          status: 'CLAIMED',
          notes: `Family claimed ${schedule.title}`,
          claimedAt: claimDate
        }
      })
      claims.push(claim)
    }
  }

  console.log(`✅ Created ${claims.length} claims`)

  // Create FAQs
  await prisma.fAQ.createMany({
    data: [
      {
        question: 'How do I register as a resident?',
        answer: 'You can register by clicking the "Register as Resident" button on the landing page and filling out the registration form with your personal information.',
        order: 1
      },
      {
        question: 'How often are donations distributed?',
        answer: 'Donation schedules vary by barangay. You can check the donation schedules section to see upcoming distributions in your area.',
        order: 2
      },
      {
        question: 'Can I claim donations multiple times?',
        answer: 'No, each family can only claim once per donation schedule to ensure fair distribution among all families.',
        order: 3
      },
      {
        question: 'What documents do I need to bring?',
        answer: 'Please bring a valid ID and proof of residence. The barangay staff will verify your family registration.',
        order: 4
      },
      {
        question: 'How do I add family members to my account?',
        answer: 'After logging in as a resident, go to the Family Management section where you can add family members with their details.',
        order: 5
      },
      {
        question: 'What if I miss a donation schedule?',
        answer: 'If you miss a scheduled distribution, you can check for the next available schedule in your barangay.',
        order: 6
      }
    ]
  })

  console.log('✅ Created FAQs')

  // Create contact information
  await prisma.contactInfo.createMany({
    data: [
      {
        type: 'email',
        value: 'info@cbds.com',
        isActive: true
      },
      {
        type: 'phone',
        value: '+63-2-123-4567',
        isActive: true
      },
      {
        type: 'address',
        value: '123 Community Center, City Hall, Metro Manila',
        isActive: true
      }
    ]
  })

  console.log('✅ Created contact information')

  // Create comprehensive audit logs
  const auditLogs = []
  
  // System initialization
  auditLogs.push({
    userId: admin.id,
    action: 'SYSTEM_INITIALIZED',
    details: 'Database seeded with comprehensive test data',
    createdAt: new Date()
  })
  
  // Barangay creation logs
  for (let i = 0; i < barangays.length; i++) {
    auditLogs.push({
      userId: barangayManagers[i].id,
      action: 'BARANGAY_CREATED',
      details: `Created barangay: ${barangays[i].name}`,
      createdAt: randomDate(new Date('2023-01-01'), new Date())
    })
  }
  
  // User registration logs
  for (let i = 0; i < Math.min(20, residents.length); i++) {
    auditLogs.push({
      userId: residents[i].id,
      action: 'USER_REGISTERED',
      details: `Resident registered: ${residents[i].firstName} ${residents[i].lastName}`,
      createdAt: residents[i].createdAt
    })
  }
  
  // Schedule creation logs
  for (let i = 0; i < Math.min(30, schedules.length); i++) {
    const manager = barangayManagers.find(m => m.barangayId === schedules[i].barangayId)
    if (manager) {
      auditLogs.push({
        userId: manager.id,
        action: 'SCHEDULE_CREATED',
        details: `Created schedule: ${schedules[i].title}`,
        createdAt: schedules[i].createdAt
      })
    }
  }
  
  // Claim processing logs
  for (let i = 0; i < Math.min(50, claims.length); i++) {
    auditLogs.push({
      userId: claims[i].claimedBy,
      action: 'CLAIM_PROCESSED',
      details: `Processed claim for schedule`,
      createdAt: claims[i].claimedAt
    })
  }

  await prisma.auditLog.createMany({
    data: auditLogs
  })

  console.log(`✅ Created ${auditLogs.length} audit logs`)

  console.log('🎉 Comprehensive database seeding completed successfully!')
  console.log('\n📊 Data Summary:')
  console.log(`- ${barangays.length} Barangays`)
  console.log(`- ${barangayManagers.length} Barangay Managers`)
  console.log(`- ${residents.length} Residents`)
  console.log(`- ${families.length} Families`)
  console.log(`- ${familyMemberData.length} Family Members`)
  console.log(`- ${schedules.length} Donation Schedules`)
  console.log(`- ${claims.length} Claims`)
  console.log(`- ${auditLogs.length} Audit Logs`)
  
  console.log('\n📋 Test Accounts:')
  console.log('Admin: admin@cbds.com / admin123')
  for (let i = 0; i < Math.min(3, barangayManagers.length); i++) {
    console.log(`Barangay Manager ${i + 1}: manager${i + 1}@cbds.com / manager123`)
  }
  for (let i = 0; i < Math.min(5, residents.length); i++) {
    console.log(`Resident ${i + 1}: resident${i + 1}@cbds.com / resident123`)
  }
  
  console.log('\n📈 Analytics Data:')
  console.log('- User growth over 6+ months')
  console.log('- Multiple barangays with different performance levels')
  console.log('- Various schedule statuses (SCHEDULED, COMPLETED, CANCELLED)')
  console.log('- Realistic claim rates (60-90% per schedule)')
  console.log('- Family participation across all barangays')
  console.log('- Historical data for trend analysis')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

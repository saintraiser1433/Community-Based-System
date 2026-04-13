/**
 * One-off: assign MSWDO sequence numbers to users that have none.
 * Targets residents and barangay managers.
 * Run: npx tsx prisma/backfill-mswdo-sequences.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const missing = await prisma.user.findMany({
    where: {
      role: { in: ['RESIDENT', 'BARANGAY'] },
      mswdoSequence: null
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, role: true, email: true }
  })

  const agg = await prisma.user.aggregate({
    where: { mswdoSequence: { not: null } },
    _max: { mswdoSequence: true }
  })
  let next = (agg._max.mswdoSequence ?? 0) + 1

  for (const u of missing) {
    await prisma.user.update({
      where: { id: u.id },
      data: { mswdoSequence: next }
    })
    console.log(
      `Assigned MSWDO-${String(next).padStart(4, '0')} to ${u.role} ${u.email} (${u.id})`
    )
    next += 1
  }

  console.log(`Done. Updated ${missing.length} user(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

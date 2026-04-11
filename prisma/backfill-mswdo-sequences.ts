/**
 * One-off: assign MSWDO sequence numbers to existing residents that have none.
 * Run: npx tsx prisma/backfill-mswdo-sequences.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const missing = await prisma.user.findMany({
    where: { role: 'RESIDENT', mswdoSequence: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
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
    console.log(`Assigned MSWDO-${String(next).padStart(4, '0')} to ${u.id}`)
    next += 1
  }

  console.log(`Done. Updated ${missing.length} resident(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

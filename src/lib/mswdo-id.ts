import type { Prisma } from '@prisma/client'

/** Display label for resident ID cards and lists (e.g. MSWDO-0001). */
export function formatMswdoId(sequence: number): string {
  return `MSWDO-${String(sequence).padStart(4, '0')}`
}

/** Next sequence for a new resident (max existing + 1). Call inside a transaction. */
export async function nextMswdoSequence(
  tx: Prisma.TransactionClient
): Promise<number> {
  const agg = await tx.user.aggregate({
    where: { mswdoSequence: { not: null } },
    _max: { mswdoSequence: true }
  })
  return (agg._max.mswdoSequence ?? 0) + 1
}

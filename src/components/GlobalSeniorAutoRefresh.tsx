'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

/**
 * Globally polls resident family data so that age-based senior auto-approval
 * continues to run even when the user navigates between pages.
 */
export function GlobalSeniorAutoRefresh() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user || session.user.role !== 'RESIDENT') return

    const refresh = async () => {
      try {
        await fetch('/api/resident/family', { cache: 'no-store' })
      } catch (error) {
        console.error('Error during global senior auto-refresh:', error)
      }
    }

    // Initial run
    refresh()

    const intervalId = setInterval(refresh, 5 * 1000) // every 5 seconds
    return () => clearInterval(intervalId)
  }, [session?.user])

  return null
}


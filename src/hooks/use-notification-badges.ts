import { useEffect, useState } from 'react'
import { getNotificationBadges, NotificationBadges } from '@/lib/api/dashboard'

export function useNotificationBadges() {
  const [badges, setBadges] = useState<NotificationBadges | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBadges() {
      try {
        setLoading(true)
        const { data, error } = await getNotificationBadges()
        
        if (error) {
          setError(error)
        } else {
          setBadges(data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch notification badges')
      } finally {
        setLoading(false)
      }
    }

    fetchBadges()
    // Refresh every 5 minutes
    const intervalId = setInterval(fetchBadges, 5 * 60 * 1000)
    
    return () => clearInterval(intervalId)
  }, [])

  return { badges, loading, error }
}

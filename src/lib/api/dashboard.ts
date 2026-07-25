import { apiRequest } from '@/lib/api/request'

export interface NotificationBadges {
  followUpsDue: number
  unreplied: number
}

interface DashboardNotificationData {
  followUpsDue?: number
  pipelineCounts?: Record<string, number>
}

export async function getNotificationBadges(): Promise<{
  data: NotificationBadges | null
  error: string | null
}> {
  try {
    const data = await apiRequest<DashboardNotificationData>(
      '/api/dashboard',
      {},
      'Failed to load notification badges',
    )
    return {
      data: {
        followUpsDue: data.followUpsDue || 0,
        unreplied: data.pipelineCounts?.no_response || 0,
      },
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to load notification badges',
    }
  }
}

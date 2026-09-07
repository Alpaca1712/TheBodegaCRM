import { route } from '@/lib/api/route'
import { overviewStats } from '@/lib/stats'

export const GET = route(async () => ({ data: await overviewStats() }))

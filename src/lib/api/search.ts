import { apiRequest } from '@/lib/api/request'

export type SearchResult = {
  id: string
  type: 'customer' | 'investor' | 'partnership'
  title: string
  subtitle?: string
  route: string
}

export type SearchCategory = {
  type: 'customer' | 'investor' | 'partnership'
  title: string
  icon: React.ReactNode
  results: SearchResult[]
}

type SearchLead = {
  id: string
  type: SearchResult['type']
  contact_name: string
  company_name: string
  stage: string
}

export async function searchAll(query: string): Promise<SearchCategory[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  try {
    const response = await apiRequest<{ data: SearchLead[] }>(
      `/api/leads?search=${encodeURIComponent(trimmed)}&limit=20`,
      {},
      'Search failed',
    )
    const categories: Array<{
      type: SearchResult['type']
      title: string
    }> = [
      { type: 'customer', title: 'Customers' },
      { type: 'partnership', title: 'Partnerships' },
      { type: 'investor', title: 'Investors' },
    ]

    return categories.flatMap((category) => {
      const leads = response.data.filter((lead) => lead.type === category.type)
      if (leads.length === 0) return []
      return [{
        ...category,
        icon: null,
        results: leads.map((lead) => ({
          id: lead.id,
          type: category.type,
          title: lead.contact_name,
          subtitle: `${lead.company_name} · ${lead.stage}`,
          route: `/leads/${lead.id}`,
        })),
      }]
    })
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}

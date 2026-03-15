import { createClient } from '@/lib/supabase/client'

type SearchResult = {
  id: string;
  type: 'customer' | 'investor' | 'partnership';
  title: string;
  subtitle?: string;
  route: string;
};

type SearchCategory = {
  type: 'customer' | 'investor' | 'partnership';
  title: string;
  icon: React.ReactNode;
  results: SearchResult[];
};

export async function searchAll(query: string): Promise<SearchCategory[]> {
  if (!query.trim()) return [];

  const supabase = createClient()
  const lowerQuery = `%${query.toLowerCase()}%`

  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, type, contact_name, company_name, contact_email, stage')
      .or(`contact_name.ilike.${lowerQuery},company_name.ilike.${lowerQuery},contact_email.ilike.${lowerQuery}`)
      .limit(20)

    if (error || !leads) return []

    const customers = leads.filter(l => l.type === 'customer')
    const investors = leads.filter(l => l.type === 'investor')

    const results: SearchCategory[] = []

    if (customers.length > 0) {
      results.push({
        type: 'customer',
        title: 'Customers',
        icon: null,
        results: customers.map(l => ({
          id: l.id,
          type: 'customer' as const,
          title: l.contact_name,
          subtitle: `${l.company_name} · ${l.stage}`,
          route: `/leads/${l.id}`,
        })),
      })
    }

    if (investors.length > 0) {
      results.push({
        type: 'investor',
        title: 'Investors',
        icon: null,
        results: investors.map(l => ({
          id: l.id,
          type: 'investor' as const,
          title: l.contact_name,
          subtitle: `${l.company_name} · ${l.stage}`,
          route: `/leads/${l.id}`,
        })),
      })
    }

    return results
  } catch (error) {
    console.error('Search error:', error)
    return []
  }
}

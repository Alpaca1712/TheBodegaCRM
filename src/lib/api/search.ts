import { getContacts } from './contacts';
import { getCompanies } from './companies';
import { getDeals } from './deals';

type SearchResult = {
  id: string;
  type: 'contact' | 'company' | 'deal';
  title: string;
  subtitle?: string;
  value?: number | null;
  avatar?: string;
  route: string;
};

type SearchCategory = {
  type: 'contact' | 'company' | 'deal';
  title: string;
  icon: React.ReactNode;
  results: SearchResult[];
};

export async function searchAll(query: string): Promise<SearchCategory[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    // Search in parallel
    const [contacts, companies, deals] = await Promise.all([
      searchContacts(query),
      searchCompanies(query),
      searchDeals(query),
    ]);

    const results: SearchCategory[] = [];

    if (contacts.length > 0) {
      results.push({
        type: 'contact',
        title: 'Contacts',
        icon: null, // This will be replaced with actual icons in the component
        results: contacts,
      });
    }

    if (companies.length > 0) {
      results.push({
        type: 'company',
        title: 'Companies',
        icon: null, // This will be replaced with actual icons in the component
        results: companies,
      });
    }

    if (deals.length > 0) {
      results.push({
        type: 'deal',
        title: 'Deals',
        icon: null, // This will be replaced with actual icons in the component
        results: deals,
      });
    }

    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

async function searchContacts(query: string): Promise<SearchResult[]> {
  try {
    const { data: contacts, error } = await getContacts(
      { search: query },
      { page: 1, limit: 10 }
    );

    if (error || !contacts) {
      return [];
    }

    return contacts.map((contact) => ({
      id: contact.id,
      type: 'contact' as const,
      title: `${contact.first_name} ${contact.last_name}`,
      subtitle: contact.email || contact.phone || 'No contact info',
      avatar: contact.avatar_url,
      route: `/contacts/${contact.id}`,
    }));
  } catch (error) {
    console.error('Contact search error:', error);
    return [];
  }
}

async function searchCompanies(query: string): Promise<SearchResult[]> {
  try {
    const { data: companies, error } = await getCompanies(
      { search: query },
      { page: 1, limit: 10 }
    );

    if (error || !companies) {
      return [];
    }

    return companies.map((company) => ({
      id: company.id,
      type: 'company' as const,
      title: company.name,
      subtitle: `${company.industry || 'No industry'} • ${company.size || 'No size'}`, 
      avatar: company.logo_url,
      route: `/companies/${company.id}`,
    }));
  } catch (error) {
    console.error('Company search error:', error);
    return [];
  }
}

async function searchDeals(query: string): Promise<SearchResult[]> {
  try {
    const { data: deals, error } = await getDeals(
      { search: query },
      { page: 1, limit: 10 }
    );

    if (error || !deals) {
      return [];
    }

    return deals.map((deal) => ({
      id: deal.id,
      type: 'deal' as const,
      title: deal.title,
      subtitle: `$${deal.value?.toLocaleString() || '0'} • ${deal.stage}`,
      value: deal.value,
      route: `/deals/${deal.id}`,
    }));
  } catch (error) {
    console.error('Deal search error:', error);
    return [];
  }
}

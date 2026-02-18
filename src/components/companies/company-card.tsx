import { Building2, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { type Company } from '@/lib/api/companies';

interface CompanyCardProps {
  company: Company;
}

export default function CompanyCard({ company }: CompanyCardProps) {
  // Generate initials from company name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get a background color based on company name
  const getColorFromName = (name: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-violet-100 text-violet-700',
      'bg-cyan-100 text-cyan-700',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Format industry for display
  const formatIndustry = (industry?: string) => {
    if (!industry) return 'N/A';
    return industry.length > 20 ? industry.substring(0, 20) + '...' : industry;
  };

  return (
    <Link href={`/companies/${company.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-sm transition-all duration-200 cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getColorFromName(company.name)}`}>
            {company.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name} 
                className="h-8 w-8 object-cover rounded" 
              />
            ) : (
              <span className="text-lg font-semibold">
                {getInitials(company.name)}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm">
            <Building2 className="h-3 w-3" />
            <span className="capitalize">{company.size || 'Unknown'}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {company.name}
          </h3>
          
          <div className="flex items-center gap-2 text-slate-600">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm truncate">
              {formatIndustry(company.industry)}
            </span>
          </div>
          
          {company.domain && (
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" />
              </svg>
              <span className="text-sm truncate">{company.domain}</span>
            </div>
          )}
          
          {company.website && (
            <a 
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              onClick={(e) => e.stopPropagation()}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block text-sm text-indigo-600 hover:text-indigo-800 hover:underline truncate"
            >
              {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          )}
        </div>

        {/* Stats Placeholder */}
        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-slate-600 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Contacts</span>
            </div>
            <div className="text-lg font-semibold text-slate-900">0</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-slate-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Deals</span>
            </div>
            <div className="text-lg font-semibold text-slate-900">$0</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

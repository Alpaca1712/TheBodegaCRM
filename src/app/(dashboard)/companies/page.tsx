'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Building2, Plus, ChevronLeft, ChevronRight, Download, Globe, Users, Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCompanies, type Company, type CompanyFilters, type SortOptions } from '@/lib/api/companies';
import { exportCompaniesToCSV } from '@/lib/utils/csv-export';

export const industryOptions = [
  { value: '', label: 'All Industries' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Education', label: 'Education' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Other', label: 'Other' },
];

export const sizeOptions = [
  { value: '', label: 'All Sizes' },
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
];

type CompanySortField = 'name' | 'industry' | 'created_at';

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [sortField, setSortField] = useState<CompanySortField>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const filters: CompanyFilters = {};
    if (industryFilter) filters.industry = industryFilter;
    if (sizeFilter) filters.size = sizeFilter as Company['size'];
    if (searchTerm) filters.search = searchTerm;

    const sort: SortOptions = { field: sortField, direction: sortDirection };
    const { data, count, error } = await getCompanies(filters, { page, limit }, sort);

    if (error) {
      setCompanies([]);
      setTotalCount(0);
    } else {
      setCompanies(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [searchTerm, industryFilter, sizeFilter, sortField, sortDirection, page]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Companies</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
            {totalCount} compan{totalCount !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCompaniesToCSV(companies)}
            disabled={loading || companies.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <Link
            href="/companies/new"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/20"
          >
            <Plus size={16} /> Add Company
          </Link>
        </div>
      </div>

      {/* Filters -- reactive, no "Apply" button */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -tranzinc-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search companies..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
            value={industryFilter}
            onChange={(e) => { setIndustryFilter(e.target.value); setPage(1); }}
          >
            {industryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
            value={sizeFilter}
            onChange={(e) => { setSizeFilter(e.target.value); setPage(1); }}
          >
            {sizeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-9 w-9 bg-zinc-200 dark:bg-zinc-700 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
                    <div className="h-3 w-48 bg-zinc-100 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
              {searchTerm || industryFilter || sizeFilter ? 'No companies match your filters' : 'No companies yet'}
            </p>
            <Link href="/companies/new" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              Add your first company
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Industry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Website</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {companies.map((company) => (
                    <tr
                      key={company.id}
                      onClick={() => router.push(`/companies/${company.id}`)}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {company.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-zinc-900 dark:text-white">{company.name}</div>
                            {company.domain && <div className="text-xs text-zinc-500 dark:text-zinc-400">{company.domain}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
                        {company.industry || <span className="text-zinc-400 dark:text-zinc-600">--</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {company.size ? (
                          <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                            <Users size={12} className="text-zinc-400" /> {company.size}
                          </span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {company.website ? (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 truncate max-w-[140px]"
                          >
                            <Globe size={12} />
                            {company.website.replace(/https?:\/\//, '')}
                          </a>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
                        {company.phone ? (
                          <span className="inline-flex items-center gap-1"><Phone size={12} className="text-zinc-400" />{company.phone}</span>
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(company.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

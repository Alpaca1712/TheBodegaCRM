'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Building2, Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getCompanies, type Company, type CompanyFilters, type SortOptions } from '@/lib/api/companies';
import CompanyCard from '@/components/companies/company-card';

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
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

const sortOptions = [
  { value: 'created_at', label: 'Recently Added' },
  { value: 'name', label: 'Name' },
  { value: 'industry', label: 'Industry' },
];

type CompanySortField = 'name' | 'industry' | 'created_at';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string>('');
  const [sizeFilter, setSizeFilter] = useState<string>('');
  const [sortField, setSortField] = useState<CompanySortField>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const filters: CompanyFilters = {};
    
    if (industryFilter) {
      filters.industry = industryFilter;
    }
    
    if (sizeFilter) {
      filters.size = sizeFilter as '1-10' | '11-50' | '51-200' | '201-500' | '500+';
    }
    
    if (searchTerm) {
      filters.search = searchTerm;
    }

    const sort: SortOptions = {
      field: sortField,
      direction: sortDirection,
    };

    const { data, count, error } = await getCompanies(filters, { page, limit }, sort);
    
    if (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
      setTotalCount(0);
    } else {
      setCompanies(data);
      setTotalCount(count || 0);
    }
    
    setLoading(false);
  }, [searchTerm, industryFilter, sizeFilter, sortField, sortDirection, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch pattern
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCompanies();
  };

  const handleSortChange = (field: CompanySortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
            <p className="text-slate-600 mt-1">
              Manage your company relationships
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Link
              href="/companies/new"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Company
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <form onSubmit={handleSearch} className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-slate-700 mb-1">
                Search Companies
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, domain, or industry..."
                  className="pl-10 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-slate-700 mb-1">
                Industry
              </label>
              <select
                id="industry"
                value={industryFilter}
                onChange={(e) => {
                  setIndustryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full md:w-48 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {industryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="size" className="block text-sm font-medium text-slate-700 mb-1">
                Company Size
              </label>
              <select
                id="size"
                value={sizeFilter}
                onChange={(e) => {
                  setSizeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full md:w-48 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {sizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full md:w-auto bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <span className="flex items-center justify-center gap-2">
                <Filter className="h-4 w-4" />
                Apply Filters
              </span>
            </button>
          </form>
        </div>

        {/* Sort Controls */}
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div className="text-slate-600">
            Showing {companies.length} of {totalCount} companies
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Sort by:</span>
            <div className="flex gap-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSortChange(option.value as CompanySortField)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    sortField === option.value
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {option.label}
                  {sortField === option.value && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 bg-slate-200 rounded-full"></div>
                <div className="h-4 w-16 bg-slate-200 rounded"></div>
              </div>
              <div className="space-y-3">
                <div className="h-5 w-32 bg-slate-200 rounded"></div>
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
                <div className="h-4 w-16 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : companies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No companies found</h3>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            {searchTerm || industryFilter || sizeFilter
              ? 'Try adjusting your search or filters to find what you\'re looking for.'
              : 'Get started by adding your first company.'}
          </p>
          <Link
            href="/companies/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
          <div className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

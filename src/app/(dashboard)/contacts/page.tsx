'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Link from 'next/link';
import { getContacts, type Contact, type ContactFilters, type SortOptions } from '@/lib/api/contacts';
import ContactsTable from '@/components/contacts/contacts-table';
import ContactsMobileList from '@/components/contacts/contacts-mobile-list';
import { exportContactsToCSV } from '@/lib/utils/csv-export';

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'lead', label: 'Lead' },
];

const sortOptions = [
  { value: 'created_at', label: 'Recently Added' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'status', label: 'Status' },
];

type ContactSortField = 'first_name' | 'last_name' | 'email' | 'status' | 'created_at';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<ContactSortField>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const filters: ContactFilters = {};
    if (statusFilter !== 'all') {
      filters.status = statusFilter as 'active' | 'inactive' | 'lead';
    }
    if (searchTerm) {
      filters.search = searchTerm;
    }

    const sort: SortOptions = {
      field: sortField,
      direction: sortDirection,
    };

    const result = await getContacts(filters, { page, limit }, sort);
    if (result.error) {
      console.error('Error fetching contacts:', result.error);
    } else {
      setContacts(result.data);
      setTotalCount(result.count);
    }
    setLoading(false);
  }, [statusFilter, sortField, sortDirection, page, searchTerm]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch pattern
    fetchContacts();
  }, [fetchContacts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContacts();
  };

  const handleSort = (field: ContactSortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
          <p className="text-slate-600 mt-1">
            Manage your contacts, leads, and customers
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportContactsToCSV(contacts)}
            disabled={loading || contacts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Export CSV
          </button>
          <Link
            href="/contacts/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <UserPlus size={18} />
            Add Contact
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search contacts by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
          <div className="flex gap-2">
            <select
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={`${sortField}_${sortDirection}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split('_');
                setSortField(field as ContactSortField);
                setSortDirection(dir as 'asc' | 'desc');
              }}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={`${option.value}_desc`}>
                  Sort by: {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse">
              {/* Desktop table skeleton */}
              <div className="hidden md:block">
                <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200">
                  <div className="h-4 w-24 bg-slate-300 rounded"></div>
                  <div className="h-4 w-24 bg-slate-300 rounded"></div>
                  <div className="h-4 w-24 bg-slate-300 rounded"></div>
                  <div className="h-4 w-24 bg-slate-300 rounded"></div>
                  <div className="h-4 w-24 bg-slate-300 rounded"></div>
                  <div className="h-4 w-24 bg-slate-300 rounded"></div>
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-slate-300 rounded-full mr-4"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-slate-300 rounded"></div>
                          <div className="h-3 w-24 bg-slate-300 rounded"></div>
                        </div>
                      </div>
                      <div className="h-4 w-48 bg-slate-300 rounded"></div>
                      <div className="h-4 w-32 bg-slate-300 rounded"></div>
                      <div className="h-4 w-32 bg-slate-300 rounded"></div>
                      <div className="h-6 w-16 bg-slate-300 rounded-full"></div>
                      <div className="h-4 w-24 bg-slate-300 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Mobile list skeleton */}
              <div className="md:hidden space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-slate-300 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-slate-300 rounded mb-2"></div>
                        <div className="space-y-1">
                          <div className="h-3 w-24 bg-slate-300 rounded"></div>
                          <div className="h-3 w-20 bg-slate-300 rounded"></div>
                          <div className="h-3 w-16 bg-slate-300 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-slate-400 mb-2">No contacts found</div>
            <Link
              href="/contacts/new"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Create your first contact
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <ContactsTable contacts={contacts} onSort={handleSort} />
            </div>
            
            {/* Mobile list with swipe actions */}
            <div className="md:hidden">
              <ContactsMobileList 
                contacts={contacts}
                onDelete={async (contactId) => {
                  // Add delete logic here
                  console.log('Delete contact:', contactId);
                }}
                onArchive={async (contactId) => {
                  // Add archive logic here
                  console.log('Archive contact:', contactId);
                }}
                onTag={async (contactId) => {
                  // Add tag logic here
                  console.log('Tag contact:', contactId);
                }}
              />
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(page * limit, totalCount)}
                </span>{' '}
                of <span className="font-medium">{totalCount}</span> contacts
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 text-sm font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

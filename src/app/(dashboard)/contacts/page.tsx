'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, ChevronLeft, ChevronRight, Download, Upload, Mail, Phone, Building, ExternalLink, Users, Tag, CalendarDays, X } from 'lucide-react';
import Link from 'next/link';
import { getContacts, createContact, type Contact, type ContactFilters, type SortOptions } from '@/lib/api/contacts';
import ContactsTable from '@/components/contacts/contacts-table';
import ContactsMobileList from '@/components/contacts/contacts-mobile-list';
import { exportContactsToCSV } from '@/lib/utils/csv-export';
import { Sheet, SheetHeader, SheetBody, SheetFooter } from '@/components/ui/sheet';
import ContactForm, { type ContactFormData } from '@/components/contacts/contact-form';
import { useTags } from '@/hooks/use-tags';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
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
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<ContactSortField>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [tagFilter, setTagFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  const { data: allTags = [] } = useTags();

  // Sheet states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const filters: ContactFilters = {};
    if (statusFilter !== 'all') {
      filters.status = statusFilter as 'active' | 'inactive' | 'lead';
    }
    if (debouncedSearch) {
      filters.search = debouncedSearch;
    }
    if (tagFilter) {
      filters.tag_id = tagFilter;
    }
    if (dateFrom) {
      filters.date_from = dateFrom;
    }
    if (dateTo) {
      filters.date_to = dateTo;
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
  }, [statusFilter, sortField, sortDirection, page, debouncedSearch, tagFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleSort = (field: ContactSortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleCreateContact = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createContact({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        company_id: data.company_id || undefined,
        title: data.title || undefined,
        status: data.status,
        source: data.source || undefined,
        notes: data.notes || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Contact created');
        setIsCreateOpen(false);
        fetchContacts();
      }
    } catch {
      toast.error('Failed to create contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactClick = (contact: Contact) => {
    setPreviewContact(contact);
  };

  const totalPages = Math.ceil(totalCount / limit);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
      case 'inactive': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      case 'lead': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Contacts</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-0.5">
              {totalCount} contact{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/contacts/import"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <Upload size={15} />
              <span className="hidden sm:inline">Import</span>
            </Link>
            <button
              onClick={() => exportContactsToCSV(contacts)}
              disabled={loading || contacts.length === 0}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 font-medium rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/20"
            >
              <UserPlus size={15} />
              Add Contact
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -tranzinc-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Search contacts..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-100"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-zinc-100"
              value={`${sortField}_${sortDirection}`}
              onChange={(e) => {
                const parts = e.target.value.split('_');
                const dir = parts.pop() as 'asc' | 'desc';
                const field = parts.join('_');
                setSortField(field as ContactSortField);
                setSortDirection(dir);
                setPage(1);
              }}
            >
              {sortOptions.map((option) => (
                <option key={`${option.value}_desc`} value={`${option.value}_desc`}>
                  {option.label} (Newest)
                </option>
              ))}
              {sortOptions.filter(o => o.value !== 'created_at').map((option) => (
                <option key={`${option.value}_asc`} value={`${option.value}_asc`}>
                  {option.label} (A-Z)
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
              showFilters || tagFilter || dateFrom || dateTo
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            <Tag size={14} />
            Filters
            {(tagFilter || dateFrom || dateTo) && (
              <span className="h-4 w-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {[tagFilter, dateFrom, dateTo].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-1.5">
              <Tag size={12} className="text-zinc-400" />
              <select
                value={tagFilter}
                onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
                className="px-2 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-md dark:text-zinc-300 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Tags</option>
                {allTags.map((t: { id: string; name: string }) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDays size={12} className="text-zinc-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="px-2 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-md dark:text-zinc-300 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="From"
              />
              <span className="text-xs text-zinc-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="px-2 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 rounded-md dark:text-zinc-300 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="To"
              />
            </div>
            {(tagFilter || dateFrom || dateTo) && (
              <button
                onClick={() => { setTagFilter(''); setDateFrom(''); setDateTo(''); setPage(1); }}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
                      <div className="h-3 w-48 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-1">No contacts found</p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium text-xs transition-colors"
              >
                Create your first contact
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <ContactsTable
                  contacts={contacts}
                  onSort={handleSort}
                  onRefresh={fetchContacts}
                  onContactClick={handleContactClick}
                />
              </div>
              <div className="md:hidden">
                <ContactsMobileList
                  contacts={contacts}
                  onDelete={async (contactId) => {
                    const { deleteContact } = await import('@/lib/api/contacts');
                    const result = await deleteContact(contactId);
                    if (result.error) toast.error(result.error);
                    else { toast.success('Contact deleted'); fetchContacts(); }
                  }}
                  onArchive={async (contactId) => {
                    const { updateContact } = await import('@/lib/api/contacts');
                    const result = await updateContact(contactId, { status: 'inactive' });
                    if (result.error) toast.error(result.error);
                    else { toast.success('Contact archived'); fetchContacts(); }
                  }}
                  onTag={async (contactId) => {
                    toast.info(`Open contact to add tags`);
                    router.push(`/contacts/${contactId}`);
                  }}
                />
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="px-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 tabular-nums">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Contact Sheet */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetHeader onClose={() => setIsCreateOpen(false)}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">New Contact</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Add a new contact to your CRM</p>
        </SheetHeader>
        <SheetBody>
          <ContactForm
            onSubmit={handleCreateContact}
            isSubmitting={isSubmitting}
          />
        </SheetBody>
      </Sheet>

      {/* Contact Preview Sheet */}
      <Sheet open={!!previewContact} onOpenChange={(open) => { if (!open) setPreviewContact(null); }}>
        {previewContact && (
          <>
            <SheetHeader onClose={() => setPreviewContact(null)}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                    {previewContact.first_name.charAt(0)}{previewContact.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {previewContact.first_name} {previewContact.last_name}
                  </h2>
                  {previewContact.title && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{previewContact.title}</p>
                  )}
                </div>
              </div>
            </SheetHeader>
            <SheetBody>
              <div className="space-y-6">
                {/* Status badge */}
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(previewContact.status)}`}>
                    {previewContact.status.charAt(0).toUpperCase() + previewContact.status.slice(1)}
                  </span>
                </div>

                {/* Contact details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Details</h3>
                  {previewContact.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-zinc-400" />
                      <a href={`mailto:${previewContact.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        {previewContact.email}
                      </a>
                    </div>
                  )}
                  {previewContact.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-zinc-400" />
                      <a href={`tel:${previewContact.phone}`} className="text-zinc-700 dark:text-zinc-300">
                        {previewContact.phone}
                      </a>
                    </div>
                  )}
                  {previewContact.company_id && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building className="h-4 w-4 text-zinc-400" />
                      <Link
                        href={`/companies/${previewContact.company_id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        onClick={() => setPreviewContact(null)}
                      >
                        {previewContact.company_name || 'View Company'}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {previewContact.notes && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Notes</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{previewContact.notes}</p>
                  </div>
                )}

                {/* Source */}
                {previewContact.source && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Source</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">{previewContact.source}</p>
                  </div>
                )}

                {/* Added date */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Added</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {new Date(previewContact.created_at).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </SheetBody>
            <SheetFooter>
              <button
                onClick={() => setPreviewContact(null)}
                className="px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                Close
              </button>
              <Link
                href={`/contacts/${previewContact.id}`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Full Profile
              </Link>
            </SheetFooter>
          </>
        )}
      </Sheet>
    </>
  );
}

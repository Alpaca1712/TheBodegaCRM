'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Globe, Users, Phone, MapPin, Calendar, Edit, Trash2,
  ArrowLeft, Mail, User, Briefcase, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { getCompanyById, updateCompany, deleteCompany, getContactsByCompanyId } from '@/lib/api/companies';
import { getDeals, type Deal } from '@/lib/api/deals';
import type { Company } from '@/lib/api/companies';
import type { Contact } from '@/lib/api/contacts';
import { Sheet, SheetHeader, SheetBody } from '@/components/ui/sheet';
import CompanyForm, { type CompanyFormData } from '@/components/companies/company-form';
import { AiEmailDraftButton } from '@/components/ai/ai-insights-panel';
import { toast } from 'sonner';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companyDeals, setCompanyDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const companyId = params.id as string;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const companyResult = await getCompanyById(companyId);
      if (companyResult.error) {
        setError(companyResult.error);
      } else {
        setCompany(companyResult.data);
        const [contactsResult, dealsResult] = await Promise.all([
          getContactsByCompanyId(companyId),
          getDeals({ company_id: companyId }),
        ]);
        if (contactsResult.data) setContacts(contactsResult.data);
        if (!dealsResult.error) setCompanyDeals(dealsResult.data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [companyId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this company?')) return;
    setDeleting(true);
    const result = await deleteCompany(companyId);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
    } else {
      router.push('/companies');
    }
  };

  const handleEditSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateCompany(companyId, {
        name: data.name,
        domain: data.domain || undefined,
        industry: data.industry || undefined,
        size: (data.size === '' ? undefined : data.size) as Company['size'] | undefined,
        website: data.website || undefined,
        phone: data.phone || undefined,
        address_line1: data.address_line1 || undefined,
        address_city: data.address_city || undefined,
        address_state: data.address_state || undefined,
        address_country: data.address_country || undefined,
        logo_url: data.logo_url || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        setCompany(result.data);
        setIsEditOpen(false);
        toast.success('Company updated');
      }
    } catch {
      toast.error('Failed to update company');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-5 w-24 bg-zinc-200 rounded mb-4" />
        <div className="h-7 w-48 bg-zinc-200 rounded mb-2" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 h-80 bg-zinc-100 rounded-xl" />
          <div className="h-80 bg-zinc-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link href="/companies" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 mb-4">
          <ArrowLeft size={14} /> Companies
        </Link>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error || 'Company not found'}
        </div>
      </div>
    );
  }

  const addressParts = [company.address_line1, company.address_city, company.address_state, company.address_country].filter(Boolean);

  return (
    <>
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <Link href="/companies" className="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 mb-4">
          <ArrowLeft size={14} /> Companies
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {company.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{company.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {company.industry && (
                  <span className="inline-flex items-center px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-full">
                    {company.industry}
                  </span>
                )}
                {company.size && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-full">
                    <Users size={10} /> {company.size}
                  </span>
                )}
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{contacts.length} contacts</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <Edit size={14} /> Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contacts */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Contacts</h2>
                <Link
                  href={`/contacts/new?company=${company.id}`}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Add
                </Link>
              </div>
              {contacts.length > 0 ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {contacts.map((contact) => (
                    <Link
                      key={contact.id}
                      href={`/contacts/${contact.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400">
                          {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {contact.first_name} {contact.last_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {contact.title && <span>{contact.title}</span>}
                            {contact.email && <span>{contact.email}</span>}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-zinc-400" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No contacts yet</p>
                  <Link
                    href={`/contacts/new?company=${company.id}`}
                    className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-block"
                  >
                    Add a contact
                  </Link>
                </div>
              )}
            </div>

            {/* Deals */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Deals</h2>
                <Link
                  href={`/deals/new?company=${company.id}`}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Add
                </Link>
              </div>
              {companyDeals.length > 0 ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {companyDeals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{deal.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{deal.stage?.replace('_', ' ')}</p>
                      </div>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">${(deal.value || 0).toLocaleString()}</span>
                    </Link>
                  ))}
                  <div className="px-5 py-2 text-xs text-zinc-500 dark:text-zinc-400 flex justify-between bg-zinc-50 dark:bg-zinc-800/50">
                    <span>{companyDeals.length} deal{companyDeals.length !== 1 ? 's' : ''}</span>
                    <span className="font-medium">${companyDeals.reduce((s, d) => s + (d.value || 0), 0).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No deals yet</p>
                  <Link
                    href={`/deals/new?company=${company.id}`}
                    className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-block"
                  >
                    Create a deal
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Details */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Details</h2>
              </div>
              <div className="px-5 py-4 space-y-3">
                {company.website && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"><Globe size={13} /> Website</span>
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline truncate ml-2 max-w-[140px]"
                    >
                      {company.website.replace(/https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {company.domain && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400">Domain</span>
                    <span className="text-zinc-900 dark:text-white">{company.domain}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"><Phone size={13} /> Phone</span>
                    <a href={`tel:${company.phone}`} className="text-zinc-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                      {company.phone}
                    </a>
                  </div>
                )}
                {addressParts.length > 0 && (
                  <div className="text-sm">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-1"><MapPin size={13} /> Address</span>
                    <p className="text-zinc-900 dark:text-white text-xs">{addressParts.join(', ')}</p>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">Created</span>
                  <span className="text-zinc-900 dark:text-white">{new Date(company.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href={`/contacts/new?company=${company.id}`}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <User size={14} /> Add Contact
                </Link>
                <AiEmailDraftButton
                  recipientName={company.name}
                  companyName={company.name}
                  purpose="intro"
                  className="w-full justify-center flex items-center gap-1.5 text-sm px-3 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetHeader onClose={() => setIsEditOpen(false)}>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Edit Company</h2>
        </SheetHeader>
        <SheetBody>
          <CompanyForm
            initialData={company}
            onSubmit={handleEditSubmit}
            isSubmitting={isSubmitting}
            onCancel={() => setIsEditOpen(false)}
          />
        </SheetBody>
      </Sheet>
    </>
  );
}

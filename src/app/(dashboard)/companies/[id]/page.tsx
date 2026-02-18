'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Building2, Globe, Users, Phone, MapPin, Calendar, Edit, Trash2, 
  ArrowLeft, PhoneCall, Mail, User, Briefcase, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { getCompanyById, deleteCompany, getContactsByCompanyId } from '@/lib/api/companies';
import type { Company } from '@/lib/api/companies';
import type { Contact } from '@/lib/api/contacts';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId = params.id as string;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch company data
      const companyResult = await getCompanyById(companyId);
      if (companyResult.error) {
        setError(companyResult.error);
      } else {
        setCompany(companyResult.data);
        
        // Fetch contacts for this company
        const contactsResult = await getContactsByCompanyId(companyId);
        if (contactsResult.data) {
          setContacts(contactsResult.data);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [companyId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this company?')) {
      return;
    }

    setDeleting(true);
    const result = await deleteCompany(companyId);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
    } else {
      router.push('/companies');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getIndustryIcon = (industry?: string) => {
    switch (industry) {
      case 'Technology': return '💻';
      case 'Healthcare': return '🏥';
      case 'Finance': return '💵';
      case 'Retail': return '🛍️';
      case 'Manufacturing': return '🏭';
      case 'Education': return '🎓';
      case 'Real Estate': return '🏠';
      default: return '🏢';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/companies"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Companies
          </Link>
        </div>
        <div className="text-center py-12 text-slate-500">Loading company details...</div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/companies"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Companies
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Company not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/companies"
              className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Companies
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-lg bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-800 text-3xl font-bold">
                {getIndustryIcon(company.industry)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {company.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {company.industry && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                    {company.industry}
                  </span>
                )}
                {company.size && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                    <Users size={12} />
                    {company.size}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/companies/${company.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Edit size={18} />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Information & Contacts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {company.website && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                      <Globe size={16} />
                      Website
                    </div>
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-900 hover:text-indigo-600 hover:underline"
                    >
                      {company.website}
                    </a>
                  </div>
                )}
                
                {company.domain && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                      <Building2 size={16} />
                      Domain
                    </div>
                    <span className="text-slate-900">{company.domain}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {company.phone && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                      <Phone size={16} />
                      Phone
                    </div>
                    <a 
                      href={`tel:${company.phone}`}
                      className="text-slate-900 hover:text-indigo-600 hover:underline"
                    >
                      {company.phone}
                    </a>
                  </div>
                )}
                
                {company.address_line1 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
                      <MapPin size={16} />
                      Address
                    </div>
                    <div className="text-slate-900">
                      <div>{company.address_line1}</div>
                      {company.address_city && (
                        <div>
                          {company.address_city}, {company.address_state} {company.address_country}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Associated Contacts */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Associated Contacts</h2>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-full">
                {contacts.length} contacts
              </span>
            </div>
            
            {contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="block p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-800 font-medium">
                            {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {contact.first_name} {contact.last_name}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                            {contact.title && (
                              <span className="flex items-center gap-1">
                                <Briefcase size={12} />
                                {contact.title}
                              </span>
                            )}
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail size={12} />
                                {contact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <User size={32} className="mx-auto mb-2 opacity-50" />
                <p>No contacts associated with this company</p>
                <p className="text-sm mt-1">Add contacts and assign them to this company</p>
              </div>
            )}
          </div>

          {/* Associated Deals Placeholder */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Associated Deals</h2>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm font-medium rounded-full">
                0 deals
              </span>
            </div>
            <div className="text-center py-8 text-slate-400">
              <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
              <p>No deals associated with this company</p>
              <p className="text-sm mt-1">Deals module coming soon</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">Created</div>
                <div className="flex items-center gap-2 text-slate-900">
                  <Calendar size={16} className="text-slate-400" />
                  {formatDate(company.created_at)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">Last Updated</div>
                <div className="flex items-center gap-2 text-slate-900">
                  <Calendar size={16} className="text-slate-400" />
                  {formatDate(company.updated_at)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                href={`/contacts/new?company=${company.id}`}
                className="w-full flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors block"
              >
                <User size={18} />
                Add New Contact
              </Link>
              <button className="w-full flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                <PhoneCall size={18} />
                Log a Company Call
              </button>
              <button className="w-full flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                <Mail size={18} />
                Send Company Email
              </button>
              <Link
                href={`/companies/${company.id}/edit`}
                className="w-full flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors block"
              >
                <Edit size={18} />
                Edit Company
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

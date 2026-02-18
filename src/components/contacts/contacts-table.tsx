'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Building, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import type { Contact } from '@/lib/api/contacts';

type SortField = 'first_name' | 'last_name' | 'email' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}

function SortableHeader({ field, sortField, sortDirection, onSort, children }: SortableHeaderProps) {
  return (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-50"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        )}
      </div>
    </th>
  );
}

interface ContactsTableProps {
  contacts: Contact[];
  onSort: (field: SortField) => void;
}

export default function ContactsTable({ contacts, onSort }: ContactsTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    onSort(field);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-slate-100 text-slate-800';
      case 'lead': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Contact
            </th>
            <SortableHeader field="email" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Email</SortableHeader>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Phone
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Company
            </th>
            <SortableHeader field="status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Status</SortableHeader>
            <SortableHeader field="created_at" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Created</SortableHeader>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {contacts.map((contact) => (
            <tr 
              key={contact.id}
              className="hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => router.push(`/contacts/${contact.id}`)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    {contact.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- dynamic user-uploaded URL
                      <img 
                        className="h-10 w-10 rounded-full object-cover" 
                        src={contact.avatar_url} 
                        alt={`${contact.first_name} ${contact.last_name}`} 
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-800 font-medium">
                          {getInitials(contact.first_name, contact.last_name)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-slate-900">
                      {contact.first_name} {contact.last_name}
                    </div>
                    {contact.title && (
                      <div className="text-sm text-slate-500">{contact.title}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {contact.email ? (
                  <div className="flex items-center text-sm text-slate-900">
                    <Mail className="mr-2 text-slate-400" size={16} />
                    {contact.email}
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                {contact.phone ? (
                  <div className="flex items-center">
                    <Phone className="mr-2 text-slate-400" size={16} />
                    {contact.phone}
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                {contact.company_id ? (
                  <div className="flex items-center">
                    <Building className="mr-2 text-slate-400" size={16} />
                    <span className="text-slate-600">Company</span>
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contact.status)}`}>
                  {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                <div className="flex items-center">
                  <Calendar className="mr-2 text-slate-400" size={16} />
                  {formatDate(contact.created_at)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Building, Calendar } from 'lucide-react';
import { type Contact } from '@/lib/api/contacts';

interface ContactsVirtualTableProps {
  contacts: Contact[];
  loading?: boolean;
}

export default function ContactsVirtualTable({ 
  contacts, 
  loading = false 
}: ContactsVirtualTableProps) {
  const router = useRouter();
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, // Row height in pixels
    overscan: 5, // Number of items to render outside the viewport
  });

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

  // Handle contact row click
  const handleContactClick = (contactId: string) => {
    router.push(`/contacts/${contactId}`);
  };

  // Calculate total height for the virtual container
  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  return (
    <div className="flex flex-col h-full">
      {/* Table header */}
      <div className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12">
                {/* Checkbox column - for consistency with original design */}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Virtual scrolling container */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-auto relative"
        style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-slate-500">No contacts found</div>
          </div>
        ) : (
          <div 
            style={{
              height: `${totalHeight}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const contact = contacts[virtualRow.index];
              return (
                <div
                  key={contact.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-200"
                  onClick={() => handleContactClick(contact.id)}
                >
                  <table className="min-w-full divide-y divide-slate-200">
                    <tbody>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap w-12">
                          {/* Checkbox placeholder - could add later */}
                          <div className="h-4 w-4 border border-slate-300 rounded"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {contact.avatar_url ? (
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
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-2 text-sm text-slate-600 sticky bottom-0">
        Showing {contacts.length} contacts
      </div>
    </div>
  );
}

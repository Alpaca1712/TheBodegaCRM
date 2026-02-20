'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Building, Calendar, ChevronUp, ChevronDown, Check, Trash2, Tag, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { bulkDeleteContacts, bulkUpdateContacts, bulkTagContacts, type Contact } from '@/lib/api/contacts';

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
  onRefresh?: () => void;
}

export default function ContactsTable({ contacts, onSort, onRefresh }: ContactsTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Selection helpers
  const toggleContactSelection = (contactId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const selectAllContacts = () => {
    if (selectedContacts.size === contacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(contacts.map(contact => contact.id)));
    }
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return;
    
    setIsBulkActionLoading(true);
    const contactIds = Array.from(selectedContacts);
    const result = await bulkDeleteContacts(contactIds);
    
    if (result.error) {
      console.error('Bulk delete error:', result.error);
      alert(`Error deleting contacts: ${result.error}`);
    } else {
      setSelectedContacts(new Set());
      if (onRefresh) onRefresh();
    }
    setIsBulkActionLoading(false);
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'inactive' | 'lead') => {
    if (selectedContacts.size === 0) return;
    
    setIsBulkActionLoading(true);
    const contactIds = Array.from(selectedContacts);
    const result = await bulkUpdateContacts(contactIds, { status });
    
    if (result.error) {
      console.error('Bulk update error:', result.error);
      alert(`Error updating contacts: ${result.error}`);
    } else {
      setSelectedContacts(new Set());
      if (onRefresh) onRefresh();
    }
    setIsBulkActionLoading(false);
  };

  const handleBulkTag = async () => {
    if (selectedContacts.size === 0) return;
    
    const tags = prompt('Enter tags (comma-separated):');
    if (!tags) return;
    
    const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    if (tagList.length === 0) return;
    
    setIsBulkActionLoading(true);
    const contactIds = Array.from(selectedContacts);
    const result = await bulkTagContacts(contactIds, tagList);
    
    if (result.error) {
      console.error('Bulk tag error:', result.error);
      alert(`Error tagging contacts: ${result.error}`);
    } else {
      setSelectedContacts(new Set());
      if (onRefresh) onRefresh();
    }
    setIsBulkActionLoading(false);
  };

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

  const selectedCount = selectedContacts.size;
  const allSelected = contacts.length > 0 && selectedCount === contacts.length;

  return (
    <div>
      {/* Bulk Actions Toolbar */}
      {selectedCount > 0 && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Check className="text-indigo-600" size={18} />
            <span className="text-sm font-medium text-indigo-900">
              {selectedCount} contact{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isBulkActionLoading}>
                  <Users size={16} className="mr-2" />
                  Update Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>
                  Mark as Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusUpdate('inactive')}>
                  Mark as Inactive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusUpdate('lead')}>
                  Mark as Lead
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={handleBulkTag} disabled={isBulkActionLoading}>
              <Tag size={16} className="mr-2" />
              Add Tags
            </Button>

            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isBulkActionLoading}>
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setSelectedContacts(new Set())} disabled={isBulkActionLoading}>
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={selectAllContacts}
                  className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
              </th>
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
              <td className="px-6 py-4 whitespace-nowrap w-12" onClick={(e) => toggleContactSelection(contact.id, e)}>
                <input
                  type="checkbox"
                  checked={selectedContacts.has(contact.id)}
                  onChange={() => {
                    // Create a synthetic mouse event for the toggle function
                    const syntheticEvent = new MouseEvent('click', {
                      bubbles: true,
                      cancelable: true,
                    }) as unknown as React.MouseEvent;
                    toggleContactSelection(contact.id, syntheticEvent);
                  }}
                  className="h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
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
  </div>
);
}

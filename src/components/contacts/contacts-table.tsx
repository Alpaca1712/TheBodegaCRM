'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Building, Calendar, ChevronUp, ChevronDown, Check, Trash2, Tag, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { bulkDeleteContacts, bulkUpdateContacts, bulkTagContacts, updateContact, type Contact } from '@/lib/api/contacts';
import { toast } from 'sonner';

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
      className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
  onContactClick?: (contact: Contact) => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  inactive: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  lead: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
};

export default function ContactsTable({ contacts, onSort, onRefresh, onContactClick }: ContactsTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);

  const toggleContactSelection = (contactId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) newSelected.delete(contactId);
    else newSelected.add(contactId);
    setSelectedContacts(newSelected);
  };

  const selectAllContacts = () => {
    if (selectedContacts.size === contacts.length) setSelectedContacts(new Set());
    else setSelectedContacts(new Set(contacts.map(c => c.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedContacts.size === 0) return;
    setIsBulkActionLoading(true);
    const result = await bulkDeleteContacts(Array.from(selectedContacts));
    if (result.error) {
      toast.error(`Error deleting contacts: ${result.error}`);
    } else {
      toast.success(`Deleted ${selectedContacts.size} contact${selectedContacts.size !== 1 ? 's' : ''}`);
      setSelectedContacts(new Set());
      onRefresh?.();
    }
    setIsBulkActionLoading(false);
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'inactive' | 'lead') => {
    if (selectedContacts.size === 0) return;
    setIsBulkActionLoading(true);
    const result = await bulkUpdateContacts(Array.from(selectedContacts), { status });
    if (result.error) {
      toast.error(`Error updating contacts: ${result.error}`);
    } else {
      toast.success(`Updated ${selectedContacts.size} contact${selectedContacts.size !== 1 ? 's' : ''} to ${status}`);
      setSelectedContacts(new Set());
      onRefresh?.();
    }
    setIsBulkActionLoading(false);
  };

  const handleBulkTag = async () => {
    if (selectedContacts.size === 0) return;
    const tags = window.prompt('Enter tags (comma-separated):');
    if (!tags) return;
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagList.length === 0) return;

    setIsBulkActionLoading(true);
    const result = await bulkTagContacts(Array.from(selectedContacts), tagList);
    if (result.error) {
      toast.error(`Error tagging contacts: ${result.error}`);
    } else {
      toast.success(`Tagged ${selectedContacts.size} contact${selectedContacts.size !== 1 ? 's' : ''}`);
      setSelectedContacts(new Set());
      onRefresh?.();
    }
    setIsBulkActionLoading(false);
  };

  const handleInlineStatusChange = async (contactId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStatusId(null);
    const result = await updateContact(contactId, { status: newStatus as 'active' | 'inactive' | 'lead' });
    if (result.error) toast.error('Failed to update status');
    else {
      toast.success(`Status updated to ${newStatus}`);
      onRefresh?.();
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
    onSort(field);
  };

  const selectedCount = selectedContacts.size;
  const allSelected = contacts.length > 0 && selectedCount === contacts.length;

  return (
    <div>
      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950 border-b border-indigo-100 dark:border-indigo-900">
          <div className="flex items-center gap-2">
            <Check className="text-indigo-600 dark:text-indigo-400" size={16} />
            <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
              {selectedCount} selected
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isBulkActionLoading} className="h-7 text-xs">
                  <Users size={12} className="mr-1.5" /> Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusUpdate('inactive')}>Inactive</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkStatusUpdate('lead')}>Lead</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleBulkTag} disabled={isBulkActionLoading} className="h-7 text-xs">
              <Tag size={12} className="mr-1.5" /> Tag
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isBulkActionLoading} className="h-7 text-xs">
              <Trash2 size={12} className="mr-1.5" /> Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedContacts(new Set())} className="h-7 text-xs">
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={selectAllContacts}
                  className="h-3.5 w-3.5 text-indigo-600 border-zinc-300 dark:border-zinc-600 rounded focus:ring-indigo-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Contact</th>
              <SortableHeader field="email" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Email</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Company</th>
              <SortableHeader field="status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Status</SortableHeader>
              <SortableHeader field="created_at" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Created</SortableHeader>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                onClick={() => onContactClick ? onContactClick(contact) : router.push(`/contacts/${contact.id}`)}
              >
                <td className="px-4 py-3 w-10" onClick={(e) => toggleContactSelection(contact.id, e)}>
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={() => {}}
                    className="h-3.5 w-3.5 text-indigo-600 border-zinc-300 dark:border-zinc-600 rounded focus:ring-indigo-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center">
                      <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-white">
                        {contact.first_name} {contact.last_name}
                      </div>
                      {contact.title && <div className="text-xs text-zinc-500 dark:text-zinc-400">{contact.title}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
                  {contact.email || <span className="text-zinc-400 dark:text-zinc-600">--</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
                  {contact.phone || <span className="text-zinc-400 dark:text-zinc-600">--</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {contact.company_id ? (
                    <span className="text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Building size={13} className="text-zinc-400" />
                      {contact.company_name || 'Unknown'}
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-600">--</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingStatusId(editingStatusId === contact.id ? null : contact.id);
                    }}
                    className={`px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-800 transition-all ${statusColors[contact.status] || statusColors.inactive}`}
                  >
                    {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                  </button>
                  {editingStatusId === contact.id && (
                    <div className="absolute z-20 mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[100px]">
                      {['active', 'inactive', 'lead'].map((s) => (
                        <button
                          key={s}
                          onClick={(e) => handleInlineStatusChange(contact.id, s, e)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                        >
                          <span className={`h-2 w-2 rounded-full ${s === 'active' ? 'bg-emerald-500' : s === 'lead' ? 'bg-indigo-500' : 'bg-zinc-400'}`} />
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

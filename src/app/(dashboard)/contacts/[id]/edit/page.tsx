'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getContactById, updateContact } from '@/lib/api/contacts';
import ContactForm, { type ContactFormData } from '@/components/contacts/contact-form';
import type { Contact } from '@/lib/api/contacts';
import { showUpdateSuccess, showUpdateError, showLoadError } from '@/lib/toast';

export default function EditContactPage() {
  const params = useParams();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contactId = params.id as string;

  useEffect(() => {
    async function fetchContact() {
      setLoading(true);
      const result = await getContactById(contactId);
      if (result.error) {
        setError(result.error);
        showLoadError('Contact');
      } else {
        setContact(result.data);
      }
      setLoading(false);
    }
    fetchContact();
  }, [contactId]);

  const handleSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateContact(contactId, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        company_id: data.company_id,
        title: data.title,
        status: data.status,
        source: data.source,
        notes: data.notes,
      });

      if (result.error) {
        setError(result.error);
        showUpdateError('Contact');
      } else {
        showUpdateSuccess('Contact');
        router.push(`/contacts/${contactId}`);
      }
    } catch {
      setError('An unexpected error occurred');
      showUpdateError('Contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href={`/contacts/${contactId}`}
            className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Contact
          </Link>
        </div>
        <div className="text-center py-12 text-zinc-500">Loading contact data...</div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/contacts"
            className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Contacts
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Contact not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href={`/contacts/${contactId}`}
            className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to Contact
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Edit Contact</h1>
        <p className="text-zinc-600 mt-1">
          Update contact information for {contact.first_name} {contact.last_name}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <ContactForm
        initialData={contact}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

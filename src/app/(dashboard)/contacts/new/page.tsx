'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createContact } from '@/lib/api/contacts';
import ContactForm from '@/components/contacts/contact-form';
import type { ContactFormData } from '@/components/contacts/contact-form';

export default function NewContactPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createContact({
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
      } else {
        router.push('/contacts');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/contacts"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Contacts
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Create New Contact</h1>
        <p className="text-slate-600 mt-1">
          Add a new contact to your CRM database
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <ContactForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  leadFormSchema,
  type LeadFormValues,
  type LeadType,
  LEAD_TYPES,
  PIPELINE_STAGES,
  STAGE_LABELS,
  PRIORITIES,
} from '@/types/leads';
import { Loader2, Sparkles, Plus, X } from 'lucide-react';

interface LeadFormProps {
  defaultValues?: Partial<LeadFormValues>;
  leadId?: string;
  mode: 'create' | 'edit';
}

export default function LeadForm({ defaultValues, leadId, mode }: LeadFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [newHook, setNewHook] = useState('');
  const [enrichmentData, setEnrichmentData] = useState<Record<string, unknown>>({});

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      type: 'customer',
      stage: 'researched',
      priority: 'medium',
      smykm_hooks: [],
      ...defaultValues,
    },
  });

  const watchType = form.watch('type');

  const onSubmit = async (values: LeadFormValues) => {
    setIsSubmitting(true);
    try {
      const url = mode === 'create' ? '/api/leads' : `/api/leads/${leadId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, ...enrichmentData }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save lead');
      }

      const lead = await res.json();
      toast.success(mode === 'create' ? 'Lead created' : 'Lead updated');
      router.push(`/leads/${lead.id || leadId}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResearch = async () => {
    const contactName = form.getValues('contact_name');
    const companyName = form.getValues('company_name');
    const linkedinUrl = form.getValues('contact_linkedin');

    const hasNameAndCompany = contactName && companyName;
    const hasLinkedIn = linkedinUrl && linkedinUrl.trim().length > 0;

    if (!hasNameAndCompany && !hasLinkedIn) {
      toast.error('Enter name + company, or paste a LinkedIn URL');
      return;
    }

    setIsResearching(true);
    try {
      const res = await fetch('/api/ai/research-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.getValues('type'),
          contact_name: contactName || null,
          company_name: companyName || null,
          product_name: form.getValues('product_name'),
          fund_name: form.getValues('fund_name'),
          linkedin_url: linkedinUrl,
          twitter_url: form.getValues('contact_twitter'),
        }),
      });

      if (!res.ok) throw new Error('Research failed');
      const data = await res.json();

      const autoFilled: string[] = [];

      // Auto-fill required fields with shouldValidate to clear errors
      if (data.contact_name && !form.getValues('contact_name')) {
        form.setValue('contact_name', data.contact_name, { shouldValidate: true });
        autoFilled.push('name');
      }
      if (data.company_name && !form.getValues('company_name')) {
        form.setValue('company_name', data.company_name, { shouldValidate: true });
        autoFilled.push('company');
      }

      if (data.company_description) form.setValue('company_description', data.company_description);
      if (data.attack_surface_notes) form.setValue('attack_surface_notes', data.attack_surface_notes);
      if (data.investment_thesis_notes) form.setValue('investment_thesis_notes', data.investment_thesis_notes);
      if (data.personal_details) form.setValue('personal_details', data.personal_details);
      if (data.smykm_hooks?.length) form.setValue('smykm_hooks', data.smykm_hooks);
      if (data.research_sources?.length) form.setValue('research_sources', data.research_sources);

      if (data.contact_email && !form.getValues('contact_email')) {
        form.setValue('contact_email', data.contact_email);
        autoFilled.push('email');
      }
      if (data.contact_linkedin && !form.getValues('contact_linkedin')) {
        form.setValue('contact_linkedin', data.contact_linkedin);
        autoFilled.push('LinkedIn');
      }
      if (data.contact_twitter && !form.getValues('contact_twitter')) {
        form.setValue('contact_twitter', data.contact_twitter);
        autoFilled.push('Twitter');
      }
      if (data.contact_title && !form.getValues('contact_title')) {
        form.setValue('contact_title', data.contact_title, { shouldValidate: true });
        autoFilled.push('title');
      }
      if (data.contact_phone && !form.getValues('contact_phone')) {
        form.setValue('contact_phone', data.contact_phone);
        autoFilled.push('phone');
      }

      // Store enrichment data that doesn't have form fields
      const extra: Record<string, unknown> = {};
      if (data.contact_photo_url) extra.contact_photo_url = data.contact_photo_url;
      if (data.company_website) extra.company_website = data.company_website;
      if (data.company_logo_url) extra.company_logo_url = data.company_logo_url;
      if (data.team_members?.length) {
        extra.org_chart = data.team_members.map((m: { name: string; title: string; department?: string; linkedin_url?: string }) => ({
          name: m.name,
          title: m.title,
          department: m.department || null,
          linkedin_url: m.linkedin_url || null,
          photo_url: null,
          reports_to: null,
          lead_id: null,
        }));
        autoFilled.push(`${data.team_members.length} team members`);
      }
      if (data.contact_photo_url) autoFilled.push('photo');
      if (data.company_logo_url) autoFilled.push('logo');
      setEnrichmentData(prev => ({ ...prev, ...extra }));

      // If editing, also PATCH enrichment data immediately
      if (mode === 'edit' && leadId && Object.keys(extra).length > 0) {
        fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extra),
        }).catch(() => {});
      }

      form.clearErrors();

      toast.success(`Research complete${autoFilled.length ? `: ${autoFilled.join(', ')}` : ''}`);
    } catch {
      toast.error('Failed to research lead. Check API keys.');
    } finally {
      setIsResearching(false);
    }
  };

  const addHook = () => {
    if (!newHook.trim()) return;
    const current = form.getValues('smykm_hooks') || [];
    form.setValue('smykm_hooks', [...current, newHook.trim()]);
    setNewHook('');
  };

  const removeHook = (index: number) => {
    const current = form.getValues('smykm_hooks') || [];
    form.setValue('smykm_hooks', current.filter((_, i) => i !== index));
  };

  const inputClass = 'w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors';
  const labelClass = 'block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1';
  const textareaClass = `${inputClass} min-h-[80px] resize-y`;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Type & Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Basic Information</h3>

        <div className="flex gap-2">
          {LEAD_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => form.setValue('type', t as LeadType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                watchType === t
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {t === 'customer' ? 'Customer' : t === 'investor' ? 'Investor' : 'Partnership'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact_name" className={labelClass}>Contact Name *</label>
            <input id="contact_name" {...form.register('contact_name')} className={inputClass} placeholder="Felix Schlegel" />
            {form.formState.errors.contact_name && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.contact_name.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="contact_title" className={labelClass}>Contact Title</label>
            <input id="contact_title" {...form.register('contact_title')} className={inputClass} placeholder="CTO" />
          </div>
          <div>
            <label htmlFor="company_name" className={labelClass}>Company Name *</label>
            <input id="company_name" {...form.register('company_name')} className={inputClass} placeholder="Parahelp" />
            {form.formState.errors.company_name && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.company_name.message}</p>
            )}
          </div>
          {watchType === 'customer' && (
            <div>
              <label htmlFor="product_name" className={labelClass}>Product Name</label>
              <input id="product_name" {...form.register('product_name')} className={inputClass} placeholder="Mason" />
            </div>
          )}
          {watchType === 'investor' && (
            <div>
              <label htmlFor="fund_name" className={labelClass}>Fund Name</label>
              <input id="fund_name" {...form.register('fund_name')} className={inputClass} placeholder="Notation Capital" />
            </div>
          )}
          {watchType === 'partnership' && (
            <div>
              <label htmlFor="partnership_type" className={labelClass}>Partnership Type</label>
              <input id="partnership_type" {...form.register('product_name')} className={inputClass} placeholder="Agency, cyber insurance, reseller..." />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contact_email" className={labelClass}>Email</label>
            <input id="contact_email" {...form.register('contact_email')} className={inputClass} type="email" placeholder="name@company.com" />
          </div>
          <div>
            <label htmlFor="contact_phone" className={labelClass}>Phone</label>
            <input id="contact_phone" {...form.register('contact_phone')} className={inputClass} type="tel" placeholder="+1 (555) 123-4567" />
          </div>
          <div>
            <label htmlFor="contact_twitter" className={labelClass}>Twitter</label>
            <input id="contact_twitter" {...form.register('contact_twitter')} className={inputClass} placeholder="@handle" />
          </div>
          <div>
            <label htmlFor="contact_linkedin" className={labelClass}>LinkedIn</label>
            <input id="contact_linkedin" {...form.register('contact_linkedin')} className={inputClass} placeholder="linkedin.com/in/..." />
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">Paste a URL and hit Auto-Research to fill everything</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="stage" className={labelClass}>Stage</label>
            <select id="stage" {...form.register('stage')} className={inputClass}>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority" className={labelClass}>Priority</label>
            <select id="priority" {...form.register('priority')} className={inputClass}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="source" className={labelClass}>Source</label>
            <input id="source" {...form.register('source')} className={inputClass} placeholder="LinkedIn, referral, etc." />
          </div>
        </div>
      </div>

      {/* Research Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Research (SMYKM)</h3>
          <button
            type="button"
            onClick={handleResearch}
            disabled={isResearching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg transition-colors disabled:opacity-50"
          >
            {isResearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {isResearching ? 'Researching...' : 'Auto-Research'}
          </button>
        </div>

        <div>
          <label htmlFor="company_description" className={labelClass}>Company Description</label>
          <textarea id="company_description" {...form.register('company_description')} className={textareaClass} placeholder="What does this company do? What's their product?" />
        </div>

        {watchType === 'customer' && (
          <div>
            <label htmlFor="attack_surface_notes" className={labelClass}>Attack Surface Notes</label>
            <textarea
              id="attack_surface_notes"
              {...form.register('attack_surface_notes')}
              className={textareaClass}
              placeholder="How is their AI agent vulnerable? What channels does it use? What tools does it connect to? What data can it access?"
            />
          </div>
        )}
        {watchType === 'investor' && (
          <div>
            <label htmlFor="investment_thesis_notes" className={labelClass}>Investment Thesis Notes</label>
            <textarea
              id="investment_thesis_notes"
              {...form.register('investment_thesis_notes')}
              className={textareaClass}
              placeholder="What do they invest in? What's their thesis? What blog posts have they written?"
            />
          </div>
        )}
        {watchType === 'partnership' && (
          <div>
            <label htmlFor="partnership_notes" className={labelClass}>Partnership Opportunity Notes</label>
            <textarea
              id="partnership_notes"
              {...form.register('investment_thesis_notes')}
              className={textareaClass}
              placeholder="What kind of partnership? Lead gen agency, cyber insurance, reseller, integration partner? What's the mutual value prop?"
            />
          </div>
        )}

        <div>
          <label htmlFor="personal_details" className={labelClass}>Personal Details</label>
          <textarea
            id="personal_details"
            {...form.register('personal_details')}
            className={textareaClass}
            placeholder="Blog posts, podcast quotes, GitHub activity, personal story, career arc, side projects..."
          />
        </div>

        <div>
          <label htmlFor="new-hook" className={labelClass}>SMYKM Hooks</label>
          <p id="smykm-helper" className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
            Specific details that only this person would recognize in a subject line
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {(form.watch('smykm_hooks') || []).map((hook, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-md text-xs"
              >
                {hook}
                <button
                  type="button"
                  onClick={() => removeHook(i)}
                  aria-label={`Remove hook: ${hook}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              id="new-hook"
              value={newHook}
              onChange={(e) => setNewHook(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHook(); } }}
              className={inputClass}
              placeholder="e.g. Jugend Hackt → boring machines → AI"
              aria-describedby="smykm-helper"
            />
            <button
              type="button"
              onClick={addHook}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              aria-label="Add SMYKM hook"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className={labelClass}>Notes</label>
          <textarea id="notes" {...form.register('notes')} className={textareaClass} placeholder="Any other notes about this lead..." />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Lead' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

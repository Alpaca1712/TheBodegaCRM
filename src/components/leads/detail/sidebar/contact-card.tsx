import { Mail, Linkedin, Twitter, Phone, Building2, Globe } from 'lucide-react';
import type { Lead } from '@/types/leads';

export function ContactCard({ lead }: { lead: Lead }) {
  const initials = lead.contact_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        {lead.contact_photo_url ? (
          <img
            src={lead.contact_photo_url}
            alt={lead.contact_name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-700"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
          />
        ) : null}
        <div className={`h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-sm font-bold text-red-600 dark:text-red-400 ring-2 ring-zinc-100 dark:ring-zinc-700 ${lead.contact_photo_url ? 'hidden' : ''}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{lead.contact_name}</p>
          {lead.contact_title && <p className="text-[11px] text-zinc-500 truncate">{lead.contact_title}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
        {lead.company_logo_url ? (
          <img src={lead.company_logo_url} alt="" className="h-5 w-5 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <Building2 className="h-4 w-4 text-zinc-400" />
        )}
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{lead.company_name}</span>
        {lead.company_website && (
          <a href={lead.company_website.startsWith('http') ? lead.company_website : `https://${lead.company_website}`} target="_blank" rel="noopener noreferrer" className="ml-auto">
            <Globe className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500 transition-colors" />
          </a>
        )}
      </div>
      <div className="space-y-2">
        {lead.contact_email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <a href={`mailto:${lead.contact_email}`} className="text-xs text-red-600 dark:text-red-400 hover:underline truncate">{lead.contact_email}</a>
          </div>
        )}
        {lead.contact_linkedin && (
          <div className="flex items-center gap-2">
            <Linkedin className="h-3.5 w-3.5 text-[#0A66C2] shrink-0" />
            <a href={lead.contact_linkedin.startsWith('http') ? lead.contact_linkedin : `https://${lead.contact_linkedin}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0A66C2] hover:underline truncate">LinkedIn Profile</a>
          </div>
        )}
        {lead.contact_twitter && (
          <div className="flex items-center gap-2">
            <Twitter className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <a href={`https://twitter.com/${lead.contact_twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 dark:text-red-400 hover:underline">{lead.contact_twitter}</a>
          </div>
        )}
        {lead.contact_phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <a href={`tel:${lead.contact_phone}`} className="text-xs text-red-600 dark:text-red-400 hover:underline">{lead.contact_phone}</a>
          </div>
        )}
      </div>
    </div>
  );
}

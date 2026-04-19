'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetHeader, SheetBody } from '@/components/ui/sheet';
import EmailGenerator from '@/components/email/email-generator';
import type { Lead, LeadEmail } from '@/types/leads';
import { Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface FollowUpSheetProps {
  lead: Lead | null;
  initialFollowUpType: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEmailSaved?: () => void;
}

export function FollowUpSheet({
  lead,
  initialFollowUpType,
  isOpen,
  onOpenChange,
  onEmailSaved
}: FollowUpSheetProps) {
  const [emails, setEmails] = useState<LeadEmail[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeadData = useCallback(async () => {
    if (!lead) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch (error) {
      console.error('Failed to fetch lead emails:', error);
    } finally {
      setLoading(false);
    }
  }, [lead]);

  useEffect(() => {
    if (isOpen && lead) {
      fetchLeadData();
    } else {
      setEmails([]);
    }
  }, [isOpen, lead, fetchLeadData]);

  const handleEmailSaved = () => {
    onEmailSaved?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} className="max-w-2xl">
      <SheetHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Draft Follow-up
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {lead?.contact_name} · {lead?.company_name}
            </p>
          </div>
          {lead && (
            <Link
              href={`/leads/${lead.id}`}
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-zinc-500 hover:text-red-600 transition-colors"
            >
              View Profile
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </SheetHeader>
      <SheetBody>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
            <p className="text-sm text-zinc-500 font-medium">Loading context...</p>
          </div>
        ) : lead ? (
          <div className="py-2">
            <EmailGenerator
              lead={lead}
              emails={emails}
              followUpType={initialFollowUpType}
              onEmailSaved={handleEmailSaved}
            />
          </div>
        ) : null}
      </SheetBody>
    </Sheet>
  );
}

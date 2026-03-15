'use client';

import FollowUpSuggestions from '@/components/email/follow-up-suggestions';

export default function FollowUpsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Follow-ups</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Leads that need follow-up based on the McKenna + Hormozi sequence
        </p>
      </div>

      <FollowUpSuggestions />
    </div>
  );
}

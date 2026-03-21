'use client';

import FollowUpSuggestions from '@/components/email/follow-up-suggestions';

export default function FollowUpsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Follow-ups</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          McKenna + Hormozi sequence tracker. Replies are prioritized first.
        </p>
      </div>

      <FollowUpSuggestions />
    </div>
  );
}

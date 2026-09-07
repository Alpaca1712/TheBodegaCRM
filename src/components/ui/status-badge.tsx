const TONES: Record<string, string> = {
  // lead stages
  new: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  contacted: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  replied: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  interested: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  meeting_booked: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  customer: 'bg-emerald-600 text-white',
  not_interested: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  lost: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  unsubscribed: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  bounced: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200',
  // sequence / enrollment statuses
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  paused: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  archived: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  completed: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  exited: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  // email delivery
  queued: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  sent: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  delivery_delayed: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  complained: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200',
  failed: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  suppressed: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  received: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  // email verification
  valid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  invalid: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  accept_all: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  unverified: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  unknown: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  webmail: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  disposable: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
}

export function StatusBadge({ value, className = '' }: { value: string | null | undefined; className?: string }) {
  if (!value) return null
  const tone = TONES[value] || TONES.new
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${tone} ${className}`}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}

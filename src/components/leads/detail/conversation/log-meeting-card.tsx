import { Plus, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function LogMeetingCard({ open, setOpen, notes, setNotes, type, setType, loading, onSubmit }: {
  open: boolean; setOpen: (v: boolean) => void;
  notes: string; setNotes: (v: string) => void;
  type: 'call' | 'meeting' | 'demo'; setType: (v: 'call' | 'meeting' | 'demo') => void;
  loading: boolean; onSubmit: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (!loading && notes.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left"
        aria-expanded={open}
      >
        <Plus className={`h-3.5 w-3.5 text-red-500 transition-transform ${open ? 'rotate-45' : ''}`} />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log Meeting / Call</h3>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'call' | 'meeting' | 'demo')}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
            aria-label="Meeting type"
          >
            <option value="meeting">Meeting</option>
            <option value="call">Call</option>
            <option value="demo">Demo</option>
          </select>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste transcript or type notes..."
            className="min-h-[100px] bg-zinc-50 dark:bg-zinc-800"
            aria-label="Meeting notes"
          />
          <Button
            onClick={onSubmit}
            disabled={loading || !notes.trim()}
            isLoading={loading}
            className="w-full h-8 text-xs"
          >
            {!loading && <Brain className="h-3.5 w-3.5 mr-1.5" />}
            {loading ? 'Summarizing...' : 'Summarize with AI'}
          </Button>
        </div>
      )}
    </div>
  );
}

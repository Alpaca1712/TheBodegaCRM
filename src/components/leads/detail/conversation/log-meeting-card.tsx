import { Plus, Loader2, Brain } from 'lucide-react';

export function LogMeetingCard({ open, setOpen, notes, setNotes, type, setType, loading, onSubmit }: {
  open: boolean; setOpen: (v: boolean) => void;
  notes: string; setNotes: (v: string) => void;
  type: 'call' | 'meeting' | 'demo'; setType: (v: 'call' | 'meeting' | 'demo') => void;
  loading: boolean; onSubmit: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left">
        <Plus className={`h-3.5 w-3.5 text-red-500 transition-transform ${open ? 'rotate-45' : ''}`} />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Log Meeting / Call</h3>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <select value={type} onChange={(e) => setType(e.target.value as 'call' | 'meeting' | 'demo')} className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-xs">
            <option value="meeting">Meeting</option>
            <option value="call">Call</option>
            <option value="demo">Demo</option>
          </select>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste transcript or type notes..." className="w-full min-h-[100px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 resize-y" />
          <button onClick={onSubmit} disabled={loading || !notes.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50 w-full justify-center">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {loading ? 'Summarizing...' : 'Summarize with AI'}
          </button>
        </div>
      )}
    </div>
  );
}

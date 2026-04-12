'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

export function InlineNotes({ leadId, initialNotes, onSaved }: { leadId: string; initialNotes: string | null; onSaved: (notes: string) => void }) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (value: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: value }) });
      if (res.ok) onSaved(value);
    } catch {
      toast.error('Failed to save notes');
    } finally { setSaving(false); }
  }, [leadId, onSaved]);

  const handleChange = (value: string) => {
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => save(value), 1500);
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notes</h3>
        {saving && <span className="text-[10px] text-zinc-400 animate-pulse">Saving...</span>}
      </div>
      <Textarea
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); save(notes); } }}
        placeholder="Paste LinkedIn DMs, call notes, or any context..."
        className="min-h-[80px] bg-zinc-50 dark:bg-zinc-800"
      />
    </div>
  );
}

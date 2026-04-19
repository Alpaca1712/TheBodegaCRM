'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, BookOpen, Trash } from 'lucide-react';
import type { AgentMemory } from '@/types/leads-detail';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const typeColors: Record<string, string> = {
  preference: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600',
  objection: 'bg-red-100 dark:bg-red-900/40 text-red-600',
  personal: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600',
  strategic: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600',
  context: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600',
};

export function MemoryTab({ memories, onDelete, leadId, onRefresh }: { memories: AgentMemory[]; onDelete: (id: string) => void; leadId: string; onRefresh: () => void }) {
  const [addContent, setAddContent] = useState('');
  const [addType, setAddType] = useState('context');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!addContent.trim()) return;
    setAdding(true);
    try {
      await fetch('/api/ai/extract-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, text: addContent, source: 'manual' }),
      });
      setAddContent('');
      onRefresh();
      toast.success('Memory added');
    } catch {
      toast.error('Failed to add');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add Memory</h3>
        <div>
          <Label htmlFor="memory-content" className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">Memory Content</Label>
          <Textarea
            id="memory-content"
            value={addContent}
            onChange={(e) => setAddContent(e.target.value)}
            placeholder="Type a fact, preference, or context to remember about this lead..."
            className="min-h-[60px] bg-zinc-50 dark:bg-zinc-800 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Memory type"
            value={addType}
            onChange={(e) => setAddType(e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors"
          >
            <option value="context">Context</option>
            <option value="preference">Preference</option>
            <option value="objection">Objection</option>
            <option value="personal">Personal</option>
            <option value="strategic">Strategic</option>
          </select>
          <Button
            onClick={handleAdd}
            disabled={adding || !addContent.trim()}
            isLoading={adding}
            size="sm"
            className="rounded-lg h-auto py-1.5"
          >
            {!adding && <Plus className="h-3.5 w-3.5 mr-1.5" />}
            Add
          </Button>
        </div>
      </div>

      {memories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <BookOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No memories yet</p>
          <p className="text-xs text-zinc-400 mt-1">Memories are auto-extracted from email syncs and interactions, or add them manually above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map(m => (
            <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 group">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${typeColors[m.memory_type] || typeColors.context}`}>
                {m.memory_type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">{m.content}</p>
                <p className="text-[10px] text-zinc-400 mt-1">
                  {m.source && `Source: ${m.source}`}
                  {m.source && ' / '}
                  Relevance: {m.relevance_score}/10
                  {' / '}
                  {new Date(m.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => onDelete(m.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                aria-label="Delete memory"
              >
                <Trash className="h-3 w-3 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

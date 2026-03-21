'use client';

import { useState, useEffect } from 'react';
import { Loader2, Target, Users, Crosshair, Handshake } from 'lucide-react';
import LeadPipelineBoard from '@/components/leads/lead-pipeline-board';
import type { Lead, LeadType, PipelineStage } from '@/types/leads';

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<LeadType | ''>('');

  useEffect(() => {
    fetchLeads();
  }, [typeFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (typeFilter) params.set('type', typeFilter);

    try {
      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.data || []);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const handleLeadUpdate = (leadId: string, newStage: PipelineStage) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Pipeline</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Drag leads between stages to update their status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTypeFilter('')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              !typeFilter ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            All
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === 'customer' ? '' : 'customer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              typeFilter === 'customer' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Customers
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === 'investor' ? '' : 'investor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              typeFilter === 'investor' ? 'bg-purple-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            Investors
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === 'partnership' ? '' : 'partnership')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              typeFilter === 'partnership' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Handshake className="h-3.5 w-3.5" />
            Partnerships
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : (
        <LeadPipelineBoard leads={leads} onLeadUpdate={handleLeadUpdate} />
      )}
    </div>
  );
}

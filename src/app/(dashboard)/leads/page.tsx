'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Plus, Search, Upload, Target, Users, Crosshair, Handshake, Download, Trash2, X, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import LeadsTable from '@/components/leads/leads-table';
import { toast } from 'sonner';
import type { Lead, LeadType, PipelineStage, Priority } from '@/types/leads';
import { PIPELINE_STAGES, STAGE_LABELS, PRIORITIES } from '@/types/leads';
import { exportLeadsToCsv } from '@/lib/csv-export';

const PAGE_SIZE = 50;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LeadType | ''>('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page, setPage] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (stageFilter) params.set('stage', stageFilter);
    if (search) params.set('search', search);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(page * PAGE_SIZE));

    try {
      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.data || []);
        setCount(data.count || 0);
      } else {
        throw new Error(`Failed to fetch leads (${res.status})`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leads';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, stageFilter, search, page]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [typeFilter, stageFilter, search]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchLeads, search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Drop stale selection IDs when the visible lead set changes
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visible = new Set(leads.map((l) => l.id));
    let changed = false;
    const next = new Set<string>();
    selectedIds.forEach((id) => {
      if (visible.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelectedIds(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  const selectedLeads = useMemo(
    () => leads.filter((l) => selectedIds.has(l.id)),
    [leads, selectedIds],
  );

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(leads.map((l) => l.id)) : new Set());
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleExport = () => {
    const rows = selectedIds.size > 0 ? selectedLeads : leads;
    if (rows.length === 0) {
      toast.error('No leads to export');
      return;
    }
    exportLeadsToCsv(rows);
    toast.success(`Exported ${rows.length} lead${rows.length !== 1 ? 's' : ''} to CSV`);
  };

  const bulkRequest = async (body: Record<string, unknown>, successMsg: (n: number) => string) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Bulk operation failed');
      const affected = Number(data?.affected ?? selectedIds.size);
      toast.success(successMsg(affected));
      clearSelection();
      await fetchLeads();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk operation failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} lead${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    void bulkRequest({ action: 'delete' }, (n) => `Deleted ${n} lead${n !== 1 ? 's' : ''}`);
  };

  const handleBulkStage = (stage: PipelineStage) => {
    void bulkRequest(
      { action: 'update', updates: { stage } },
      (n) => `Moved ${n} lead${n !== 1 ? 's' : ''} to ${STAGE_LABELS[stage]}`,
    );
  };

  const handleBulkPriority = (priority: Priority) => {
    void bulkRequest(
      { action: 'update', updates: { priority } },
      (n) => `Set ${n} lead${n !== 1 ? 's' : ''} to ${priority} priority`,
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Leads</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {count} lead{count !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectionMode((v) => !v);
              clearSelection();
            }}
            aria-pressed={selectionMode}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              selectionMode
                ? 'bg-red-600 text-white border-red-600 hover:bg-red-500'
                : 'text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectionMode ? 'Done' : 'Select'}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <Link
            href="/leads/import"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Link>
          <Link
            href="/leads/new?type=customer"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-lg transition-all shadow-sm shadow-red-600/20"
          >
            <Plus className="h-3.5 w-3.5" />
            New Lead
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            aria-label="Search leads"
            className="w-full pl-9 pr-12 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {search && (
              <button
                onClick={() => setSearch('')}
                className="p-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {!search && (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm">
                /
              </kbd>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" role="group" aria-label="Filter by lead type">
          <button
            onClick={() => setTypeFilter('')}
            aria-pressed={!typeFilter}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              !typeFilter ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            All
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === 'customer' ? '' : 'customer')}
            aria-pressed={typeFilter === 'customer'}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              typeFilter === 'customer' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Customers
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === 'investor' ? '' : 'investor')}
            aria-pressed={typeFilter === 'investor'}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              typeFilter === 'investor' ? 'bg-purple-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            Investors
          </button>
          <button
            onClick={() => setTypeFilter(typeFilter === 'partnership' ? '' : 'partnership')}
            aria-pressed={typeFilter === 'partnership'}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              typeFilter === 'partnership' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Handshake className="h-3.5 w-3.5" />
            Partnerships
          </button>
        </div>

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as PipelineStage | '')}
          className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-red-500/20"
        >
          <option value="">All stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>{STAGE_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20">
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            {selectedIds.size} selected
          </span>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <select
            disabled={bulkBusy}
            value=""
            onChange={(e) => {
              const v = e.target.value as PipelineStage | '';
              if (v) handleBulkStage(v);
            }}
            aria-label="Change stage"
            className="px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
          >
            <option value="">Change stage…</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
          <select
            disabled={bulkBusy}
            value=""
            onChange={(e) => {
              const v = e.target.value as Priority | '';
              if (v) handleBulkPriority(v);
            }}
            aria-label="Change priority"
            className="px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
          >
            <option value="">Change priority…</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <button
            disabled={bulkBusy}
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            <Download className="h-3 w-3" />
            Export selected
          </button>
          <button
            disabled={bulkBusy}
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-md disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
          <button
            onClick={clearSelection}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={fetchLeads}
            className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <LeadsTable
          leads={leads}
          selectable={selectionMode}
          selectedIds={selectedIds}
          onToggleOne={toggleOne}
          onToggleAll={toggleAll}
          isFiltered={!!(search || typeFilter || stageFilter)}
          onClearFilters={() => {
            setSearch('');
            setTypeFilter('');
            setStageFilter('');
          }}
        />
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count)} of {count} leads
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
              .reduce<number[]>((acc, i, idx, arr) => {
                if (idx > 0 && i - arr[idx - 1] > 1) acc.push(-1);
                acc.push(i);
                return acc;
              }, [])
              .map((i, idx) =>
                i === -1 ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-zinc-400">…</span>
                ) : (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    aria-current={page === i ? 'page' : undefined}
                    className={`min-w-[28px] h-7 text-xs font-medium rounded-md transition-colors ${
                      page === i
                        ? 'bg-red-600 text-white'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {i + 1}
                  </button>
                ),
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
              className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

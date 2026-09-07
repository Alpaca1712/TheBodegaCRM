'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, Section } from '@/components/ui/page-header';
import { Textarea } from '@/components/ui/textarea';
import { api, apiJson, formatRelative } from '@/lib/api/client';
import type { AiSettings, ApiKey, SenderSettings } from '@/types';

interface SettingsResponse {
  data: {
    ai: AiSettings
    sender: SenderSettings
    landing: { base_url: string }
    integrations: { resend: boolean; hunter: boolean; novita: boolean }
  }
}

interface ModelsResponse {
  data: { default_model: string; configured: boolean; presets: { id: string; label: string; note: string }[] }
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api<SettingsResponse>('/settings') });
  const models = useQuery({ queryKey: ['ai-models'], queryFn: () => api<ModelsResponse>('/ai/models') });
  const keys = useQuery({ queryKey: ['api-keys'], queryFn: () => api<{ data: ApiKey[] }>('/api-keys') });

  const [sender, setSender] = useState<Partial<SenderSettings> | null>(null);
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  const saveSettings = useMutation({
    mutationFn: (patch: Record<string, unknown>) => apiJson('/settings', 'PATCH', patch),
    onSuccess: () => { toast.success('Settings saved'); setSender(null); queryClient.invalidateQueries({ queryKey: ['settings'] }); queryClient.invalidateQueries({ queryKey: ['ai-models'] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Save failed'),
  });
  const createKey = useMutation({
    mutationFn: () => apiJson<{ data: ApiKey & { key: string } }>('/api-keys', 'POST', { name: keyName }),
    onSuccess: (result) => { setNewKey(result.data.key); setKeyName(''); queryClient.invalidateQueries({ queryKey: ['api-keys'] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed'),
  });
  const revokeKey = useMutation({
    mutationFn: (id: string) => apiJson(`/api-keys/${id}`, 'DELETE'),
    onSuccess: () => { toast.success('Key revoked'); queryClient.invalidateQueries({ queryKey: ['api-keys'] }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed'),
  });

  const current = settings.data?.data;
  const senderForm = { ...(current?.sender || {}), ...(sender || {}) } as SenderSettings;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div>
      <PageHeader title="Settings" description="Sender identity, AI model for step conditions, API keys for Claude and other agents." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="API keys" className="lg:col-span-2">
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Keys authenticate the REST API (<code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">Authorization: Bearer bdg_…</code>) and the MCP server at{' '}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{origin}/api/mcp</code>. In Claude.ai, add a custom connector with that URL and put <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">Bearer bdg_…</code> in the Authorization request header. In Claude Code:{' '}
            <code className="rounded bg-zinc-100 px-1 text-[12px] dark:bg-zinc-800">claude mcp add --transport http bodega {origin}/api/mcp --header &quot;Authorization: Bearer bdg_…&quot;</code>
          </p>
          {newKey ? (
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="mb-1 font-medium text-emerald-800 dark:text-emerald-200">Copy this key now — it will not be shown again.</p>
              <div className="flex items-center gap-2 font-mono text-xs text-emerald-900 dark:text-emerald-100">
                <span className="break-all">{newKey}</span>
                <CopyButton value={newKey} label="API key" />
              </div>
              <button className="mt-2 text-xs text-emerald-700 underline dark:text-emerald-300" onClick={() => setNewKey(null)}>Done</button>
            </div>
          ) : null}
          <form className="mb-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (keyName.trim()) createKey.mutate(); }}>
            <Input value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Key name, e.g. claude-web" className="h-9 max-w-xs" />
            <Button type="submit" size="sm" disabled={!keyName.trim()} isLoading={createKey.isPending}><KeyRound className="mr-1.5 h-3.5 w-3.5" /> Create key</Button>
          </form>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {keys.data?.data.length === 0 ? <li className="py-2 text-sm text-zinc-400">No keys yet.</li> : null}
            {keys.data?.data.map((key) => (
              <li key={key.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className={`font-medium ${key.revoked_at ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>{key.name}</span>
                  <span className="ml-2 font-mono text-xs text-zinc-500">{key.key_prefix}…</span>
                  <span className="ml-2 text-xs text-zinc-400">created {formatRelative(key.created_at)}{key.last_used_at ? ` · used ${formatRelative(key.last_used_at)}` : ' · never used'}{key.revoked_at ? ' · revoked' : ''}</span>
                </div>
                {!key.revoked_at ? <button onClick={() => revokeKey.mutate(key.id)} className="rounded p-1 text-zinc-400 hover:text-red-600" aria-label="Revoke key"><Trash2 className="h-4 w-4" /></button> : null}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Sender identity" actions={sender ? <Button size="sm" onClick={() => saveSettings.mutate({ sender: senderForm })} isLoading={saveSettings.isPending}>Save</Button> : null}>
          <div className="space-y-3">
            <div><Label htmlFor="from_name">From name</Label><Input id="from_name" value={senderForm.from_name || ''} onChange={(event) => setSender({ ...senderForm, from_name: event.target.value })} /></div>
            <div><Label htmlFor="from_email">From email</Label><Input id="from_email" value={senderForm.from_email || ''} onChange={(event) => setSender({ ...senderForm, from_email: event.target.value })} placeholder="daniel@mail.pigeonlabs.nyc" /><p className="mt-1 text-xs text-zinc-400">Must be on a domain verified in Resend. Replies to this address land in the inbox.</p></div>
            <div><Label htmlFor="reply_to">Reply-To (optional)</Label><Input id="reply_to" value={senderForm.reply_to || ''} onChange={(event) => setSender({ ...senderForm, reply_to: event.target.value || null })} /></div>
            <div><Label htmlFor="signature">Signature</Label><Textarea id="signature" rows={4} value={senderForm.signature || ''} onChange={(event) => setSender({ ...senderForm, signature: event.target.value })} placeholder={'Daniel Chalco\nPigeon Labs'} /></div>
          </div>
        </Section>

        <div className="space-y-4">
          <Section title="AI model for step conditions">
            <p className="mb-2 text-xs text-zinc-500">Only used when a step has a natural-language condition. Novita: {models.data?.data.configured ? 'configured' : 'NOVITA_API_KEY missing'}.</p>
            <select
              value={current?.ai.default_model || ''}
              onChange={(event) => saveSettings.mutate({ ai: { default_model: event.target.value } })}
              className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              {models.data?.data.presets.map((model) => <option key={model.id} value={model.id}>{model.label} — {model.note}</option>)}
              {current && models.data && !models.data.data.presets.some((model) => model.id === current.ai.default_model) ? <option value={current.ai.default_model}>{current.ai.default_model}</option> : null}
            </select>
            <p className="mt-2 text-xs text-zinc-400">Any Novita model id can be set through the API or per step with <code>condition_model</code>.</p>
          </Section>

          <Section title="Integrations">
            <ul className="space-y-2 text-sm">
              {[
                ['Resend (sending + inbound webhook)', current?.integrations.resend],
                ['Hunter.io (email finder / verifier)', current?.integrations.hunter],
                ['Novita (AI conditions)', current?.integrations.novita],
              ].map(([label, ready]) => (
                <li key={String(label)} className="flex items-center justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                  <span className={`text-xs font-medium ${ready ? 'text-emerald-600' : 'text-amber-600'}`}>{ready ? 'configured' : 'missing env var'}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-zinc-400">Resend webhook URL: <code className="break-all">{origin}/api/webhooks/resend</code> (events: all email.*). Landing webhook: <code className="break-all">{origin}/api/landing/leads</code>.</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

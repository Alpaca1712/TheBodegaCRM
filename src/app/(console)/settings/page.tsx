'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, KeyRound, Plug, Sparkles, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { PageBody, PageFrame, PageHeader } from '@/components/console/page-frame';
import { Surface, SurfaceBody, SurfaceHeader } from '@/components/console/surface';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    onSuccess: () => {
      toast.success('Settings saved');
      setSender(null);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['ai-models'] });
    },
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
    <PageFrame>
      <PageHeader
        title="Settings"
        description="Sender identity, AI model for step conditions, and API keys for Claude."
      />
      <PageBody>
        <div className="mx-auto grid max-w-5xl gap-4 p-5 lg:grid-cols-2">
          <Surface className="lg:col-span-2">
            <SurfaceHeader title={<span className="inline-flex items-center gap-2"><KeyRound className="h-3.5 w-3.5 text-muted-foreground" /> API keys</span>} />
            <SurfaceBody>
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                Keys authenticate the REST API (<code className="rounded bg-muted px-1 text-[12px]">Authorization: Bearer bdg_…</code>) and MCP at{' '}
                <code className="rounded bg-muted px-1 text-[12px]">{origin}/api/mcp</code>.
              </p>
              {newKey ? (
                <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
                  <p className="mb-1 font-medium text-emerald-800 dark:text-emerald-200">Copy this key now — it will not be shown again.</p>
                  <div className="flex items-center gap-2 font-mono text-xs text-emerald-900 dark:text-emerald-100">
                    <span className="break-all">{newKey}</span>
                    <CopyButton value={newKey} label="API key" />
                  </div>
                  <button className="mt-2 text-xs text-emerald-700 underline dark:text-emerald-300" onClick={() => setNewKey(null)}>Done</button>
                </div>
              ) : null}
              <form className="mb-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (keyName.trim()) createKey.mutate(); }}>
                <Input value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Key name, e.g. claude-web" className="h-9 max-w-xs border-border bg-background" />
                <Button type="submit" size="sm" disabled={!keyName.trim()} isLoading={createKey.isPending}>
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Create key
                </Button>
              </form>
              <ul className="divide-y divide-border">
                {keys.data?.data.length === 0 ? <li className="py-3 text-sm text-muted-foreground">No keys yet.</li> : null}
                {keys.data?.data.map((key) => (
                  <li key={key.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <span className={`font-medium ${key.revoked_at ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{key.name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">{key.key_prefix}…</span>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        created {formatRelative(key.created_at)}
                        {key.last_used_at ? ` · used ${formatRelative(key.last_used_at)}` : ' · never used'}
                        {key.revoked_at ? ' · revoked' : ''}
                      </div>
                    </div>
                    {!key.revoked_at ? (
                      <button onClick={() => revokeKey.mutate(key.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/30" aria-label="Revoke key">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </SurfaceBody>
          </Surface>

          <Surface>
            <SurfaceHeader
              title={<span className="inline-flex items-center gap-2"><UserRound className="h-3.5 w-3.5 text-muted-foreground" /> Sender identity</span>}
              actions={sender ? <Button size="sm" onClick={() => saveSettings.mutate({ sender: senderForm })} isLoading={saveSettings.isPending}>Save</Button> : null}
            />
            <SurfaceBody className="space-y-3">
              <div>
                <Label htmlFor="from_name">From name</Label>
                <Input id="from_name" value={senderForm.from_name || ''} onChange={(event) => setSender({ ...senderForm, from_name: event.target.value })} className="border-border bg-background" />
              </div>
              <div>
                <Label htmlFor="from_email">From email</Label>
                <Input id="from_email" value={senderForm.from_email || ''} onChange={(event) => setSender({ ...senderForm, from_email: event.target.value })} placeholder="daniel@mail.pigeonlabs.nyc" className="border-border bg-background" />
                <p className="mt-1 text-xs text-muted-foreground">Must be on a domain verified in Resend.</p>
              </div>
              <div>
                <Label htmlFor="reply_to">Reply-To (optional)</Label>
                <Input id="reply_to" value={senderForm.reply_to || ''} onChange={(event) => setSender({ ...senderForm, reply_to: event.target.value || null })} className="border-border bg-background" />
              </div>
              <div>
                <Label htmlFor="signature">Signature</Label>
                <Textarea id="signature" rows={4} value={senderForm.signature || ''} onChange={(event) => setSender({ ...senderForm, signature: event.target.value })} placeholder={'Daniel Chalco\nPigeon Labs'} className="border-border bg-background" />
              </div>
            </SurfaceBody>
          </Surface>

          <div className="space-y-4">
            <Surface>
              <SurfaceHeader title={<span className="inline-flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-muted-foreground" /> AI model</span>} />
              <SurfaceBody>
                <p className="mb-2 text-xs text-muted-foreground">
                  Used for natural-language step conditions. Novita:{' '}
                  {models.data?.data.configured ? <span className="font-medium text-emerald-600">configured</span> : <span className="font-medium text-amber-600">NOVITA_API_KEY missing</span>}.
                </p>
                <select
                  value={current?.ai.default_model || ''}
                  onChange={(event) => saveSettings.mutate({ ai: { default_model: event.target.value } })}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {models.data?.data.presets.map((model) => (
                    <option key={model.id} value={model.id}>{model.label} — {model.note}</option>
                  ))}
                  {current && models.data && !models.data.data.presets.some((model) => model.id === current.ai.default_model) ? (
                    <option value={current.ai.default_model}>{current.ai.default_model}</option>
                  ) : null}
                </select>
              </SurfaceBody>
            </Surface>

            <Surface>
              <SurfaceHeader title={<span className="inline-flex items-center gap-2"><Plug className="h-3.5 w-3.5 text-muted-foreground" /> Integrations</span>} />
              <SurfaceBody>
                <ul className="space-y-2 text-sm">
                  {[
                    ['Resend (sending + inbound webhook)', current?.integrations.resend],
                    ['Hunter.io (email finder / verifier)', current?.integrations.hunter],
                    ['Novita (AI conditions)', current?.integrations.novita],
                  ].map(([label, ready]) => (
                    <li key={String(label)} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2">
                      <span className="text-foreground">{label}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${ready ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                        {ready ? 'configured' : 'missing env var'}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Resend webhook: <code className="break-all">{origin}/api/webhooks/resend</code>
                  <br />
                  Landing webhook: <code className="break-all">{origin}/api/landing/leads</code>
                </p>
              </SurfaceBody>
            </Surface>
          </div>
        </div>
      </PageBody>
    </PageFrame>
  );
}

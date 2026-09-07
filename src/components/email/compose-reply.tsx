'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiJson } from '@/lib/api/client';
import type { Email } from '@/types';

interface ComposeReplyProps {
  leadId: string;
  replyTo?: Email | null;
  onSent?: (email: Email) => void;
}

export function ComposeReply({ leadId, replyTo, onSent }: ComposeReplyProps) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const send = useMutation({
    mutationFn: () => apiJson<{ data: Email }>('/emails/send', 'POST', {
      lead_id: leadId,
      subject,
      body,
      reply_to_email_id: replyTo?.id ?? null,
    }, 'Failed to send'),
    onSuccess: (result) => {
      toast.success('Email sent');
      setBody('');
      setSubject('');
      queryClient.invalidateQueries({ queryKey: ['lead-thread', leadId] });
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      onSent?.(result.data);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to send'),
  });

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); if (body.trim()) send.mutate(); }}
      className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {replyTo ? <>Replying in thread: <span className="font-medium text-zinc-700 dark:text-zinc-300">{replyTo.subject || '(no subject)'}</span></> : 'New email'}
      </p>
      {!replyTo ? <Input placeholder="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="h-9" /> : null}
      <Textarea placeholder="Write your reply…" value={body} onChange={(event) => setBody(event.target.value)} rows={6} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" isLoading={send.isPending} disabled={!body.trim() || (!replyTo && !subject.trim())}>Send</Button>
      </div>
    </form>
  );
}

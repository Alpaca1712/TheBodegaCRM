'use client';

import { useState } from 'react';
import {
  Mail, Linkedin, Twitter, Phone, Hash, Brain, CheckCircle2,
  ArrowRight, AlertCircle, TrendingUp, MessageSquare, ChevronDown,
} from 'lucide-react';
import type { TimelineEntry } from '@/types/leads-detail';

export function TimelineEntryCard({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasExpandableContent = entry.fullContent && entry.fullContent.length > 120;
  const aiData = entry.aiSummary as {
    summary?: string; action_items?: Array<{ owner: string; task: string; deadline: string | null }>;
    key_quotes?: string[]; objections_raised?: string[]; sentiment?: string;
    next_steps?: string[]; deal_signals?: Array<{ type: string; signal: string }>;
  } | null;

  const dotColor = entry.channel === 'email'
    ? entry.direction === 'outbound' ? 'bg-red-500' : 'bg-blue-500'
    : entry.channel === 'linkedin' ? 'bg-[#0A66C2]'
    : entry.channel === 'twitter' ? 'bg-zinc-600'
    : entry.channel === 'phone' ? 'bg-green-500' : 'bg-zinc-400';

  const channelIcon = entry.channel === 'email' ? <Mail className="h-3 w-3" />
    : entry.channel === 'linkedin' ? <Linkedin className="h-3 w-3" />
    : entry.channel === 'twitter' ? <Twitter className="h-3 w-3" />
    : entry.channel === 'phone' ? <Phone className="h-3 w-3" />
    : <Hash className="h-3 w-3" />;

  return (
    <div className="flex gap-3 relative">
      {!isLast && <div className="absolute left-[13px] top-8 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />}
      <div className={`mt-2 h-[11px] w-[11px] rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-900 ${dotColor}`} />
      <div className={`pb-4 min-w-0 flex-1 ${hasExpandableContent || aiData ? 'cursor-pointer' : ''}`} onClick={() => (hasExpandableContent || aiData) && setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-zinc-500">{channelIcon}</div>
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{entry.label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${entry.direction === 'outbound' ? 'bg-red-50 dark:bg-red-950/30 text-red-600' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600'}`}>
            {entry.direction === 'outbound' ? 'You' : 'Them'}
          </span>
          <span className="text-[10px] text-zinc-400 ml-auto tabular-nums">
            {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {(hasExpandableContent || aiData) && (
            <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          )}
        </div>

        {entry.subject && entry.type === 'email' && (
          <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mt-1">{entry.subject}</p>
        )}

        {entry.subject && entry.type === 'interaction' && (
          <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1 leading-relaxed">{entry.subject}</p>
        )}

        {!expanded && !entry.subject && entry.snippet && (
          <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{entry.snippet}</p>
        )}

        {expanded && (
          <div className="mt-2 space-y-3">
            {entry.fullContent && (
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80">
                <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                  {entry.fullContent}
                </p>
              </div>
            )}

            {aiData && (
              <div className="p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">AI Analysis</span>
                  {aiData.sentiment && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto ${
                      aiData.sentiment.includes('positive') ? 'bg-green-100 dark:bg-green-900/40 text-green-600' :
                      aiData.sentiment.includes('negative') ? 'bg-red-100 dark:bg-red-900/40 text-red-600' :
                      'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    }`}>{aiData.sentiment.replace('_', ' ')}</span>
                  )}
                </div>

                {aiData.summary && <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">{aiData.summary}</p>}

                {aiData.action_items && aiData.action_items.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1">Action Items</p>
                    {aiData.action_items.map((item, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1">
                        <CheckCircle2 className="h-3 w-3 text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          <span className={`font-medium ${item.owner === 'us' ? 'text-red-600' : item.owner === 'them' ? 'text-blue-600' : 'text-purple-600'}`}>[{item.owner}]</span> {item.task}
                          {item.deadline && <span className="text-zinc-400"> (by {item.deadline})</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {aiData.key_quotes && aiData.key_quotes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1">Key Quotes</p>
                    {aiData.key_quotes.map((q, i) => (
                      <p key={i} className="text-[11px] text-zinc-600 dark:text-zinc-400 italic border-l-2 border-blue-300 dark:border-blue-700 pl-2 mb-1">&ldquo;{q}&rdquo;</p>
                    ))}
                  </div>
                )}

                {aiData.objections_raised && aiData.objections_raised.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 mb-1">Objections</p>
                    {aiData.objections_raised.map((o, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1">
                        <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{o}</p>
                      </div>
                    ))}
                  </div>
                )}

                {aiData.next_steps && aiData.next_steps.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 mb-1">Next Steps</p>
                    {aiData.next_steps.map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1">
                        <ArrowRight className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{s}</p>
                      </div>
                    ))}
                  </div>
                )}

                {aiData.deal_signals && aiData.deal_signals.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-1">Deal Signals</p>
                    {aiData.deal_signals.map((ds, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1">
                        {ds.type === 'positive' ? <TrendingUp className="h-3 w-3 text-green-400 mt-0.5 shrink-0" /> :
                         ds.type === 'negative' ? <AlertCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" /> :
                         <MessageSquare className="h-3 w-3 text-zinc-400 mt-0.5 shrink-0" />}
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">{ds.signal}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

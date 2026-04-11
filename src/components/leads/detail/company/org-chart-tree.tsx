'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Network, Linkedin, User } from 'lucide-react';
import type { OrgChartMember } from '@/types/leads';

const deptColors: Record<string, string> = {
  Leadership: 'bg-red-100 dark:bg-red-900/40 text-red-600',
  Engineering: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600',
  Product: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600',
  Sales: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600',
  Marketing: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600',
  Operations: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600',
  Finance: 'bg-green-100 dark:bg-green-900/40 text-green-600',
  Legal: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600',
  Other: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
};

export function OrgChartTree({ members, companyName }: { members: OrgChartMember[]; companyName: string }) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(['Leadership']));

  const departments = new Map<string, OrgChartMember[]>();
  for (const m of members) {
    const dept = m.department || 'Other';
    if (!departments.has(dept)) departments.set(dept, []);
    departments.get(dept)!.push(m);
  }

  const sortedDepts = [...departments.entries()].sort(([a], [b]) => {
    if (a === 'Leadership') return -1;
    if (b === 'Leadership') return 1;
    return a.localeCompare(b);
  });

  const toggleDept = (dept: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept); else next.add(dept);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Organization Map</h3>
        </div>
        <span className="text-[10px] text-zinc-400 tabular-nums">{members.length} people at {companyName}</span>
      </div>

      <div className="space-y-1">
        {sortedDepts.map(([dept, people]) => {
          const isExpanded = expandedDepts.has(dept);
          return (
            <div key={dept}>
              <button
                onClick={() => toggleDept(dept)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />}
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${deptColors[dept] || deptColors.Other}`}>{dept}</span>
                <span className="text-[10px] text-zinc-400 tabular-nums">{people.length}</span>
              </button>
              {isExpanded && (
                <div className="ml-6 space-y-0.5 mt-0.5">
                  {people.map((person, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors group">
                      {person.photo_url ? (
                        <img src={person.photo_url} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 text-zinc-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate">{person.name}</p>
                          {person.lead_id && (
                            <Link href={`/leads/${person.lead_id}`} className="text-[9px] px-1 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-950/50">
                              In CRM
                            </Link>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">{person.title}</p>
                      </div>
                      {person.linkedin_url && (
                        <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { ReactNode } from 'react'
import { Surface, SurfaceBody, SurfaceHeader, StatCard } from '@/components/console/surface'
import { cn } from '@/lib/utils'

/** @deprecated Prefer PageHeader from @/components/console/page-frame */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function Section({ title, children, actions, className = '' }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <Surface className={className}>
      <SurfaceHeader title={title} actions={actions} />
      <SurfaceBody>{children}</SurfaceBody>
    </Surface>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{children ?? '—'}</dd>
    </div>
  )
}

export function Stat({ label, value, hint, className }: { label: string; value: ReactNode; hint?: string; className?: string }) {
  return <StatCard label={label} value={value} hint={hint} className={className} />
}

export function cnField(...classes: (string | boolean | undefined | null)[]) {
  return cn(...classes)
}

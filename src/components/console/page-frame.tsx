import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Full-viewport console page. Every route should start with this. */
export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-[calc(100dvh-3rem)] flex-col md:h-screen', className)}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  count?: number | string | null;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Sticky page chrome: title + optional count, description, actions, toolbar. */
export function PageHeader({ title, count, description, actions, children, className }: PageHeaderProps) {
  return (
    <header className={cn('flex-shrink-0 border-b border-border bg-card px-5 py-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            {count != null && count !== '' ? (
              <span className="text-sm tabular-nums text-muted-foreground">{count}</span>
            ) : null}
          </div>
          {description ? (
            <div className="mt-1 text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}

/** Scrollable page body on the canvas color. */
export function PageBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-0 flex-1 overflow-auto bg-background', className)}>
      {children}
    </div>
  );
}

/** Two-pane workspace (list/detail, conversation/sidebar). */
export function PageSplit({
  sidebar,
  children,
  sidebarWidth = '340px',
  reverse = false,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarWidth?: string;
  /** When true, sidebar sits on the right (lead detail pattern). */
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        'grid min-h-0 flex-1',
        reverse
          ? 'lg:grid-cols-[minmax(0,1fr)_var(--split-sidebar)]'
          : 'lg:grid-cols-[var(--split-sidebar)_minmax(0,1fr)]',
      )}
      style={{ ['--split-sidebar' as string]: sidebarWidth }}
    >
      {reverse ? (
        <>
          <section className="flex min-h-0 min-w-0 flex-col border-b border-border bg-background lg:border-b-0 lg:border-r">
            {children}
          </section>
          <aside className="flex min-h-0 flex-col overflow-y-auto bg-background p-4 lg:p-5">
            {sidebar}
          </aside>
        </>
      ) : (
        <>
          <aside className="flex min-h-0 flex-col border-b border-border bg-card lg:border-b-0 lg:border-r">
            {sidebar}
          </aside>
          <section className="flex min-h-0 min-w-0 flex-col bg-background">
            {children}
          </section>
        </>
      )}
    </div>
  );
}

/** Pane sub-header inside a split (e.g. Conversation, Enrollments). */
export function PaneHeader({
  title,
  count,
  actions,
  className,
}: {
  title: ReactNode;
  count?: number | string | null;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-5 py-2.5', className)}>
      <h2 className="flex items-baseline gap-2 text-[13px] font-semibold text-foreground">
        {title}
        {count != null && count !== '' ? (
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{count}</span>
        ) : null}
      </h2>
      {actions}
    </div>
  );
}

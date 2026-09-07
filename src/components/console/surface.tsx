import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Standard white surface / card used across console. */
export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-zinc-950/[0.02]',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SurfaceHeader({
  title,
  actions,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  if (!title && !actions) return null;
  return (
    <header className={cn('flex items-center justify-between gap-2 border-b border-border px-4 py-2.5', className)}>
      {title ? <h2 className="text-[13px] font-semibold text-foreground">{title}</h2> : <span />}
      {actions}
    </header>
  );
}

export function SurfaceBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

/** Icon + label + value row for contact/company sidebars. */
export function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  if (children == null || children === '' || children === false) return null;
  return (
    <div className="flex gap-3">
      {Icon ? (
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card px-4 py-3 shadow-sm shadow-zinc-950/[0.02]', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-20 text-center', className)}>
      {Icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function InitialsAvatar({
  name,
  size = 'md',
  tone = 'neutral',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'neutral' | 'brand';
  className?: string;
}) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length === 0
      ? '?'
      : parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();

  const sizes = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-9 w-9 text-[11px]',
    lg: 'h-12 w-12 text-sm rounded-2xl',
  };

  return (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-full font-semibold',
        sizes[size],
        tone === 'brand'
          ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-sm shadow-red-600/20'
          : 'bg-foreground text-background',
        className,
      )}
    >
      {initials}
    </div>
  );
}

/** Horizontal filter chip group (stages, direction, etc.). */
export function FilterChips({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto', className)} role="tablist">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value || 'all'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground ring-1 ring-border hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Standard list column header row. */
export function ListHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'hidden border-b border-border bg-card px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ListRow({
  children,
  onClick,
  className,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  active?: boolean;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative w-full border-b border-border px-5 py-3 text-left transition-colors last:border-b-0',
        onClick && 'hover:bg-muted/70',
        active && 'bg-red-50/70 dark:bg-red-950/20',
        className,
      )}
    >
      {active ? <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden /> : null}
      {children}
    </Comp>
  );
}

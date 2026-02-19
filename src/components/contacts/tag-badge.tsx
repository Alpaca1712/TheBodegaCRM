'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  className?: string;
  showRemoveButton?: boolean;
}

const colorClasses: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-800 border-gray-300',
  red: 'bg-red-100 text-red-800 border-red-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  amber: 'bg-amber-100 text-amber-800 border-amber-300',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  lime: 'bg-lime-100 text-lime-800 border-lime-300',
  green: 'bg-green-100 text-green-800 border-green-300',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  teal: 'bg-teal-100 text-teal-800 border-teal-300',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  sky: 'bg-sky-100 text-sky-800 border-sky-300',
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  violet: 'bg-violet-100 text-violet-800 border-violet-300',
  purple: 'bg-purple-100 text-purple-800 border-purple-300',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
  pink: 'bg-pink-100 text-pink-800 border-pink-300',
  rose: 'bg-rose-100 text-rose-800 border-rose-300',
};

export function TagBadge({ 
  name, 
  color = 'gray', 
  onRemove, 
  className, 
  showRemoveButton = false 
}: TagBadgeProps) {
  const colorClass = colorClasses[color] || colorClasses.gray;
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colorClass,
        className
      )}
    >
      {name}
      {showRemoveButton && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-white/20"
          aria-label={`Remove tag ${name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

interface TagListProps {
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  onTagRemove?: (tagId: string) => void;
  className?: string;
}

export function TagList({ tags, onTagRemove, className }: TagListProps) {
  if (tags.length === 0) {
    return null;
  }
  
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          color={tag.color}
          onRemove={onTagRemove ? () => onTagRemove(tag.id) : undefined}
          showRemoveButton={!!onTagRemove}
        />
      ))}
    </div>
  );
}

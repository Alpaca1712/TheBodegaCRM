'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  value?: string;
  text?: string;
  label?: string;
  className?: string;
  showText?: boolean;
}

export function CopyButton({
  value,
  text,
  label = 'Content',
  className = '',
  showText = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const copyValue = value ?? text ?? '';

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-md p-1 text-muted-foreground transition-all',
        'hover:bg-muted hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20',
        className,
      )}
      aria-label={`Copy ${label.toLowerCase()}`}
      title={`Copy ${label.toLowerCase()}`}
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {showText && (
        <span className="text-[10px] font-medium">
          {copied ? 'Copied' : 'Copy'}
        </span>
      )}
    </button>
  );
}

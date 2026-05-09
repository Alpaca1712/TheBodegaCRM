'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

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
      className={`inline-flex items-center justify-center gap-1 rounded-md p-1 text-zinc-400 transition-all hover:bg-zinc-100 hover:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ${className}`}
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

import Link from 'next/link';
import { syne } from '@/lib/fonts/brand';
import { cn } from '@/lib/utils';

type BodegaLogoSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<BodegaLogoSize, string> = {
  sm: 'text-[17px] tracking-[-0.04em]',
  md: 'text-[1.75rem] tracking-[-0.045em] leading-none',
  lg: 'text-4xl tracking-[-0.05em] leading-none sm:text-[2.75rem]',
};

interface BodegaLogoProps {
  size?: BodegaLogoSize;
  href?: string;
  className?: string;
  /** Render as a heading (login / landing). */
  asHeading?: boolean;
}

export function BodegaLogo({
  size = 'sm',
  href,
  className,
  asHeading = false,
}: BodegaLogoProps) {
  const wordmark = (
    <span
      className={cn(
        syne.className,
        'inline-flex items-baseline font-extrabold text-foreground',
        sizeClasses[size],
        className,
      )}
    >
      B<span className="text-primary">o</span>dega
    </span>
  );

  const content = asHeading ? <h1 className="m-0">{wordmark}</h1> : wordmark;

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center no-underline">
        {content}
      </Link>
    );
  }

  return content;
}

import { Syne } from 'next/font/google';

/** Display face for the Bodega wordmark — not used for UI body copy. */
export const syne = Syne({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

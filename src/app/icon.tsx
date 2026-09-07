import { ImageResponse } from 'next/og';
import { BodegaIconMark, iconFonts, loadSyneExtraBold } from '@/lib/brand/icon-mark';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** Bodega favicon — Syne B lettermark with red baseline accent. */
export default async function Icon() {
  const fontData = await loadSyneExtraBold();

  return new ImageResponse(<BodegaIconMark />, {
    ...size,
    fonts: iconFonts(fontData),
  });
}

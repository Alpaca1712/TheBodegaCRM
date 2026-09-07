import { ImageResponse } from 'next/og';
import { BodegaIconMark, iconFonts, loadSyneExtraBold } from '@/lib/brand/icon-mark';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple touch icon — scaled Bodega lettermark. */
export default async function AppleIcon() {
  const fontData = await loadSyneExtraBold();

  return new ImageResponse(<BodegaIconMark scale={180 / 32} />, {
    ...size,
    fonts: iconFonts(fontData),
  });
}

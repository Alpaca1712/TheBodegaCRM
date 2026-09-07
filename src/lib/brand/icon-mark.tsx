/** Syne ExtraBold for dynamic favicon / apple-icon generation. */
export async function loadSyneExtraBold(): Promise<ArrayBuffer> {
  const response = await fetch(
    'https://fonts.gstatic.com/s/syne/v24/8vIS7w4qzmVxsWxjBZRjr0FKM_24vj6k.ttf',
  );
  if (!response.ok) {
    throw new Error('Failed to load Syne for icon generation');
  }
  return response.arrayBuffer();
}

export const iconFonts = (data: ArrayBuffer) =>
  [{ name: 'Syne', data, weight: 800 as const, style: 'normal' as const }];

/** Shared lettermark: dark tile, Syne B, red baseline accent — no avatar circle. */
export function BodegaIconMark({ scale = 1 }: { scale?: number }) {
  const size = 32 * scale;
  const radius = 7 * scale;
  const fontSize = 22 * scale;
  const accentWidth = 14 * scale;
  const accentHeight = 3 * scale;
  const accentBottom = 5 * scale;

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#18181b',
        borderRadius: radius,
        position: 'relative',
      }}
    >
      <div
        style={{
          color: '#fafafa',
          fontSize,
          fontFamily: 'Syne',
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: -1.2 * scale,
          marginTop: -1 * scale,
        }}
      >
        B
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: accentBottom,
          left: '50%',
          transform: 'translateX(-50%)',
          width: accentWidth,
          height: accentHeight,
          borderRadius: accentHeight,
          background: '#dc2626',
        }}
      />
    </div>
  );
}

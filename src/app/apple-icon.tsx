import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple touch icon — Bodega CRM mark. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #f87171 0%, #dc2626 45%, #991b1b 100%)',
          borderRadius: 40,
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -3,
            }}
          >
            B
          </div>
          <div
            style={{
              display: 'flex',
              width: 70,
              height: 32,
              marginTop: 12,
              borderLeft: '8px solid #ffffff',
              borderRight: '8px solid #ffffff',
              borderBottom: '8px solid #ffffff',
              borderRadius: '0 0 12px 12px',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 26,
            right: 26,
            width: 28,
            height: 28,
            borderRadius: 999,
            background: '#fbbf24',
          }}
        />
      </div>
    ),
    { ...size },
  );
}

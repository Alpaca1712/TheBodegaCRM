import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * Bodega CRM favicon
 * Red bodega tile + bold B + inbox tray + amber attention dot.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #f87171 0%, #dc2626 45%, #991b1b 100%)',
          borderRadius: 7,
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
              fontSize: 15,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -0.6,
            }}
          >
            B
          </div>
          {/* Inbox tray: open top, solid walls */}
          <div
            style={{
              display: 'flex',
              width: 13,
              height: 6,
              marginTop: 2,
              borderLeft: '2px solid #ffffff',
              borderRight: '2px solid #ffffff',
              borderBottom: '2px solid #ffffff',
              borderRadius: '0 0 2px 2px',
            }}
          />
        </div>
        {/* CRM "needs attention" amber pip */}
        <div
          style={{
            position: 'absolute',
            top: 3,
            right: 3,
            width: 6,
            height: 6,
            borderRadius: 999,
            background: '#fbbf24',
          }}
        />
      </div>
    ),
    { ...size },
  );
}

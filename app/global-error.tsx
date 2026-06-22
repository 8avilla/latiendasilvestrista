'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const isStaleDeployment =
    error.message?.includes('Failed to find Server Action') ||
    error.message?.includes('This request might be from an older') ||
    error.digest?.includes('SERVER_ACTION');

  useEffect(() => {
    if (isStaleDeployment) {
      window.location.reload();
    }
  }, [isStaleDeployment]);

  if (isStaleDeployment) {
    return (
      <html>
        <body style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', background: '#fff' }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Actualizando la página…</p>
        </body>
      </html>
    );
  }

  return (
    <html>
      <body style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', gap: '16px', background: '#fff' }}>
        <p style={{ color: '#374151', fontSize: '15px' }}>Algo salió mal.</p>
        <button
          onClick={reset}
          style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px 24px', cursor: 'pointer', fontSize: '13px' }}
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}

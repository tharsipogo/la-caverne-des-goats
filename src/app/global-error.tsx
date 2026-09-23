'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur applicative globale :', error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ background: '#07091a', color: '#f3f4f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌶️💥</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Chili Party a rencontré un problème</h2>
          <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 20 }}>
            Une erreur inattendue a empêché l'application de démarrer. Réessaie — si ça persiste,
            reviens un peu plus tard.
          </p>
          <button
            onClick={() => reset()}
            style={{ background: '#f5a623', color: '#1a1206', border: 'none', padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
          >
            ↺ Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}

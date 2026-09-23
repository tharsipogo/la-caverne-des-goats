'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur applicative :', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="panel max-w-md w-full text-center flex flex-col gap-4">
        <span className="text-4xl">🌶️💥</span>
        <div>
          <h2 className="font-serif text-xl font-semibold">Oups, une erreur est survenue</h2>
          <p className="text-sm text-muted mt-2">
            Quelque chose s'est mal passé de façon inattendue. Ce n'est pas de ta faute — tu peux
            réessayer ou revenir à l'accueil.
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <button className="btn" onClick={() => reset()}>
            ↺ Réessayer
          </button>
          <a href="/" className="btn-secondary inline-flex items-center">
            ← Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

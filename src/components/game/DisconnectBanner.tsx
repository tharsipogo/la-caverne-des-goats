'use client';

interface DisconnectBannerProps {
  names: string[];
}

/**
 * Bannière discrète affichée quand un ou plusieurs joueurs de la partie en
 * ligne en cours ne sont plus détectés en ligne (présence Supabase).
 * N'affiche rien tant que `names` est vide.
 */
export function DisconnectBanner({ names }: DisconnectBannerProps) {
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `⚠️ ${names[0]} semble déconnecté·e`
      : `⚠️ Déconnectés : ${names.join(', ')}`;

  return (
    <div className="flex justify-center mb-2">
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full animate-pulse"
        style={{ background: 'rgba(226, 100, 90, 0.12)', color: '#e2645a', border: '1px solid rgba(226, 100, 90, 0.3)' }}
      >
        {label}
      </span>
    </div>
  );
}

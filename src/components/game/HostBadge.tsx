'use client';

interface HostBadgeProps {
  hostName?: string;
}

/**
 * Petit badge discret rappelant qui est l'hôte de la partie en ligne en
 * cours — visible en permanence, quelle que soit la phase du jeu.
 */
export function HostBadge({ hostName }: HostBadgeProps) {
  if (!hostName) return null;

  return (
    <div className="flex justify-center mb-2">
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
        style={{ background: 'rgba(245, 166, 35, 0.12)', color: '#f5a623', border: '1px solid rgba(245, 166, 35, 0.25)' }}
      >
        👑 Hôte : {hostName}
      </span>
    </div>
  );
}

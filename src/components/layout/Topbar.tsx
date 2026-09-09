'use client';

interface TopbarProps {
  onBack?: () => void;
  breadcrumb?: string;
}

/**
 * Barre supérieure fine (h-14), même glassmorphism que la sidebar :
 * bouton "← Retour" à effet push + breadcrumb discret à droite.
 */
export function Topbar({ onBack, breadcrumb }: TopbarProps) {
  return (
    <div
      className="h-14 shrink-0 -mx-5 md:-mx-10 -mt-6 md:-mt-8 mb-6 px-5 md:px-10 flex items-center justify-between border-b border-white/[0.06] relative z-10"
      style={{ background: 'rgba(8, 10, 24, 0.82)', backdropFilter: 'blur(20px)' }}
    >
      {onBack ? (
        <button
          onClick={onBack}
          className="font-serif text-xs font-semibold px-3.5 py-1.5 rounded-lg cursor-pointer border-none transition-transform active:translate-y-0.5 active:shadow-none"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#f3f4f6', boxShadow: '0 3px 0 rgba(0,0,0,0.35)' }}
        >
          ← Retour
        </button>
      ) : (
        <span />
      )}
      {breadcrumb && <span className="text-[11px] text-muted tracking-wide">{breadcrumb}</span>}
    </div>
  );
}

'use client';

import type { DisplayMode } from '@/lib/supabase/cardDeck';

interface DisplayModeToggleProps {
  mode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
  /** Le deck de la base a au moins une carte validée — sinon le toggle ne s'affiche pas. */
  available: boolean;
  className?: string;
}

/**
 * Choix "Images / Cartes" pour un jeu qui pioche dans une base : reste
 * caché tant que la base n'a aucune carte validée dans l'éditeur
 * /cartes, pour ne jamais proposer un mode "cartes" vide.
 */
export function DisplayModeToggle({ mode, onChange, available, className = '' }: DisplayModeToggleProps) {
  if (!available) return null;

  return (
    <div className={`inline-flex items-center gap-1 rounded-xl border border-border bg-white/[0.04] p-1 ${className}`}>
      <button
        type="button"
        className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${
          mode === 'image' ? 'bg-amber text-[#1a1206]' : 'text-muted hover:text-text'
        }`}
        onClick={() => onChange('image')}
        aria-pressed={mode === 'image'}
      >
        🖼️ Images
      </button>
      <button
        type="button"
        className={`px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-colors ${
          mode === 'card' ? 'bg-amber text-[#1a1206]' : 'text-muted hover:text-text'
        }`}
        onClick={() => onChange('card')}
        aria-pressed={mode === 'card'}
      >
        🎴 Cartes
      </button>
    </div>
  );
}

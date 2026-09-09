'use client';

import { getPlayerColor } from '@/lib/playerColors';

interface PlayerNameFieldProps {
  index: number;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Champ de saisie du nom d'un joueur, avec une pastille de couleur
 * assignée par index (Joueur 1 = rouge, Joueur 2 = bleu, ...) — cohérent
 * dans tous les jeux qui utilisent ce composant.
 */
export function PlayerNameField({ index, value, onChange, placeholder, disabled }: PlayerNameFieldProps) {
  const color = getPlayerColor(index);
  return (
    <div className="flex items-center gap-2">
      <span
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-serif font-semibold"
        style={{ backgroundColor: color.hex, color: '#0b0c10' }}
      >
        {index + 1}
      </span>
      <input
        className="input"
        style={{ borderColor: color.hex, backgroundColor: color.soft }}
        value={value}
        placeholder={placeholder ?? `Joueur ${index + 1}`}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

/** Pastille seule, pour afficher un joueur déjà nommé (scores, tours, etc.) */
export function PlayerColorDot({ index, size = 10 }: { index: number; size?: number }) {
  const color = getPlayerColor(index);
  return (
    <span
      className="rounded-full shrink-0 inline-block"
      style={{ backgroundColor: color.hex, width: size, height: size }}
      title={color.name}
    />
  );
}

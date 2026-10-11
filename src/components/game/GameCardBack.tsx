'use client';

import type { CSSProperties } from 'react';
import { CardTemplateConfig } from '@/lib/types';

type CardThemeStyle = CSSProperties & {
  '--card-accent': string;
  '--card-name-color': string;
};

interface GameCardBackProps {
  template: CardTemplateConfig;
  /** Lettre ou sigle affiché au centre du dos (optionnel, ex. initiale de la base). */
  monogram?: string;
  className?: string;
}

/**
 * Dos de carte : même carcasse visuelle que <GameCard> (métal sombre,
 * grain, listel, coins ornés) mais sans aucun contenu identifiable —
 * juste un emblème central décoratif. Pour les jeux qui doivent cacher
 * l'identité d'une carte avant révélation (cf. <FlippableGameCard>).
 */
export function GameCardBack({ template, monogram, className = '' }: GameCardBackProps) {
  const theme: CardThemeStyle = {
    '--card-accent': template.accentColor,
    '--card-name-color': template.nameColor,
  };

  return (
    <article className={`brush-card-wrapper ${className}`} style={theme} aria-label="Dos de carte">
      <div className="brush-card">
        <div className="brush-card-grain" aria-hidden="true" />
        <div className="brush-card-listel" aria-hidden="true" />

        <div className="brush-back-emblem" aria-hidden="true">
          <svg viewBox="0 0 120 120" className="brush-back-rings">
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
            <path
              d="M60 16 L68 48 L100 60 L68 72 L60 104 L52 72 L20 60 L52 48 Z"
              fill="currentColor"
              opacity="0.22"
            />
          </svg>
          {monogram && <span className="brush-back-monogram">{monogram}</span>}
        </div>
      </div>
    </article>
  );
}

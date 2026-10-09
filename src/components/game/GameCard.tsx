'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { CardTemplateConfig } from '@/lib/types';

type CardThemeStyle = CSSProperties & {
  '--card-accent-color': string;
  '--card-name-color': string;
};

interface GameCardItem {
  name: string;
  image_url?: string | null;
}

interface GameCardProps {
  item: GameCardItem;
  template: CardTemplateConfig;
  className?: string;
}

/**
 * Rendu d'une carte à collectionner : fond métallique sombre, coups de
 * pinceau manga en SVG (colorés via --card-accent-color), zone image, et
 * bannière "fumée" affichant le nom (colorée via --card-name-color), sous
 * l'image, sans jamais la chevaucher. Conçu pour être réutilisé tel quel
 * par n'importe quel futur jeu de cartes — seules les deux couleurs du
 * modèle changent le rendu, la mise en page est fixe.
 */
export function GameCard({ item, template, className = '' }: GameCardProps) {
  const theme: CardThemeStyle = {
    '--card-accent-color': template.accentColor,
    '--card-name-color': template.nameColor,
  };

  return (
    <article className={`card-shell relative w-full ${className}`} style={theme}>
      <div className="art-frame relative overflow-hidden">
        {item.image_url ? (
          <Image src={item.image_url} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0b0d16] text-muted text-[12px]">
            Pas d'image
          </div>
        )}

        <svg
          aria-hidden="true"
          className="brush-strokes absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
          viewBox="0 0 320 447"
        >
          <g className="brush-ink" fill="currentColor">
            <path d="M -10 40 C 40 10, 90 55, 150 20 C 200 -5, 260 30, 330 5 L 330 35 C 260 60, 200 25, 150 50 C 90 85, 40 40, -10 70 Z" />
            <path d="M -10 420 C 50 400, 110 440, 180 410 C 230 390, 280 425, 330 405 L 330 430 C 280 450, 230 415, 180 435 C 110 465, 50 425, -10 445 Z" />
            <path d="M -10 200 C 10 190, 15 230, -10 225 Z" opacity="0.7" />
            <path d="M 330 250 C 310 240, 305 275, 330 272 Z" opacity="0.7" />
          </g>
          <g
            className="brush-dry-lines"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M 0 55 C 70 35, 140 65, 320 25" />
            <path d="M 0 410 C 80 430, 160 400, 320 420" />
          </g>
          <g className="brush-halftone" fill="currentColor">
            {Array.from({ length: 18 }).map((_, row) =>
              Array.from({ length: 4 }).map((_, col) => (
                <circle
                  key={`${row}-${col}`}
                  cx={14 + col * 10}
                  cy={10 + row * 24}
                  r={1.1 + ((row + col) % 3) * 0.4}
                />
              ))
            )}
          </g>
          <g className="brush-splatters" fill="currentColor">
            <circle cx="24" cy="18" r="3.2" />
            <circle cx="40" cy="10" r="1.6" />
            <circle cx="296" cy="430" r="2.8" />
            <circle cx="280" cy="438" r="1.4" />
            <circle cx="12" cy="432" r="2" />
          </g>
        </svg>

        <div className="art-frame-border pointer-events-none absolute inset-0" />
      </div>

      <div className="name-banner name-style-smoke">
        <span className="card-title">{item.name}</span>
      </div>
    </article>
  );
}

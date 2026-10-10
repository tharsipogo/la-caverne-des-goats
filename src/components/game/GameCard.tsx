'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { CardTemplateConfig } from '@/lib/types';

type CardThemeStyle = CSSProperties & {
  '--card-accent': string;
  '--card-name-color': string;
};

interface GameCardItem {
  name: string;
  image_url?: string | null;
}

interface GameCardProps {
  item: GameCardItem;
  template: CardTemplateConfig;
  /** Nom de la base/série affiché dans le bandeau du bas (optionnel). */
  workName?: string;
  className?: string;
}

/**
 * Rendu d'une carte à collectionner, fidèle au design de référence :
 * carte métallique sombre, coups de pinceau manga en SVG (colorés via
 * --card-accent), zone d'illustration à coins décoratifs, nom en
 * Permanent Marker (coloré via --card-name-color) et bandeau "œuvre" en
 * bas de carte. Pas de système de rareté. Composant générique — conçu
 * pour être réutilisé tel quel par n'importe quel futur jeu de cartes,
 * il ne connaît que `item` et `template` (les deux seules couleurs
 * personnalisables du modèle).
 */
export function GameCard({ item, template, workName, className = '' }: GameCardProps) {
  const theme: CardThemeStyle = {
    '--card-accent': template.accentColor,
    '--card-name-color': template.nameColor,
  };

  return (
    <article className={`brush-card-wrapper ${className}`} style={theme}>
      <div className="brush-card">
        <svg
          aria-hidden="true"
          className="brush-decoration"
          preserveAspectRatio="none"
          viewBox="0 0 320 447"
        >
          <defs>
            <filter id="rough-brush-edge" x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence baseFrequency="0.018 0.12" numOctaves="2" result="noise" seed="17" type="fractalNoise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="B" />
            </filter>
            <pattern id="brush-halftone" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" fill="currentColor" r="1.35" />
            </pattern>
            <linearGradient id="brush-ink" x1="0" x2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0" />
              <stop offset="0.12" stopColor="currentColor" stopOpacity="0.92" />
              <stop offset="0.75" stopColor="currentColor" stopOpacity="0.78" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="brush-ink" filter="url(#rough-brush-edge)">
            <path
              d="M-38 83C23 45 78 31 132 30c47-1 92 12 143 3 37-7 66-23 94-39l-8 70c-43 11-80 30-126 37-55 8-104-8-153 2-49 10-81 31-119 50z"
              fill="url(#brush-ink)"
            />
            <path
              d="M-42 332c46-17 89-25 130-18 57 10 91 52 153 53 51 1 87-19 127-38l5 70c-46 20-91 33-141 24-57-11-89-49-148-51-43-2-82 12-123 32z"
              fill="url(#brush-ink)"
            />
            <path
              d="M-18 196c56-25 101-28 150-9 40 16 72 35 116 35 35 0 70-11 101-27l-3 31c-37 21-75 32-117 29-47-4-80-25-124-36-41-10-79-3-121 17z"
              fill="currentColor"
              opacity="0.2"
            />
          </g>

          <g className="brush-fibers">
            <path d="M-12 119C65 72 119 72 190 84c61 10 103-2 148-30" />
            <path d="M-20 128C49 89 111 84 177 96c59 11 106 3 169-36" />
            <path d="M-11 342c72-24 119-15 172 17 59 36 111 42 183 12" />
            <path d="M-15 352c64-19 111-11 165 22 61 38 119 45 195 8" />
            <path d="M-8 216c58-21 98-16 147 3 69 27 127 27 194-6" />
          </g>

          <path
            className="brush-dots"
            d="M0 46C65 18 126 11 181 25c46 12 85 13 139-8v75c-51 14-92 14-139 2C119 78 66 89 0 119z"
            fill="url(#brush-halftone)"
          />
          <path
            className="brush-dots brush-dots-bottom"
            d="M0 356c52-18 101-16 146 10 69 40 115 42 174 17v64H0z"
            fill="url(#brush-halftone)"
          />

          <g className="brush-splatters" fill="currentColor">
            <circle cx="25" cy="40" r="5" />
            <circle cx="46" cy="25" r="2.2" />
            <circle cx="74" cy="113" r="2.8" />
            <circle cx="13" cy="148" r="1.8" />
            <circle cx="292" cy="72" r="5.5" />
            <circle cx="307" cy="108" r="2.3" />
            <circle cx="278" cy="124" r="1.5" />
            <circle cx="21" cy="307" r="3.8" />
            <circle cx="45" cy="326" r="1.6" />
            <circle cx="292" cy="326" r="3.4" />
            <circle cx="305" cy="350" r="1.8" />
            <path d="m18 68 6-9 4 11-6 8z" />
            <path d="m286 383 5-12 6 10-3 9z" />
          </g>
        </svg>

        <div className="brush-art-frame">
          <div className="brush-image-zone">
            {item.image_url ? (
              <Image src={item.image_url} alt="" fill className="brush-card-image" unoptimized />
            ) : (
              <span className="brush-image-empty">
                <span className="brush-add-button" aria-hidden="true">
                  +
                </span>
                <span className="brush-add-label">Pas d'image</span>
                <span className="brush-file-types">PNG, JPG ou WEBP</span>
              </span>
            )}
          </div>
        </div>

        <div className="brush-name-zone">
          <span className="brush-card-name">{item.name}</span>
        </div>

        {workName && (
          <div className="brush-work-zone">
            <span className="brush-work-line" aria-hidden="true" />
            <span className="brush-work-name">{workName}</span>
            <span className="brush-work-line brush-work-line-right" aria-hidden="true" />
          </div>
        )}
      </div>
    </article>
  );
}

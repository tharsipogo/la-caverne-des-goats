'use client';

import Image from 'next/image';
import { useCallback, useId, useRef } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { CardTemplateConfig } from '@/lib/types';

type CardThemeStyle = CSSProperties & {
  '--card-accent': string;
  '--card-name-color': string;
};

interface GameCardItem {
  name: string;
  image_url?: string | null;
  /** Centre du cadrage dans la zone image, en % (50/50 = centré, par défaut). */
  image_crop_x?: number;
  image_crop_y?: number;
  /** Facteur de zoom de l'image (1 = taille normale, par défaut). */
  image_zoom?: number;
}

interface GameCardProps {
  item: GameCardItem;
  template: CardTemplateConfig;
  /** Nom de la base/série affiché dans le bandeau du bas (optionnel). */
  workName?: string;
  /** Bandeau de catégorie en haut de carte (optionnel, ex. "Personnage"). */
  cardType?: string;
  /** Texte court sous le nom (optionnel, ex. description / flavor text). */
  description?: string;
  /** Numéro de la carte dans la base (affiché "003" ou "003/048" avec totalCards). */
  cardNumber?: number;
  totalCards?: number;
  /** Halo renforcé — pour signaler une carte sélectionnée/active dans un jeu. */
  active?: boolean;
  /** Désactive l'effet holo/tilt au survol (utile pour un mini-aperçu ou une liste dense). */
  disableTilt?: boolean;
  className?: string;
}

/** Taille de police du nom selon sa longueur, pour éviter qu'un nom long ne déborde. */
function nameFontSize(name: string): string {
  const len = name.length;
  if (len <= 10) return 'clamp(16px, 7cqw, 24px)';
  if (len <= 16) return 'clamp(14px, 6cqw, 20px)';
  if (len <= 24) return 'clamp(12px, 5cqw, 17px)';
  return 'clamp(10.5px, 4.2cqw, 14px)';
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

/**
 * Rendu d'une carte à collectionner façon TCG : carte métallique sombre,
 * coups de pinceau manga en SVG (colorés via --card-accent), listel
 * interne, coins ornés, grain subtil, effet holo/tilt au survol de la
 * souris, zone d'illustration, nom sur plaque gravée en Luckiest Guy
 * (coloré via --card-name-color) et bandeau "œuvre" en bas. Pas de système de
 * rareté. Composant générique — réutilisable tel quel par n'importe quel
 * futur jeu de cartes ; les props au-delà de `item`/`template` sont
 * toutes optionnelles et n'affectent rien si elles ne sont pas fournies.
 */
export function GameCard({
  item,
  template,
  workName,
  cardType,
  description,
  cardNumber,
  totalCards,
  active = false,
  disableTilt = false,
  className = '',
}: GameCardProps) {
  const uid = useId().replace(/[:«»]/g, '');
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (disableTilt || e.pointerType !== 'mouse') return;
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * 14;
      const ry = (px - 0.5) * 16;
      el.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`);
      el.style.setProperty('--sheen-x', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--sheen-y', `${(py * 100).toFixed(1)}%`);
    },
    [disableTilt]
  );

  const handlePointerLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  }, []);

  const theme: CardThemeStyle = {
    '--card-accent': template.accentColor,
    '--card-name-color': template.nameColor,
  };

  // Quand une base (workName) est connue, on y accole le numéro pour
  // éviter toute collision visuelle avec le bandeau du bas ; sinon le
  // numéro s'affiche seul, discrètement, en bas de carte.
  const workLine =
    workName && cardNumber != null
      ? `${workName} · ${pad3(cardNumber)}${totalCards ? `/${pad3(totalCards)}` : ''}`
      : workName;
  const standaloneNumber = !workName && cardNumber != null;

  return (
    <article className={`brush-card-wrapper ${className}`} style={theme}>
      <div
        ref={cardRef}
        className={`brush-card ${active ? 'is-active' : ''} ${disableTilt ? '' : 'has-tilt'}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div className="brush-card-grain" aria-hidden="true" />

        <svg aria-hidden="true" className="brush-decoration" preserveAspectRatio="none" viewBox="0 0 320 447">
          <defs>
            <filter id={`rough-brush-edge-${uid}`} x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence baseFrequency="0.018 0.12" numOctaves="2" result="noise" seed="17" type="fractalNoise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="B" />
            </filter>
            <pattern id={`brush-halftone-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" fill="currentColor" r="1.35" />
            </pattern>
            <linearGradient id={`brush-ink-${uid}`} x1="0" x2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0" />
              <stop offset="0.12" stopColor="currentColor" stopOpacity="0.92" />
              <stop offset="0.75" stopColor="currentColor" stopOpacity="0.78" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="brush-ink" filter={`url(#rough-brush-edge-${uid})`}>
            <path
              d="M-38 83C23 45 78 31 132 30c47-1 92 12 143 3 37-7 66-23 94-39l-8 70c-43 11-80 30-126 37-55 8-104-8-153 2-49 10-81 31-119 50z"
              fill={`url(#brush-ink-${uid})`}
            />
            <path
              d="M-42 332c46-17 89-25 130-18 57 10 91 52 153 53 51 1 87-19 127-38l5 70c-46 20-91 33-141 24-57-11-89-49-148-51-43-2-82 12-123 32z"
              fill={`url(#brush-ink-${uid})`}
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
            fill={`url(#brush-halftone-${uid})`}
          />
          <path
            className="brush-dots brush-dots-bottom"
            d="M0 356c52-18 101-16 146 10 69 40 115 42 174 17v64H0z"
            fill={`url(#brush-halftone-${uid})`}
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

        <div className="brush-card-listel" aria-hidden="true" />

        {cardType && <div className="brush-type-banner">{cardType}</div>}

        <div className="brush-name-zone">
          <span className="brush-card-name" style={{ fontSize: nameFontSize(item.name) }}>
            {item.name}
          </span>
        </div>

        <div className="brush-art-frame">
          <CornerOrnament className="brush-corner brush-corner-tl" />
          <CornerOrnament className="brush-corner brush-corner-br" flip />

          <div className="brush-image-zone">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt=""
                fill
                className="brush-card-image"
                unoptimized
                style={{
                  objectPosition: `${item.image_crop_x ?? 50}% ${item.image_crop_y ?? 50}%`,
                  transform: `scale(${item.image_zoom ?? 1})`,
                  transformOrigin: `${item.image_crop_x ?? 50}% ${item.image_crop_y ?? 50}%`,
                }}
              />
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

        {description && <p className="brush-description">{description}</p>}

        {workLine && (
          <div className="brush-work-zone">
            <span className="brush-work-line" aria-hidden="true" />
            <span className="brush-work-name">{workLine}</span>
            <span className="brush-work-line brush-work-line-right" aria-hidden="true" />
          </div>
        )}

        {standaloneNumber && <span className="brush-card-number">{pad3(cardNumber!)}{totalCards ? `/${pad3(totalCards)}` : ''}</span>}

        {!disableTilt && <div className="brush-foil" aria-hidden="true" />}
      </div>
    </article>
  );
}

function CornerOrnament({ className, flip = false }: { className: string; flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 56 56"
      style={flip ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path d="M3 50V19C3 10.16 10.16 3 19 3H50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 31V19C3 10.16 10.16 3 19 3H31" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="19" cy="3" r="2.4" fill="currentColor" />
      <circle cx="3" cy="19" r="2.4" fill="currentColor" />
      <circle cx="3" cy="50" r="1.4" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

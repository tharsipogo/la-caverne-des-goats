'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { GameCard } from './GameCard';

/**
 * Largeur à partir de laquelle GameCard affiche toujours tout son contenu
 * sans rien tronquer : en dessous d'environ 180px, les marges/paddings
 * fixes du gabarit (plaque du nom, coins ornés, bandeau "œuvre"...) ne
 * tiennent plus dans la hauteur de la carte (aspect-ratio 63/88) et se
 * retrouvent coupés par son `overflow: hidden`.
 */
const SAFE_WIDTH = 220;

type GameCardProps = ComponentProps<typeof GameCard>;

/**
 * Variante de <GameCard> pour les emplacements trop étroits (popup,
 * bandeau compact, podium, vignette de pioche...). Affiche toujours la
 * carte à sa taille interne "sûre", puis la réduit visuellement avec
 * `transform: scale()` pour qu'elle tienne dans l'espace réellement
 * disponible (mesuré via ResizeObserver, donc compatible avec des
 * largeurs responsives type `w-28 md:w-32`) — la carte entière reste
 * visible, juste plus petite, sans jamais rogner son contenu.
 */
export function ScaledGameCard(props: GameCardProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / SAFE_WIDTH);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} style={{ width: '100%', aspectRatio: '63 / 88', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: SAFE_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <GameCard {...props} />
      </div>
    </div>
  );
}

'use client';

import { CardTemplateConfig } from '@/lib/types';
import { GameCard } from './GameCard';
import { GameCardBack } from './GameCardBack';

interface FlippableGameCardItem {
  name: string;
  image_url?: string | null;
}

interface FlippableGameCardProps {
  item: FlippableGameCardItem;
  template: CardTemplateConfig;
  /** Carte visible face contre face (true) ou dos visible (false). */
  revealed: boolean;
  /** Lettre/sigle affiché au dos tant que la carte n'est pas révélée. */
  monogram?: string;
  workName?: string;
  cardType?: string;
  description?: string;
  cardNumber?: number;
  totalCards?: number;
  active?: boolean;
  className?: string;
}

/**
 * Carte avec animation de retournement 3D entre son dos (<GameCardBack>)
 * et sa face (<GameCard>), pilotée par la prop `revealed`. Utile pour les
 * jeux qui cachent l'identité d'une carte avant un moment de révélation
 * (ex. pioche, carte adverse). Le tilt/holo de <GameCard> est désactivé
 * pendant que la carte est dans ce conteneur, pour ne pas entrer en
 * conflit avec l'animation de retournement.
 */
export function FlippableGameCard({
  item,
  template,
  revealed,
  monogram,
  workName,
  cardType,
  description,
  cardNumber,
  totalCards,
  active,
  className = '',
}: FlippableGameCardProps) {
  return (
    <div className={`brush-flip-outer ${className}`}>
      <div className={`brush-flip-inner ${revealed ? 'is-revealed' : ''}`}>
        <div className="brush-flip-face brush-flip-face-back">
          <GameCardBack template={template} monogram={monogram} />
        </div>
        <div className="brush-flip-face brush-flip-face-front">
          <GameCard
            item={item}
            template={template}
            workName={workName}
            cardType={cardType}
            description={description}
            cardNumber={cardNumber}
            totalCards={totalCards}
            active={active}
            disableTilt
          />
        </div>
      </div>
    </div>
  );
}

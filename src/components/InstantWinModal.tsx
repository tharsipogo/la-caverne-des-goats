'use client';

import { ListItem } from '@/lib/types';

interface InstantWinModalProps {
  winnerName: string;
  cards: ListItem[];
  accent: string;
  onClose: () => void;
}

export default function InstantWinModal({ winnerName, cards, accent, onClose }: InstantWinModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div
        className="relative w-full max-w-2xl bg-[#121420] border-2 rounded-2xl p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.5)] flex flex-col items-center gap-5"
        style={{ borderColor: accent }}
      >
        <div className="inline-block bg-amber/20 border border-amber/60 text-amber font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest animate-bounce">
          👑 VICTOIRE INSTANTANÉE !
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
          L'HÉRITIER DU CHAPEAU DE PAILLE !
        </h2>

        <p className="text-slate-300 text-sm max-w-md">
          <b style={{ color: accent }}>{winnerName}</b> a réuni Luffy, Roger, JoyBoy et Shanks. La partie s'arrête immédiatement !
        </p>

        {/* Cartes composant la victoire */}
        <div className="flex flex-wrap gap-3 justify-center my-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl border-2 border-amber overflow-hidden relative shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              {card.image_url ? (
                <img src={card.image_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full bg-surface2 flex items-center justify-center text-2xl">🎴</div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[10px] font-bold text-amber truncate p-1">
                {card.name}
              </div>
            </div>
          ))}
        </div>

        <button className="btn py-3 px-8 text-sm font-black tracking-wide" onClick={onClose}>
          VOIR LE RÉSUMÉ
        </button>
      </div>
    </div>
  );
}
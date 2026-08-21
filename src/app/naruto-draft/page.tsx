'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { pickRandom } from '@/lib/utils';

type Phase = 'setup' | 'draft' | 'end';
type GameMode = 'classic' | 'sabotage';

type CategoryKey = 'ninjutsu' | 'taijutsu' | 'chakra' | 'heredite' | 'vitesse';

interface CategoryConfig {
  key: CategoryKey;
  label: string;
  icon: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'ninjutsu', label: 'Ninjutsu', icon: '🌀' },
  { key: 'taijutsu', label: 'Taijutsu', icon: '👊' },
  { key: 'chakra', label: 'Chakra', icon: '⚡' },
  { key: 'heredite', label: 'Hérédité', icon: '👁️' },
  { key: 'vitesse', label: 'Vitesse', icon: '🍃' },
];

const PLAYER_COLORS = [
  { border: 'border-[#e2645a]', text: 'text-[#e2645a]', bg: 'bg-[#e2645a]', hex: '#e2645a' },
  { border: 'border-[#4fc9c0]', text: 'text-[#4fc9c0]', bg: 'bg-[#4fc9c0]', hex: '#4fc9c0' },
  { border: 'border-[#10b981]', text: 'text-[#10b981]', bg: 'bg-[#10b981]', hex: '#10b981' },
  { border: 'border-[#a855f7]', text: 'text-[#a855f7]', bg: 'bg-[#a855f7]', hex: '#a855f7' },
];

interface PlayerBoard {
  name: string;
  cards: Record<CategoryKey, ListItem | null>;
}

export default function NarutoDraftPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [loading, setLoading] = useState(true);

  // Configuration
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4']);
  const [gameMode, setGameMode] = useState<GameMode>('classic');

  // État de partie
  const [phase, setPhase] = useState<Phase>('setup');
  const [allItems, setAllItems] = useState<ListItem[]>([]);
  const [availableDeck, setAvailableDeck] = useState<ListItem[]>([]);
  const [boards, setBoards] = useState<PlayerBoard[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState<number>(0);
  const [drawnCard, setDrawnCard] = useState<ListItem | null>(null);

  // Pour le mode sabotage : sélection du joueur cible
  const [selectedTargetPlayerIdx, setSelectedTargetPlayerIdx] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      if (data) {
        setLists(data as GameList[]);
        if (data.length > 0) setListId(data[0].id);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!listId) return;
    (async () => {
      const { data } = await supabase.from('items').select('*').eq('list_id', listId);
      if (data) setAllItems(data as ListItem[]);
    })();
  }, [listId]);

  function startGame() {
    const requiredCards = playerCount * 5;
    if (allItems.length < requiredCards) {
      alert(`Il faut au moins ${requiredCards} personnages dans la base pour ${playerCount} joueurs.`);
      return;
    }

    const initialBoards: PlayerBoard[] = playerNames.slice(0, playerCount).map((name) => ({
      name: name.trim() || 'Joueur',
      cards: {
        ninjutsu: null,
        taijutsu: null,
        chakra: null,
        heredite: null,
        vitesse: null,
      },
    }));

    const deck = pickRandom(allItems, allItems.length);
    const firstCard = deck.pop() || null;

    setBoards(initialBoards);
    setAvailableDeck(deck);
    setDrawnCard(firstCard);
    setCurrentPlayerIdx(0);
    setSelectedTargetPlayerIdx(0);
    setPhase('draft');
  }

  // Place la carte piochée sur le plateau du joueur cible dans la catégorie choisie
  function placeCard(targetPlayerIdx: number, catKey: CategoryKey) {
    if (!drawnCard) return;

    // Mise à jour du plateau du joueur cible
    const updatedBoards = [...boards];
    updatedBoards[targetPlayerIdx].cards[catKey] = drawnCard;
    setBoards(updatedBoards);

    // Vérification : La partie est-elle terminée ? (Chaque joueur a rempli ses 5 catégories)
    const isFinished = updatedBoards.every((b) =>
      CATEGORIES.every((cat) => b.cards[cat.key] !== null)
    );

    if (isFinished) {
      setPhase('end');
      return;
    }

    // Passage au joueur suivant qui piochera une nouvelle carte
    let nextPlayer = (currentPlayerIdx + 1) % playerCount;

    // En mode classique ou sabotage, si le joueur suivant a déjà rempli toutes ses cases, on passe au suivant
    let attempts = 0;
    while (
      attempts < playerCount &&
      CATEGORIES.every((cat) => updatedBoards[nextPlayer].cards[cat.key] !== null)
    ) {
      nextPlayer = (nextPlayer + 1) % playerCount;
      attempts++;
    }

    const nextDeck = [...availableDeck];
    const newCard = nextDeck.pop() || null;

    setAvailableDeck(nextDeck);
    setDrawnCard(newCard);
    setCurrentPlayerIdx(nextPlayer);
    setSelectedTargetPlayerIdx(nextPlayer); // Par défaut, on cible soi-même
  }

  if (loading) return <p className="text-muted p-8">Chargement du jeu Naruto...</p>;

  // ================= 1. SETUP =================
  if (phase === 'setup') {
    return (
      <div>
        <div className="mb-7">
          <div className="eyebrow">Mode Spécial Naruto</div>
          <h1 className="font-serif text-3xl font-black text-amber">Naruto Draft & Sabotage</h1>
          <p className="text-muted mt-2 text-[14.5px] max-w-xl">
            Complétez vos 5 catégories ninja (Ninjutsu, Taijutsu, Chakra, Hérédité, Vitesse) et créez l'équipe suprême.
          </p>
        </div>

        <div className="panel flex flex-col gap-6">
          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Base de données</label>
            <select className="input" value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Mode de jeu</label>
            <div className="flex gap-3">
              <button
                onClick={() => setGameMode('classic')}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  gameMode === 'classic'
                    ? 'border-amber text-amber bg-amber/10 shadow-md'
                    : 'border-border text-text bg-surface2 opacity-60'
                }`}
              >
                📜 Mode Classique
                <span className="block text-[11px] font-normal text-muted mt-0.5">Place tes cartes sur ton propre plateau.</span>
              </button>
              <button
                onClick={() => setGameMode('sabotage')}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  gameMode === 'sabotage'
                    ? 'border-[#a855f7] text-[#a855f7] bg-[#a855f7]/10 shadow-md'
                    : 'border-border text-text bg-surface2 opacity-60'
                }`}
              >
                🗡️ Mode Sabotage
                <span className="block text-[11px] font-normal text-muted mt-0.5">Offre ou plie un personnage à n'importe quel joueur !</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Nombre de joueurs</label>
            <div className="flex gap-2.5">
              {[2, 3, 4].map((num, i) => (
                <button
                  key={num}
                  onClick={() => setPlayerCount(num)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    playerCount === num
                      ? `${PLAYER_COLORS[i].border} ${PLAYER_COLORS[i].text} bg-white/5 shadow-md`
                      : 'border-border text-text bg-surface2 opacity-60'
                  }`}
                >
                  {num} Joueurs
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i}>
                <label className="text-[12.5px] font-bold block mb-1 flex items-center gap-2" style={{ color: PLAYER_COLORS[i].hex }}>
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PLAYER_COLORS[i].hex }} />
                  Joueur {i + 1}
                </label>
                <input
                  className="input border-white/10"
                  value={playerNames[i]}
                  onChange={(e) => {
                    const newNames = [...playerNames];
                    newNames[i] = e.target.value;
                    setPlayerNames(newNames);
                  }}
                />
              </div>
            ))}
          </div>

          <button className="btn mt-2 w-fit" onClick={startGame}>
            🍃 Lancer le Draft Ninja
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. DRAFT & SABOTAGE =================
  if (phase === 'draft') {
    const activePlayer = boards[currentPlayerIdx];
    const activeColor = PLAYER_COLORS[currentPlayerIdx];

    // Cible active en mode sabotage
    const targetPlayerIdx = gameMode === 'sabotage' ? selectedTargetPlayerIdx : currentPlayerIdx;
    const targetBoard = boards[targetPlayerIdx];
    const targetColor = PLAYER_COLORS[targetPlayerIdx];

    return (
      <div className="flex flex-col gap-6 max-w-6xl mx-auto">
        {/* En-tête Tour & Carte Piochée */}
        <div
          className="bg-[#121420] border-2 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl"
          style={{ borderColor: activeColor.hex }}
        >
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: activeColor.hex }} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: activeColor.hex }}>
                Tour de {activePlayer.name} {gameMode === 'sabotage' && '🗡️ (Sabotage)'}
              </div>
              <h2 className="text-xl font-bold text-white">Carte piochée :</h2>
            </div>
          </div>

          {/* Carte piochée */}
          {drawnCard && (
            <div className="flex items-center gap-3 bg-[#181a28] p-2.5 px-4 rounded-xl border border-white/10">
              <div className="w-12 h-14 rounded-lg overflow-hidden bg-surface2 border border-white/10 shrink-0">
                {drawnCard.image_url ? (
                  <img src={drawnCard.image_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">🥷</div>
                )}
              </div>
              <div>
                <span className="text-sm font-extrabold text-amber block">{drawnCard.name}</span>
                <span className="text-[11px] text-muted">Où souhaitez-vous placer ce ninja ?</span>
              </div>
            </div>
          )}
        </div>

        {/* Sélecteur de Cible en Mode Sabotage */}
        {gameMode === 'sabotage' && (
          <div className="bg-[#181a28] border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xs font-bold text-amber shrink-0">🎯 Choisir le joueur à cibler :</span>
            <div className="flex gap-2 flex-wrap">
              {boards.map((b, pIdx) => {
                const isFull = CATEGORIES.every((cat) => b.cards[cat.key] !== null);
                return (
                  <button
                    key={pIdx}
                    disabled={isFull}
                    onClick={() => setSelectedTargetPlayerIdx(pIdx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      selectedTargetPlayerIdx === pIdx
                        ? `${PLAYER_COLORS[pIdx].border} ${PLAYER_COLORS[pIdx].text} bg-white/10`
                        : 'border-white/10 text-slate-400 bg-surface2'
                    } ${isFull ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {b.name} {pIdx === currentPlayerIdx && '(Toi)'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Plateaux des joueurs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boards.map((b, pIdx) => {
            const isTarget = pIdx === targetPlayerIdx;
            const pColor = PLAYER_COLORS[pIdx];

            return (
              <div
                key={pIdx}
                className={`bg-[#121420] border-2 rounded-xl p-4 flex flex-col gap-3 transition-all ${
                  isTarget ? 'ring-2 ring-amber/50 shadow-lg' : 'opacity-80'
                }`}
                style={{ borderColor: pColor.hex }}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pColor.hex }} />
                    {b.name}
                  </h3>
                  {isTarget && (
                    <span className="text-[10px] font-black uppercase text-amber bg-amber/10 px-2 py-0.5 rounded border border-amber/30">
                      Cible sélectionnée
                    </span>
                  )}
                </div>

                {/* 5 Catégories */}
                <div className="flex flex-col gap-2">
                  {CATEGORIES.map((cat) => {
                    const cardInCat = b.cards[cat.key];
                    const canPlace = isTarget && cardInCat === null;

                    return (
                      <div
                        key={cat.key}
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                          cardInCat
                            ? 'bg-[#181a28] border-white/10'
                            : canPlace
                            ? 'bg-amber/5 border-amber/30 hover:border-amber cursor-pointer'
                            : 'bg-surface2/30 border-white/5'
                        }`}
                        onClick={() => canPlace && placeCard(pIdx, cat.key)}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{cat.icon}</span>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted block leading-none">
                              {cat.label}
                            </span>
                            <span className="text-xs font-extrabold text-white">
                              {cardInCat ? cardInCat.name : '— Vide —'}
                            </span>
                          </div>
                        </div>

                        {/* Visuel miniature du Ninja posé */}
                        {cardInCat ? (
                          <div className="w-8 h-8 rounded overflow-hidden bg-surface border border-white/10 shrink-0">
                            {cardInCat.image_url ? (
                              <img src={cardInCat.image_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px]">🥷</div>
                            )}
                          </div>
                        ) : (
                          canPlace && (
                            <button className="btn py-1 px-3 text-[10px]">Placer ici ➕</button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ================= 3. END / RÉCAPITULATIF =================
  const gridColsClass =
    playerCount === 2 ? 'grid-cols-2' : playerCount === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] justify-between rounded-2xl p-2 md:p-4 overflow-hidden">
      <div className="text-center">
        <div className="text-[10px] font-bold text-amber uppercase tracking-wider">DRAFT TERMINÉ</div>
        <h1 className="font-serif text-2xl md:text-3xl font-black text-amber">Naruto Draft & Sabotage</h1>
        <p className="text-xs text-slate-300 mt-1">Évaluez les compositions et choisissez ensemble l'équipe gagnante !</p>
      </div>

      {/* Cartes finales des joueurs */}
      <div className={`grid ${gridColsClass} gap-3 my-auto w-full max-w-7xl mx-auto`}>
        {boards.map((b, idx) => {
          const pColor = PLAYER_COLORS[idx];
          return (
            <div
              key={idx}
              className="bg-[#121420]/95 border-2 rounded-xl p-2.5 flex flex-col gap-2 shadow-xl"
              style={{
                borderColor: pColor.hex,
                boxShadow: `0 0 15px ${pColor.hex}20`,
              }}
            >
              <div className="text-center pb-1.5 border-b border-white/10">
                <span className="text-[9px] uppercase font-black tracking-widest block" style={{ color: pColor.hex }}>
                  Équipe Ninja {idx + 1}
                </span>
                <h2 className="text-lg font-black text-white truncate">{b.name}</h2>
              </div>

              <div className="flex flex-col gap-1.5">
                {CATEGORIES.map((cat) => {
                  const card = b.cards[cat.key];
                  return (
                    <div key={cat.key} className="flex items-center gap-2 bg-[#181a28] p-1.5 rounded-lg border border-white/5">
                      <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-surface2 border border-white/10">
                        {card?.image_url ? (
                          <img src={card.image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px]">{cat.icon}</div>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 leading-tight">
                          {cat.icon} {cat.label}
                        </div>
                        <div className="text-[11px] font-extrabold text-white truncate leading-tight">
                          {card?.name || '—'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center mt-1">
        <button className="btn py-2 px-6 text-xs" onClick={() => setPhase('setup')}>
          ↺ Nouvelle partie
        </button>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { pickRandom } from '@/lib/utils';

type Phase = 'setup' | 'draft' | 'end';
type GameMode = 'classic' | 'sabotage';
type Theme = 'naruto' | 'onepiece';

interface CategoryConfig {
  key: string;
  label: string;
  icon: string;
}

const THEME_CATEGORIES: Record<Theme, CategoryConfig[]> = {
  naruto: [
    { key: 'cat1', label: 'Ninjutsu', icon: '🌀' },
    { key: 'cat2', label: 'Taijutsu', icon: '👊' },
    { key: 'cat3', label: 'Chakra', icon: '⚡' },
    { key: 'cat4', label: 'Hérédité', icon: '👁️' },
    { key: 'cat5', label: 'Vitesse', icon: '🍃' },
    { key: 'cat6', label: 'Invocation', icon: '🐸' },
  ],
  onepiece: [
    { key: 'cat1', label: 'Personnage', icon: '☠️' },
    { key: 'cat2', label: 'Fruit du Démon', icon: '🍊' },
    { key: 'cat3', label: 'Haki', icon: '👑' },
    { key: 'cat4', label: 'Arme', icon: '⚔️' },
    { key: 'cat5', label: 'Battle IQ', icon: '🧠' },
    { key: 'cat6', label: 'Vitesse', icon: '⚡' },
  ],
};

const PLAYER_COLORS = [
  { border: 'border-[#FF6600]', text: 'text-[#FF6600]', bg: 'bg-[#FF6600]', hex: '#FF6600', label: 'Joueur 1' },
  { border: 'border-[#00B4D8]', text: 'text-[#00B4D8]', bg: 'bg-[#00B4D8]', hex: '#00B4D8', label: 'Joueur 2' },
  { border: 'border-[#10B981]', text: 'text-[#10B981]', bg: 'bg-[#10B981]', hex: '#10B981', label: 'Joueur 3' },
  { border: 'border-[#A855F7]', text: 'text-[#A855F7]', bg: 'bg-[#A855F7]', hex: '#A855F7', label: 'Joueur 4' },
];

interface PlayerBoard {
  name: string;
  cards: Record<string, ListItem | null>;
}

export default function AnimeDraftPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [loading, setLoading] = useState(true);

  // Configuration
  const [theme, setTheme] = useState<Theme>('naruto');
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

  const [selectedTargetPlayerIdx, setSelectedTargetPlayerIdx] = useState<number>(0);

  const activeCategories = THEME_CATEGORIES[theme];

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const fetchedLists = data as GameList[];
        setLists(fetchedLists);

        const matchedList = fetchedLists.find((l) => l.game_type === 'naruto');
        setListId(matchedList ? matchedList.id : fetchedLists[0].id);
      }
      setLoading(false);
    })();
  }, []);

  function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme);
    const matchedList = lists.find((l) => l.game_type === newTheme);
    if (matchedList) {
      setListId(matchedList.id);
    }
  }

  useEffect(() => {
    if (!listId) return;
    (async () => {
      const { data } = await supabase.from('items').select('*').eq('list_id', listId);
      if (data) setAllItems(data as ListItem[]);
    })();
  }, [listId]);

  function startGame() {
    const requiredCards = playerCount * activeCategories.length;
    if (allItems.length < requiredCards) {
      alert(`Il faut au moins ${requiredCards} cartes dans la base pour ${playerCount} joueurs.`);
      return;
    }

    const emptyCards: Record<string, ListItem | null> = {};
    activeCategories.forEach((cat) => {
      emptyCards[cat.key] = null;
    });

    const initialBoards: PlayerBoard[] = playerNames.slice(0, playerCount).map((name) => ({
      name: name.trim() || 'Joueur',
      cards: { ...emptyCards },
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

  function placeCard(targetPlayerIdx: number, catKey: string) {
    if (!drawnCard) return;

    const updatedBoards = [...boards];
    updatedBoards[targetPlayerIdx].cards[catKey] = drawnCard;
    setBoards(updatedBoards);

    const isFinished = updatedBoards.every((b) =>
      activeCategories.every((cat) => b.cards[cat.key] !== null)
    );

    if (isFinished) {
      setPhase('end');
      return;
    }

    let nextPlayer = (currentPlayerIdx + 1) % playerCount;

    let attempts = 0;
    while (
      attempts < playerCount &&
      activeCategories.every((cat) => updatedBoards[nextPlayer].cards[cat.key] !== null)
    ) {
      nextPlayer = (nextPlayer + 1) % playerCount;
      attempts++;
    }

    const nextDeck = [...availableDeck];
    const newCard = nextDeck.pop() || null;

    setAvailableDeck(nextDeck);
    setDrawnCard(newCard);
    setCurrentPlayerIdx(nextPlayer);
    setSelectedTargetPlayerIdx(nextPlayer);
  }

  if (loading) return <p className="text-[#FF6600] p-8 text-center font-bold">Convocation des Shinobis et Pirates...</p>;

  // Styles dynamiques selon le thème
  const isNaruto = theme === 'naruto';

  // ================= 1. SETUP (ACCUEIL HYBRIDE SHINOBI X GRAND LINE) =================
  if (phase === 'setup') {
    return (
      <div className="bg-[#0B0F19] min-h-[calc(100vh-2rem)] rounded-2xl p-4 md:p-8 text-[#E2E8F0] border border-white/10 shadow-2xl overflow-hidden relative font-sans">
        {/* En-tête Dual Theme */}
        <div className="mb-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-[#FF6600]/20 to-[#00B4D8]/20 border border-white/20 mb-3">
            <span className="text-xs font-black text-[#FF6600]">🍃 KONOHA</span>
            <span className="text-xs text-slate-400">X</span>
            <span className="text-xs font-black text-[#00B4D8]">GRAND LINE ☠️</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF6600] via-[#FACC15] to-[#00B4D8]">
            ANIME DRAFT ARENA
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xl mx-auto italic">
            Sélectionnez votre univers, affrontez vos rivaux et bâtissez le Clan ou l'Équipage le plus puissant !
          </p>
        </div>

        <div className="bg-[#131B2E]/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-6 shadow-2xl max-w-4xl mx-auto relative z-10">
          {/* Choix du Thème (Design Dual Kart) */}
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-[#FACC15] block mb-2">
              1. Choix de l'Univers
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleThemeChange('naruto')}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-300 relative overflow-hidden flex items-center gap-4 ${
                  theme === 'naruto'
                    ? 'border-[#FF6600] bg-gradient-to-r from-[#FF6600]/20 to-[#131B2E] shadow-[0_0_20px_rgba(255,102,0,0.3)]'
                    : 'border-white/10 bg-white/5 hover:border-[#FF6600]/50'
                }`}
              >
                <div className="text-4xl shrink-0">🌀</div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Thème Naruto</h3>
                  <p className="text-xs text-slate-400">6 Catégories Ninja (Ninjutsu, Taijutsu, Chakra...)</p>
                </div>
              </button>

              <button
                onClick={() => handleThemeChange('onepiece')}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-300 relative overflow-hidden flex items-center gap-4 ${
                  theme === 'onepiece'
                    ? 'border-[#00B4D8] bg-gradient-to-r from-[#00B4D8]/20 to-[#131B2E] shadow-[0_0_20px_rgba(0,180,216,0.3)]'
                    : 'border-white/10 bg-white/5 hover:border-[#00B4D8]/50'
                }`}
              >
                <div className="text-4xl shrink-0">☠️</div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Thème One Piece</h3>
                  <p className="text-xs text-slate-400">6 Catégories Pirate (Haki, Fruit du Démon...)</p>
                </div>
              </button>
            </div>
          </div>

          {/* Base de données */}
          <div className="bg-[#0B0F19] p-4 rounded-xl border border-white/10">
            <label className="text-xs font-bold text-slate-300 block mb-1.5">📜 Catalogue de cartes sélectionné</label>
            <select
              className="w-full bg-[#131B2E] border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FACC15] outline-none"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.game_type === theme ? '★ (Auto-détecté)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Mode de jeu */}
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-[#FACC15] block mb-2">
              2. Réglement du Combat
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setGameMode('classic')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  gameMode === 'classic'
                    ? 'border-[#FACC15] bg-[#FACC15]/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                <div className="font-bold text-sm text-white">📜 Mode Classique</div>
                <div className="text-xs text-slate-400 mt-1">Chaque joueur complète son propre plateau.</div>
              </button>

              <button
                onClick={() => setGameMode('sabotage')}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  gameMode === 'sabotage'
                    ? 'border-[#A855F7] bg-[#A855F7]/10 text-white'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                <div className="font-bold text-sm text-white">🗡️ Mode Sabotage</div>
                <div className="text-xs text-slate-400 mt-1">Piégez les plateaux adverses avec vos pioches !</div>
              </button>
            </div>
          </div>

          {/* Nombre de Joueurs & Noms */}
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-300 block mb-2">
              3. Participants
            </label>
            <div className="flex gap-2 mb-4">
              {[2, 3, 4].map((num, i) => (
                <button
                  key={num}
                  onClick={() => setPlayerCount(num)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    playerCount === num
                      ? `${PLAYER_COLORS[i].border} ${PLAYER_COLORS[i].text} bg-white/10`
                      : 'border-white/10 text-slate-400 bg-white/5'
                  }`}
                >
                  {num} Joueurs
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: playerCount }).map((_, i) => (
                <div key={i} className="bg-[#0B0F19] p-3 rounded-xl border border-white/10">
                  <label className="text-xs font-bold block mb-1 flex items-center justify-between" style={{ color: PLAYER_COLORS[i].hex }}>
                    <span>Capitaine / Ninja {i + 1}</span>
                    <span className="text-[10px] text-slate-500">{PLAYER_COLORS[i].label}</span>
                  </label>
                  <input
                    className="w-full bg-[#131B2E] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FACC15] outline-none"
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
          </div>

          <button
            onClick={startGame}
            className={`w-fit mx-auto mt-2 px-8 py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-widest text-black hover:scale-105 transition-all duration-300 shadow-xl ${
              isNaruto
                ? 'bg-gradient-to-r from-[#FF6600] via-[#FF9900] to-[#FACC15] shadow-[0_0_20px_rgba(255,102,0,0.4)]'
                : 'bg-gradient-to-r from-[#00B4D8] via-[#90E0EF] to-[#FACC15] shadow-[0_0_20px_rgba(0,180,216,0.4)]'
            }`}
          >
            🚀 Lancer l'Édition {isNaruto ? 'Ninja' : 'Pirate'}
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. DRAFT & SABOTAGE (THEME IMMERSIF) =================
  if (phase === 'draft') {
    const activePlayer = boards[currentPlayerIdx];
    const activeColor = PLAYER_COLORS[currentPlayerIdx];
    const targetPlayerIdx = gameMode === 'sabotage' ? selectedTargetPlayerIdx : currentPlayerIdx;

    return (
      <div
        className={`min-h-[calc(100vh-2rem)] rounded-2xl p-4 md:p-6 text-[#E2E8F0] max-w-6xl mx-auto flex flex-col gap-6 border-2 shadow-2xl transition-colors duration-500 ${
          isNaruto ? 'bg-[#120B05] border-[#FF6600]/40' : 'bg-[#05101A] border-[#00B4D8]/40'
        }`}
      >
        {/* En-tête de Tour */}
        <div
          className={`border-2 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl relative ${
            isNaruto ? 'bg-[#1D1209]' : 'bg-[#0A1A2A]'
          }`}
          style={{ borderColor: activeColor.hex }}
        >
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: activeColor.hex }} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: activeColor.hex }}>
                TOUR DE : {activePlayer.name} {gameMode === 'sabotage' && '🗡️ (SABOTAGE)'}
              </div>
              <h2 className="text-xl font-extrabold text-white">
                {isNaruto ? '📜 Parchemin pioché :' : '☠️ Carte d\'Aventure piochée :'}
              </h2>
            </div>
          </div>

          {drawnCard && (
            <div className="flex items-center gap-3 bg-black/40 p-2.5 px-4 rounded-xl border border-white/10">
              <div className="w-12 h-14 rounded-lg overflow-hidden bg-slate-800 border border-white/20 shrink-0">
                {drawnCard.image_url ? (
                  <img src={drawnCard.image_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">
                    {isNaruto ? '🌀' : '🏴‍☠️'}
                  </div>
                )}
              </div>
              <div>
                <span className="text-sm font-extrabold text-[#FACC15] block">{drawnCard.name}</span>
                <span className="text-[11px] text-slate-400">Où placer cette carte ?</span>
              </div>
            </div>
          )}
        </div>

        {/* Sélection Cible Sabotage */}
        {gameMode === 'sabotage' && (
          <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xs font-bold text-[#FACC15] shrink-0">🎯 Cible du Sabotage :</span>
            <div className="flex gap-2 flex-wrap">
              {boards.map((b, pIdx) => {
                const isFull = activeCategories.every((cat) => b.cards[cat.key] !== null);
                return (
                  <button
                    key={pIdx}
                    disabled={isFull}
                    onClick={() => setSelectedTargetPlayerIdx(pIdx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      selectedTargetPlayerIdx === pIdx
                        ? `${PLAYER_COLORS[pIdx].border} ${PLAYER_COLORS[pIdx].text} bg-white/10`
                        : 'border-white/10 text-slate-400 bg-white/5'
                    } ${isFull ? 'opacity-30 cursor-not-allowed' : ''}`}
                  >
                    {b.name} {pIdx === currentPlayerIdx && '(Toi)'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Grille des Plateaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {boards.map((b, pIdx) => {
            const isTarget = pIdx === targetPlayerIdx;
            const pColor = PLAYER_COLORS[pIdx];

            return (
              <div
                key={pIdx}
                className={`border-2 rounded-2xl p-4 flex flex-col gap-3 transition-all ${
                  isNaruto ? 'bg-[#1C140C]' : 'bg-[#0E1E2E]'
                } ${isTarget ? 'ring-2 ring-[#FACC15]/60 shadow-xl' : 'opacity-85'}`}
                style={{ borderColor: pColor.hex }}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pColor.hex }} />
                    {b.name}
                  </h3>
                  {isTarget && (
                    <span className="text-[10px] font-black uppercase text-[#FACC15] bg-[#FACC15]/10 px-2.5 py-1 rounded-full border border-[#FACC15]/30">
                      Plateau Cible
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {activeCategories.map((cat) => {
                    const cardInCat = b.cards[cat.key];
                    const canPlace = isTarget && cardInCat === null;

                    return (
                      <div
                        key={cat.key}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          cardInCat
                            ? 'bg-black/40 border-white/10'
                            : canPlace
                            ? 'bg-[#FACC15]/5 border-[#FACC15]/40 hover:border-[#FACC15] cursor-pointer'
                            : 'bg-white/5 border-white/5'
                        }`}
                        onClick={() => canPlace && placeCard(pIdx, cat.key)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cat.icon}</span>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-0.5">
                              {cat.label}
                            </span>
                            <span className="text-xs font-extrabold text-white">
                              {cardInCat ? cardInCat.name : '— Emplacement Libre —'}
                            </span>
                          </div>
                        </div>

                        {cardInCat ? (
                          <div className="w-8 h-8 rounded overflow-hidden bg-black/50 border border-white/10 shrink-0">
                            {cardInCat.image_url ? (
                              <img src={cardInCat.image_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px]">✨</div>
                            )}
                          </div>
                        ) : (
                          canPlace && (
                            <button className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#FACC15] text-black hover:scale-105 transition-transform">
                              Placer ➕
                            </button>
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

  // ================= 3. END / RÉCAPITULATIF THÉMATIQUE =================
  const gridColsClass =
    playerCount === 2 ? 'grid-cols-2' : playerCount === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div
      className={`min-h-[calc(100vh-2rem)] rounded-2xl p-4 md:p-6 text-[#E2E8F0] flex flex-col justify-between border-2 shadow-2xl overflow-y-auto ${
        isNaruto ? 'bg-[#120B05] border-[#FF6600]/40' : 'bg-[#05101A] border-[#00B4D8]/40'
      }`}
    >
      <div className="text-center mb-4">
        <div className="text-[10px] font-black text-[#FACC15] uppercase tracking-[0.3em] mb-1">
          {isNaruto ? '🍃 RITUEL DES SHINOBIS 🍃' : '☠️ LE TRÉSOR DU PIRATE ☠️'}
        </div>
        <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF6600] via-[#FACC15] to-[#00B4D8]">
          RÉSULTATS DU DRAFT
        </h1>
      </div>

      <div className={`grid ${gridColsClass} gap-4 my-auto w-full max-w-7xl mx-auto`}>
        {boards.map((b, idx) => {
          const pColor = PLAYER_COLORS[idx];
          return (
            <div
              key={idx}
              className={`border-2 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xl relative ${
                isNaruto ? 'bg-[#1C140C]' : 'bg-[#0E1E2E]'
              }`}
              style={{
                borderColor: pColor.hex,
                boxShadow: `0 0 20px ${pColor.hex}25`,
              }}
            >
              <div className="text-center pb-2 border-b border-white/10">
                <span className="text-[9px] font-black uppercase tracking-widest block" style={{ color: pColor.hex }}>
                  {isNaruto ? `Clan ${idx + 1}` : `Équipage ${idx + 1}`}
                </span>
                <h2 className="text-base font-extrabold text-white truncate">{b.name}</h2>
              </div>

              <div className="flex flex-col gap-1.5">
                {activeCategories.map((cat) => {
                  const card = b.cards[cat.key];
                  return (
                    <div key={cat.key} className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-black/50 border border-white/10 flex items-center justify-center">
                        {card?.image_url ? (
                          <img src={card.image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-xs">{cat.icon}</span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="text-[8px] font-black uppercase tracking-wider text-slate-400 leading-tight">
                          {cat.icon} {cat.label}
                        </div>
                        <div className="text-[11px] font-extrabold text-[#FACC15] truncate leading-tight">
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

      <div className="flex justify-center mt-4">
        <button
          onClick={() => setPhase('setup')}
          className={`px-6 py-2.5 rounded-xl text-black font-extrabold text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg ${
            isNaruto ? 'bg-[#FF6600]' : 'bg-[#00B4D8]'
          }`}
        >
          ↺ Recommencer une aventure
        </button>
      </div>
    </div>
  );
}
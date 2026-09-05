'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { fetchListItemMeta, pickRandom, shuffle } from '@/lib/utils';

type Phase = 'setup' | 'secret_reveal' | 'play' | 'last_chance' | 'end';
type PIdx = 0 | 1;

export default function GuessWhoPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [loading, setLoading] = useState(true);

  // Taille du plateau configurable (12, 16 ou 20 cartes)
  const [gridSize, setGridSize] = useState<number>(20);

  // Joueurs & Config
  const [names, setNames] = useState<[string, string]>(['Joueur 1', 'Joueur 2']);
  const [phase, setPhase] = useState<Phase>('setup');
  
  // Cartes du plateau
  const [gridItems, setGridItems] = useState<ListItem[]>([]);
  const [secrets, setSecrets] = useState<[ListItem | null, ListItem | null]>([null, null]);
  
  // État du jeu
  const [activePlayer, setActivePlayer] = useState<PIdx>(0);
  const [eliminated, setEliminated] = useState<[Set<string>, Set<string>]>([new Set(), new Set()]);
  const [showTargets, setShowTargets] = useState<[boolean, boolean]>([false, false]);
  const [guessMode, setGuessMode] = useState<[boolean, boolean]>([false, false]);
  
  // Modale personnalisée
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isConfirm?: boolean;
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '' });

  // Responsive PC / Mobile
  const [isDesktop, setIsDesktop] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState('');

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      const { counts } = await fetchListItemMeta();
      const all = (data as GameList[]) || [];
      const validLists = all.filter((l) => (counts.get(l.id) || 0) >= gridSize);

      setLists(validLists);
      if (validLists.length > 0) setListId(validLists[0].id);
      setLoading(false);
    })();
  }, [gridSize]);

  function showAlert(title: string, message: string, onConfirm?: () => void) {
    setModalConfig({ isOpen: true, title, message, isConfirm: false, onConfirm });
  }

  function showConfirm(title: string, message: string, onConfirm: () => void) {
    setModalConfig({ isOpen: true, title, message, isConfirm: true, onConfirm });
  }

  async function startGame() {
    if (!listId) return;
    const { data: items } = await supabase.from('items').select('*').eq('list_id', listId);
    if (!items || items.length < gridSize) {
      showAlert('Erreur', `Il faut au moins ${gridSize} items dans cette base.`);
      return;
    }

    const selectedGrid = shuffle(items as ListItem[]).slice(0, gridSize);
    const secret1 = pickRandom(selectedGrid, 1)[0];
    let secret2 = pickRandom(selectedGrid, 1)[0];
    while (secret2.id === secret1.id) {
      secret2 = pickRandom(selectedGrid, 1)[0];
    }

    setGridItems(selectedGrid);
    setSecrets([secret1, secret2]);
    setEliminated([new Set(), new Set()]);
    setActivePlayer(0);
    setGuessMode([false, false]);
    setShowTargets([false, false]);
    setPhase(isDesktop ? 'play' : 'secret_reveal');
  }

  function toggleEliminate(pIdx: PIdx, itemId: string) {
    if (!isDesktop && pIdx !== activePlayer) return;

    const currentSet = new Set(eliminated[pIdx]);
    if (currentSet.has(itemId)) {
      currentSet.delete(itemId);
    } else {
      currentSet.add(itemId);
    }
    setEliminated(pIdx === 0 ? [currentSet, eliminated[1]] : [eliminated[0], currentSet]);
  }

  function handleGuess(pIdx: PIdx, item: ListItem) {
    showConfirm(
      'Confirmation de la réponse',
      `Es-tu sûr de vouloir désigner "${item.name}" comme réponse finale ?`,
      () => processGuess(pIdx, item)
    );
  }

  function processGuess(pIdx: PIdx, item: ListItem) {
    const opponentIdx: PIdx = pIdx === 0 ? 1 : 0;
    const targetSecret = secrets[opponentIdx];

    const isCorrect = item.id === targetSecret?.id;

    if (isCorrect) {
      if (pIdx === 0 && phase === 'play') {
        setPhase('last_chance');
        setActivePlayer(1);
        showAlert(
          '🎯 Personnage trouvé !',
          `${names[0]} a trouvé le personnage de ${names[1]} !\n\nDernière chance pour ${names[1]} de trouver la carte pour décrocher le MATCH NUL !`
        );
      } else if (phase === 'last_chance') {
        setWinnerMessage(`🤝 MATCH NUL ! ${names[1]} a aussi trouvé la carte mystère !`);
        setPhase('end');
      } else {
        setWinnerMessage(`🏆 Victoire de ${names[pIdx]} !`);
        setPhase('end');
      }
    } else {
      if (phase === 'last_chance') {
        setWinnerMessage(`🏆 Victoire de ${names[0]} ! ${names[1]} s'est trompé sur son ultime tentative.`);
        setPhase('end');
      } else {
        showAlert(
          '❌ Mauvaise réponse !',
          `Ce n'est pas ${item.name}. Le tour passe à l'adversaire.`,
          () => switchTurn()
        );
      }
    }
  }

  function switchTurn() {
    setGuessMode([false, false]);
    setShowTargets([false, false]);
    setActivePlayer((prev) => (prev === 0 ? 1 : 0));
  }

  const reset = () => {
    setPhase('setup');
    setGridItems([]);
    setSecrets([null, null]);
    setEliminated([new Set(), new Set()]);
    setWinnerMessage('');
  };

  if (loading) return <p className="text-muted p-4">Chargement...</p>;

  return (
    <div
      className="relative flex flex-col h-full max-h-[calc(100vh-2rem)] justify-between p-2 sm:p-4 w-full"
      onClick={() => setShowTargets([false, false])}
    >
      {/* Modale Personnalisée */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#121420] border-2 border-amber/60 rounded-2xl p-6 max-w-md w-full text-center shadow-[0_0_30px_rgba(245,158,11,0.3)] flex flex-col items-center gap-4">
            <h3 className="text-xl font-bold text-amber">{modalConfig.title}</h3>
            <p className="text-sm text-slate-300 whitespace-pre-line">{modalConfig.message}</p>
            <div className="flex gap-3 mt-2 w-full justify-center">
              {modalConfig.isConfirm && (
                <button
                  className="btn-ghost py-2 px-5 text-xs border border-white/20"
                  onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                >
                  Annuler
                </button>
              )}
              <button
                className="btn py-2 px-6 text-xs font-bold"
                onClick={() => {
                  const cb = modalConfig.onConfirm;
                  setModalConfig({ ...modalConfig, isOpen: false });
                  if (cb) cb();
                }}
              >
                {modalConfig.isConfirm ? 'Confirmer' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETUP */}
      {phase === 'setup' && (
        <div className="max-w-xl mx-auto p-4 my-auto w-full">
          <div className="mb-6 text-center">
            <div className="eyebrow">Mode de jeu</div>
            <h1 className="font-serif text-3xl font-bold">Qui est-ce ?</h1>
            <p className="text-muted text-sm mt-1">
              Pose tes questions à l'oral, coche les cartes éliminées et devine le personnage adverse !
            </p>
          </div>

          <div className="panel flex flex-col gap-5">
            <div>
              <label className="text-xs text-muted block mb-1.5">Nombre de cartes sur le plateau</label>
              <div className="grid grid-cols-3 gap-2">
                {[12, 16, 20].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setGridSize(size)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      gridSize === size
                        ? 'bg-amber/20 border-amber text-amber shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                        : 'bg-surface2 border-white/10 text-slate-300 hover:border-white/30'
                    }`}
                  >
                    🎴 {size} cartes
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted block mb-1">Base de jeu ({gridSize} cartes min)</label>
              <select className="input" value={listId} onChange={(e) => setListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted block mb-1">Joueur 1</label>
                <input className="input" value={names[0]} onChange={(e) => setNames([e.target.value, names[1]])} />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Joueur 2</label>
                <input className="input" value={names[1]} onChange={(e) => setNames([names[0], e.target.value])} />
              </div>
            </div>

            <button className="btn w-full mt-2" onClick={startGame}>▶ Lancer le Qui est-ce ?</button>
          </div>
        </div>
      )}

      {/* RÉVÉLATION SECRÈTE (MOBILE SÉPARÉ) */}
      {phase === 'secret_reveal' && !isDesktop && (
        <div className="max-w-md mx-auto p-4 text-center my-auto flex flex-col items-center gap-5">
          <div className="text-amber font-bold text-sm uppercase tracking-wider">
            Passe le téléphone à {names[activePlayer]}
          </div>

          <div className="bg-[#121420] border-2 border-amber/50 rounded-2xl p-6 w-full shadow-2xl flex flex-col items-center gap-4">
            <h2 className="text-xl font-bold text-white">Ta carte mystère à faire deviner :</h2>

            {showTargets[activePlayer] ? (
              <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-36 h-48 rounded-xl overflow-hidden border-2 border-amber shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                  {secrets[activePlayer]?.image_url ? (
                    <img src={secrets[activePlayer]?.image_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-surface2 flex items-center justify-center text-4xl">🎴</div>
                  )}
                </div>
                <span className="text-lg font-bold text-amber">{secrets[activePlayer]?.name}</span>
              </div>
            ) : (
              <button
                className="btn-ghost py-10 px-8 border-dashed border-amber/40 text-amber font-bold w-full"
                onClick={() => setShowTargets(activePlayer === 0 ? [true, showTargets[1]] : [showTargets[0], true])}
              >
                👁️ Appuie pour révéler ta carte
              </button>
            )}

            {showTargets[activePlayer] && (
              <button
                className="btn w-full mt-2"
                onClick={() => {
                  if (activePlayer === 0) {
                    setActivePlayer(1);
                  } else {
                    setActivePlayer(0);
                    setPhase('play');
                  }
                }}
              >
                {activePlayer === 0 ? `C'est bon ! Passer à ${names[1]}` : 'Commencer la partie !'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* EN JEU / ULTIME TENTATIVE */}
      {(phase === 'play' || phase === 'last_chance') && (
        <div className="flex flex-col h-full justify-between max-w-6xl mx-auto w-full gap-3">
          {/* Bandeau supérieur miroir */}
          <div className="relative flex items-stretch bg-[#121420]/90 border border-white/10 rounded-xl overflow-visible shadow-lg">
            {/* Joueur 1 (Gauche) */}
            <div
              className={`flex-1 flex items-center justify-between p-2 border-b-2 transition-all rounded-l-xl bg-gradient-to-r from-[#e2645a]/25 via-[#e2645a]/10 to-transparent ${
                activePlayer === 0 ? 'border-[#e2645a] ring-1 ring-[#e2645a]/50' : 'border-transparent opacity-70'
              }`}
            >
              <div>
                <div className="font-bold text-white text-xs sm:text-sm">{names[0]}</div>
                <span className="text-[10px] text-[#e2645a] font-bold">
                  {eliminated[0].size}/{gridSize} éliminés
                </span>
              </div>

              {/* Bouton Cible P1 */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowTargets([!showTargets[0], false])}
                  className="px-2.5 py-1 rounded border text-[11px] font-bold transition flex items-center gap-1 bg-[#e2645a]/15 border-[#e2645a]/40 text-[#e2645a] hover:bg-[#e2645a]/30"
                >
                  👁️ {showTargets[0] ? 'Masquer' : 'Ma cible'}
                </button>

                {showTargets[0] && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 bg-[#161822] border-2 border-[#e2645a] rounded-xl p-2 shadow-2xl flex flex-col items-center gap-1 w-28 animate-in fade-in zoom-in-95 duration-150">
                    <span className="text-[9px] text-[#e2645a] font-bold">Ta cible :</span>
                    {secrets[0]?.image_url ? (
                      <img src={secrets[0].image_url} className="w-full h-16 object-cover rounded-md" alt="" />
                    ) : (
                      <div className="w-full h-16 bg-surface2 rounded-md flex items-center justify-center text-xs">🎴</div>
                    )}
                    <span className="text-[10px] font-black text-white truncate w-full text-center">
                      {secrets[0]?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Démarcation centrale "VS" avec bouton "Tour suivant" placé en dessous */}
            <div className="relative flex flex-col items-center justify-center px-3 py-1 bg-[#181b2c] border-x border-white/10 z-10 shrink-0">
              <span className="text-amber font-black text-xs px-1 py-0.5 rounded shadow-sm">VS</span>
              <button
                onClick={switchTurn}
                className="mt-1 px-2 py-0.5 rounded bg-amber/20 hover:bg-amber/30 border border-amber/40 text-amber font-bold text-[9px] transition-all flex items-center gap-1 shrink-0"
                title="Passer au joueur suivant"
              >
                <span>Tour suivant</span>
                <span className="text-[10px]">→</span>
              </button>
            </div>

            {/* Joueur 2 (Droite) */}
            <div
              className={`flex-1 flex items-center justify-between p-2 border-b-2 transition-all rounded-r-xl bg-gradient-to-l from-[#4fc9c0]/25 via-[#4fc9c0]/10 to-transparent ${
                activePlayer === 1 ? 'border-[#4fc9c0] ring-1 ring-[#4fc9c0]/50' : 'border-transparent opacity-70'
              }`}
            >
              {/* Bouton Cible P2 */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowTargets([false, !showTargets[1]])}
                  className="px-2.5 py-1 rounded border text-[11px] font-bold transition flex items-center gap-1 bg-[#4fc9c0]/15 border-[#4fc9c0]/40 text-[#4fc9c0] hover:bg-[#4fc9c0]/30"
                >
                  👁️ {showTargets[1] ? 'Masquer' : 'Ma cible'}
                </button>

                {showTargets[1] && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 bg-[#161822] border-2 border-[#4fc9c0] rounded-xl p-2 shadow-2xl flex flex-col items-center gap-1 w-28 animate-in fade-in zoom-in-95 duration-150">
                    <span className="text-[9px] text-[#4fc9c0] font-bold">Ta cible :</span>
                    {secrets[1]?.image_url ? (
                      <img src={secrets[1].image_url} className="w-full h-16 object-cover rounded-md" alt="" />
                    ) : (
                      <div className="w-full h-16 bg-surface2 rounded-md flex items-center justify-center text-xs">🎴</div>
                    )}
                    <span className="text-[10px] font-black text-white truncate w-full text-center">
                      {secrets[1]?.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="font-bold text-white text-xs sm:text-sm">{names[1]}</div>
                <span className="text-[10px] text-[#4fc9c0] font-bold">
                  {eliminated[1].size}/{gridSize} éliminés
                </span>
              </div>
            </div>
          </div>

          {phase === 'last_chance' && (
            <div className="bg-amber/20 border border-amber/60 text-amber text-xs font-bold p-2 rounded-lg text-center animate-bounce">
              ⚠️ ULTIME CHANCE POUR {names[1]} : Propose la carte pour arracher le match nul !
            </div>
          )}

          {/* Grilles de jeu */}
          <div className={`grid gap-4 overflow-y-auto my-auto pr-1 ${isDesktop ? 'grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto w-full'}`}>
            {([0, 1] as PIdx[]).map((pIdx) => {
              if (!isDesktop && pIdx !== activePlayer) return null;

              const playerAccent = pIdx === 0 ? '#e2645a' : '#4fc9c0';
              const currentEliminated = eliminated[pIdx];
              const isPlayerGuessing = guessMode[pIdx];
              const remainingCount = gridSize - currentEliminated.size;

              return (
                <div
                  key={pIdx}
                  className={`bg-[#121420]/90 border-2 rounded-2xl p-3 flex flex-col gap-3 transition-all ${
                    activePlayer === pIdx ? 'ring-2 ring-amber/50 opacity-100' : 'opacity-60'
                  }`}
                  style={{ borderColor: playerAccent }}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div>
                      <h3 className="font-bold text-sm text-white" style={{ color: playerAccent }}>{names[pIdx]}</h3>
                      <span className="text-[10px] text-slate-400">Cartes restantes : <b>{remainingCount}/{gridSize}</b></span>
                    </div>

                    <button
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        isPlayerGuessing ? 'bg-amber text-black' : 'bg-amber/20 text-amber border border-amber/40'
                      }`}
                      onClick={() => setGuessMode(pIdx === 0 ? [!isPlayerGuessing, guessMode[1]] : [guessMode[0], !isPlayerGuessing])}
                    >
                      {isPlayerGuessing ? 'Annuler' : '🎯 Proposer un nom'}
                    </button>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {gridItems.map((item) => {
                      const isElim = currentEliminated.has(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (isPlayerGuessing) {
                              handleGuess(pIdx, item);
                            } else {
                              toggleEliminate(pIdx, item.id);
                            }
                          }}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col items-center justify-between p-1 bg-[#141622] select-none ${
                            isPlayerGuessing
                              ? 'border-amber shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-105 z-10'
                              : isElim
                              ? 'border-red-900/40 opacity-25 grayscale'
                              : 'border-white/20 hover:border-white/60'
                          }`}
                        >
                          <div className="w-full aspect-square rounded-lg overflow-hidden bg-surface2 relative">
                            {item.image_url ? (
                              <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">🎴</div>
                            )}

                            {isElim && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-red-500 font-black text-2xl">
                                ❌
                              </div>
                            )}
                          </div>

                          <span className={`text-[10px] font-bold truncate max-w-full mt-1 ${isElim ? 'line-through text-slate-500' : 'text-white'}`}>
                            {item.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FIN DE PARTIE */}
      {phase === 'end' && (
        <div className="max-w-md mx-auto p-4 text-center my-auto flex flex-col items-center gap-6">
          <h2 className="text-3xl font-black text-amber drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
            {winnerMessage}
          </h2>

          <div className="grid grid-cols-2 gap-4 w-full bg-[#121420] border border-white/10 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-[#e2645a]">Carte de {names[0]}</span>
              <div className="w-24 h-32 rounded-xl overflow-hidden border-2 border-[#e2645a]">
                {secrets[0]?.image_url ? (
                  <img src={secrets[0].image_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-surface2 flex items-center justify-center">🎴</div>
                )}
              </div>
              <span className="text-xs font-bold text-white">{secrets[0]?.name}</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-[#4fc9c0]">Carte de {names[1]}</span>
              <div className="w-24 h-32 rounded-xl overflow-hidden border-2 border-[#4fc9c0]">
                {secrets[1]?.image_url ? (
                  <img src={secrets[1].image_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-surface2 flex items-center justify-center">🎴</div>
                )}
              </div>
              <span className="text-xs font-bold text-white">{secrets[1]?.name}</span>
            </div>
          </div>

          <button className="btn py-3 px-8 text-sm" onClick={reset}>↺ Rejouer une partie</button>
        </div>
      )}
    </div>
  );
}
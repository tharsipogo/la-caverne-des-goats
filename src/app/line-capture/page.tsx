'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { pickRandom, shuffle } from '@/lib/utils';

type Phase = 'setup' | 'game' | 'event' | 'end';
type SelectionMode = 'random' | 'choice';
type PIdx = 0 | 1;

interface Edge {
  id: string;
  r: number;
  c: number;
  type: 'h' | 'v';
  owner: PIdx | null;
}

interface EventCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'discard_target' | 'discard_cross' | 'swap_weak' | 'swap_strong' | 'heist' | 'reinforcement';
}

const EVENT_CARDS: EventCard[] = [
  {
    id: '1',
    title: 'Défausse',
    description: 'L\'adversaire doit défausser une de ses cartes.',
    icon: '🗑️',
    type: 'discard_target',
  },
  {
    id: '2',
    title: 'Défausse croisée',
    description: 'L\'adversaire et toi choisissez une carte à défausser chacun.',
    icon: '⚖️',
    type: 'discard_cross',
  },
  {
    id: '3',
    title: 'Échange Libre',
    description: 'Échange une carte de ton choix contre une carte de l\'adversaire.',
    icon: '🔄',
    type: 'swap_weak',
  },
  {
    id: '4',
    title: 'Échange Tactique',
    description: 'Échange une carte de ton équipe contre une de l\'adversaire.',
    icon: '👑',
    type: 'swap_strong',
  },
  {
    id: '5',
    title: 'Braquage',
    description: 'Vol une carte de l\'adversaire en lui donnant une des tiennes.',
    icon: '🥷',
    type: 'heist',
  },
  {
    id: '6',
    title: 'Renfort',
    description: 'Une carte bonus tirée au hasard dans la base rejoint ton équipe.',
    icon: '📦',
    type: 'reinforcement',
  },
];

const PLAYER_COLORS = [
  { hex: '#e2645a', label: 'Joueur 1' },
  { hex: '#4fc9c0', label: 'Joueur 2' },
];

export default function LineCapturePage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [loading, setLoading] = useState(true);

  // Configuration
  const [names, setNames] = useState<[string, string]>(['Joueur 1', 'Joueur 2']);
  const [mode, setMode] = useState<SelectionMode>('random');
  const [allItems, setAllItems] = useState<ListItem[]>([]);
  const [manualSelection, setManualSelection] = useState<ListItem[]>([]);

  // État de la partie
  const [phase, setPhase] = useState<Phase>('setup');
  const [gridItems, setGridItems] = useState<ListItem[]>([]);
  const [capturedBy, setCapturedBy] = useState<(PIdx | null)[]>(Array(9).fill(null));

  const [edges, setEdges] = useState<Edge[]>([]);
  const [activePlayer, setActivePlayer] = useState<PIdx>(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [movesLeft, setMovesLeft] = useState<number>(0);
  const [isEraserMode, setIsEraserMode] = useState<boolean>(false);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  // Compteur de traits posés par chaque joueur
  const [linesDrawnCount, setLinesDrawnCount] = useState<[number, number]>([0, 0]);

  // Phase événement
  const [underdogPlayer, setUnderdogPlayer] = useState<PIdx>(0);
  const [drawnCards, setDrawnCards] = useState<EventCard[]>([]);
  const [selectedEventCard, setSelectedEventCard] = useState<EventCard | null>(null);
  const [eventAppliedMessage, setEventAppliedMessage] = useState<string>('');

  // Équipes finales après application de l'effet
  const [finalTeam1, setFinalTeam1] = useState<ListItem[]>([]);
  const [finalTeam2, setFinalTeam2] = useState<ListItem[]>([]);

  // États de sélection manuelle d'action d'événement
  const [myCardToSwap, setMyCardToSwap] = useState<ListItem | null>(null);
  const [oppCardToSwap, setOppCardToSwap] = useState<ListItem | null>(null);

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

  function initEdges() {
    const newEdges: Edge[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        newEdges.push({ id: `h-${r}-${c}`, r, c, type: 'h', owner: null });
      }
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        newEdges.push({ id: `v-${r}-${c}`, r, c, type: 'v', owner: null });
      }
    }
    return newEdges;
  }

  function startGame() {
    let selected: ListItem[] = [];
    if (mode === 'random') {
      if (allItems.length < 9) {
        alert('Il faut au moins 9 personnages dans la base.');
        return;
      }
      selected = pickRandom(allItems, 9);
    } else {
      if (manualSelection.length !== 9) {
        alert('Veuillez sélectionner exactement 9 personnages.');
        return;
      }
      selected = shuffle([...manualSelection]);
    }

    setGridItems(selected);
    setCapturedBy(Array(9).fill(null));
    setEdges(initEdges());
    setActivePlayer(0);
    setDiceValue(null);
    setMovesLeft(0);
    setIsEraserMode(false);
    setLinesDrawnCount([0, 0]);
    setSelectedEventCard(null);
    setEventAppliedMessage('');
    setPhase('game');
  }

  function rollDice() {
    if (isRolling || movesLeft > 0) return;
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 4) + 1);
      count++;
      if (count > 10) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 4) + 1;
        setDiceValue(finalVal);
        setIsRolling(false);

        if (finalVal === 4) {
          const hasAnyEdges = edges.some((e) => e.owner !== null);
          if (hasAnyEdges) {
            setIsEraserMode(true);
            setMovesLeft(1);
          } else {
            setActivePlayer((prev) => (prev === 0 ? 1 : 0));
            setDiceValue(null);
          }
        } else {
          setIsEraserMode(false);
          setMovesLeft(finalVal);
        }
      }
    }, 60);
  }

  // Recalcule l'état de possession de chaque case du plateau (Ajout OU Suppression)
  function recalculateCaptures(currentEdges: Edge[]) {
    const updatedCaptures: (PIdx | null)[] = Array(9).fill(null);

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const idx = r * 3 + c;

        const top = currentEdges.find((e) => e.type === 'h' && e.r === r && e.c === c);
        const bottom = currentEdges.find((e) => e.type === 'h' && e.r === r + 1 && e.c === c);
        const left = currentEdges.find((e) => e.type === 'v' && e.r === r && e.c === c);
        const right = currentEdges.find((e) => e.type === 'v' && e.r === r && e.c === c + 1);

        // Une carte n'appartient à un joueur que si TOUS ses 4 côtés sont complétés
        if (top?.owner !== null && bottom?.owner !== null && left?.owner !== null && right?.owner !== null) {
          // Si la case était déjà capturée, elle conserve son propriétaire, sinon elle prend le joueur actif
          updatedCaptures[idx] = capturedBy[idx] !== null ? capturedBy[idx] : activePlayer;
        } else {
          // Si au moins un côté manque (ex: effacé par la gomme), la carte redevient neutre !
          updatedCaptures[idx] = null;
        }
      }
    }

    setCapturedBy(updatedCaptures);

    // Si le plateau est plein, on passe à la phase événement
    if (updatedCaptures.every((c) => c !== null)) {
      triggerEventPhase(updatedCaptures);
    }
  }

  // Clic sur un trait (Ajout ou Gomme)
  function handleEdgeClick(edge: Edge) {
    if (movesLeft <= 0 || isRolling) return;

    if (isEraserMode) {
      if (edge.owner === null) return;
      const updatedEdges = edges.map((e) => (e.id === edge.id ? { ...e, owner: null } : e));
      setEdges(updatedEdges);
      recalculateCaptures(updatedEdges);

      setIsEraserMode(false);
      setMovesLeft(0);
      setActivePlayer((prev) => (prev === 0 ? 1 : 0));
      setDiceValue(null);
    } else {
      if (edge.owner !== null) return;
      const updatedEdges = edges.map((e) => (e.id === edge.id ? { ...e, owner: activePlayer } : e));
      setEdges(updatedEdges);

      const newCounts: [number, number] = [...linesDrawnCount];
      newCounts[activePlayer] += 1;
      setLinesDrawnCount(newCounts);

      recalculateCaptures(updatedEdges);

      const nextMoves = movesLeft - 1;
      setMovesLeft(nextMoves);

      if (nextMoves === 0) {
        setActivePlayer((prev) => (prev === 0 ? 1 : 0));
        setDiceValue(null);
      }
    }
  }

  function triggerEventPhase(currentCaptures: (PIdx | null)[]) {
    const underdog: PIdx = linesDrawnCount[0] < linesDrawnCount[1] ? 0 : 1;
    setUnderdogPlayer(underdog);

    const randomThree = pickRandom(EVENT_CARDS, 3);
    setDrawnCards(randomThree);

    const t1 = gridItems.filter((_, i) => currentCaptures[i] === 0);
    const t2 = gridItems.filter((_, i) => currentCaptures[i] === 1);
    setFinalTeam1(t1);
    setFinalTeam2(t2);

    setPhase('event');
  }

  function applyEventCard(card: EventCard) {
    setSelectedEventCard(card);
    setMyCardToSwap(null);
    setOppCardToSwap(null);

    const uTeam = underdogPlayer === 0 ? finalTeam1 : finalTeam2;
    const oppTeam = underdogPlayer === 0 ? finalTeam2 : finalTeam1;

    if (card.type === 'reinforcement') {
      const unused = allItems.filter((it) => !gridItems.some((g) => g.id === it.id));
      if (unused.length > 0) {
        const bonus = pickRandom(unused, 1)[0];
        if (underdogPlayer === 0) setFinalTeam1([...finalTeam1, bonus]);
        else setFinalTeam2([...finalTeam2, bonus]);
        setEventAppliedMessage(`"${bonus.name}" rejoint l'équipe de ${names[underdogPlayer]} !`);
      } else {
        setEventAppliedMessage('Aucune carte de renfort disponible dans la base.');
      }
    } else if (uTeam.length === 0 && oppTeam.length === 0) {
      setEventAppliedMessage('Aucune carte disponible dans les équipes pour appliquer cet effet.');
    } else {
      setEventAppliedMessage('Choisissez les cartes ci-dessous pour valider l\'action.');
    }
  }

  function executeManualSwap() {
    if (!selectedEventCard) return;

    let t1 = [...finalTeam1];
    let t2 = [...finalTeam2];

    const uIs0 = underdogPlayer === 0;
    let uTeam = uIs0 ? t1 : t2;
    let oppTeam = uIs0 ? t2 : t1;

    switch (selectedEventCard.type) {
      case 'discard_target':
        if (oppCardToSwap) {
          oppTeam = oppTeam.filter((c) => c.id !== oppCardToSwap.id);
          setEventAppliedMessage(`"${oppCardToSwap.name}" a été défaussée de l'équipe adverse.`);
        }
        break;

      case 'discard_cross':
        if (myCardToSwap && oppCardToSwap) {
          uTeam = uTeam.filter((c) => c.id !== myCardToSwap.id);
          oppTeam = oppTeam.filter((c) => c.id !== oppCardToSwap.id);
          setEventAppliedMessage(`"${myCardToSwap.name}" et "${oppCardToSwap.name}" ont été défaussées.`);
        }
        break;

      case 'swap_weak':
      case 'swap_strong':
      case 'heist':
        if (myCardToSwap && oppCardToSwap) {
          uTeam = uTeam.filter((c) => c.id !== myCardToSwap.id);
          oppTeam = oppTeam.filter((c) => c.id !== oppCardToSwap.id);
          uTeam.push(oppCardToSwap);
          oppTeam.push(myCardToSwap);
          setEventAppliedMessage(`Échange effectué : "${oppCardToSwap.name}" rejoint ${names[underdogPlayer]}.`);
        }
        break;
    }

    if (uIs0) {
      setFinalTeam1(uTeam);
      setFinalTeam2(oppTeam);
    } else {
      setFinalTeam1(oppTeam);
      setFinalTeam2(uTeam);
    }

    setMyCardToSwap(null);
    setOppCardToSwap(null);
  }

  if (loading) return <p className="text-muted p-8">Chargement de Line Capture...</p>;

  // ================= 1. SETUP =================
  if (phase === 'setup') {
    return (
      <div>
        <div className="mb-7">
          <div className="eyebrow">Mode</div>
          <h1 className="font-serif text-3xl font-black text-amber">Line Capture</h1>
          <p className="text-muted mt-2 text-[14.5px] max-w-xl">
            Reliez les points pour capturer les cartes de la grille 3x3 et constituez votre équipe.
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

          <div className="flex gap-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[12.5px] font-bold text-[#e2645a] block mb-1.5">Joueur 1</label>
              <input className="input" value={names[0]} onChange={(e) => setNames([e.target.value, names[1]])} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[12.5px] font-bold text-[#4fc9c0] block mb-1.5">Joueur 2</label>
              <input className="input" value={names[1]} onChange={(e) => setNames([names[0], e.target.value])} />
            </div>
          </div>

          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Mode de sélection des 9 cartes</label>
            <div className="flex gap-3">
              <button
                onClick={() => setMode('random')}
                className={`px-4 py-2 rounded-xl text-sm font-bold border ${
                  mode === 'random' ? 'border-amber text-amber bg-amber/10' : 'border-border text-text bg-surface2'
                }`}
              >
                🎲 Tirage aléatoire
              </button>
              <button
                onClick={() => setMode('choice')}
                className={`px-4 py-2 rounded-xl text-sm font-bold border ${
                  mode === 'choice' ? 'border-amber text-amber bg-amber/10' : 'border-border text-text bg-surface2'
                }`}
              >
                🎯 Choix manuel ({manualSelection.length}/9)
              </button>
            </div>
          </div>

          {mode === 'choice' && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 max-h-60 overflow-y-auto p-2 bg-surface2/50 rounded-xl border border-border">
              {allItems.map((it) => {
                const isSelected = manualSelection.some((m) => m.id === it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => {
                      if (isSelected) setManualSelection((s) => s.filter((m) => m.id !== it.id));
                      else if (manualSelection.length < 9) setManualSelection((s) => [...s, it]);
                    }}
                    className={`p-1.5 rounded-lg border text-center flex flex-col items-center gap-1 ${
                      isSelected ? 'border-amber bg-amber/20' : 'border-border bg-surface'
                    }`}
                  >
                    {it.image_url && <img src={it.image_url} className="w-10 h-10 object-cover rounded-md" alt="" />}
                    <span className="text-[10px] font-bold truncate max-w-full">{it.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button className="btn w-fit" onClick={startGame}>▶ Démarrer la partie</button>
        </div>
      </div>
    );
  }

  // ================= 2. GAME =================
  if (phase === 'game') {
    const activeColor = PLAYER_COLORS[activePlayer].hex;

    return (
      <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] justify-between rounded-2xl p-4 overflow-hidden">
        {/* Bandeau de jeu */}
        <div className="flex items-center justify-between bg-[#121420] border-2 rounded-2xl p-3.5 shadow-xl" style={{ borderColor: activeColor }}>
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ backgroundColor: activeColor }} />
            <div>
              <span className="text-[10px] uppercase font-black" style={{ color: activeColor }}>Tour Actuel</span>
              <h2 className="text-lg font-black text-white">{names[activePlayer]}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {movesLeft > 0 ? (
              <span className="text-xs font-bold text-slate-300">
                {isEraserMode ? (
                  <b className="text-red-400 text-sm">🧹 Mode Gomme : Cliquez sur un trait à effacer !</b>
                ) : (
                  <>Traits restants : <b className="text-amber text-base">{movesLeft}</b></>
                )}
              </span>
            ) : (
              <button className="btn py-2 px-5 text-xs" onClick={rollDice} disabled={isRolling}>
                🎲 Lancer le dé (1-4)
              </button>
            )}
            {diceValue !== null && (
              <div className="w-10 h-10 bg-amber text-black font-black text-xl rounded-xl flex items-center justify-center shadow-lg">
                {diceValue === 4 ? '🧹' : diceValue}
              </div>
            )}
          </div>
        </div>

        {/* Plateau de Jeu */}
        <div className="my-auto mx-auto bg-[#121420] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative select-none">
          <div className="relative w-[330px] h-[330px] sm:w-[420px] sm:h-[420px]">
            
            {/* Cartes */}
            {gridItems.map((item, idx) => {
              const r = Math.floor(idx / 3);
              const c = idx % 3;
              const owner = capturedBy[idx];

              return (
                <div
                  key={idx}
                  className="absolute bg-[#181a28] rounded-2xl overflow-hidden border-2 transition-all duration-300 flex flex-col items-center justify-center p-1"
                  style={{
                    top: `calc(${r} * 33.33% + 8px)`,
                    left: `calc(${c} * 33.33% + 8px)`,
                    width: 'calc(33.33% - 16px)',
                    height: 'calc(33.33% - 16px)',
                    borderColor: owner !== null ? PLAYER_COLORS[owner].hex : 'rgba(255,255,255,0.08)',
                    boxShadow: owner !== null ? `0 0 20px ${PLAYER_COLORS[owner].hex}88` : 'none',
                  }}
                >
                  {item.image_url ? (
                    <img src={item.image_url} className="w-full h-full object-cover rounded-xl" alt="" />
                  ) : (
                    <span className="text-xs font-bold text-center text-white">{item.name}</span>
                  )}

                  {owner !== null && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-xs font-black px-2 py-0.5 rounded text-white shadow-md" style={{ backgroundColor: PLAYER_COLORS[owner].hex }}>
                        {names[owner]}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Traits Horizontaux */}
            {edges.filter((e) => e.type === 'h').map((edge) => (
              <button
                key={edge.id}
                onClick={() => handleEdgeClick(edge)}
                disabled={Boolean(movesLeft === 0 || (isEraserMode ? edge.owner === null : edge.owner !== null))}
                className={`absolute -translate-y-1/2 -translate-x-1/2 h-6 flex items-center justify-center z-20 ${
                  movesLeft > 0 ? 'hover:brightness-150 cursor-pointer group' : ''
                }`}
                style={{
                  top: `calc(${edge.r} * 33.33%)`,
                  left: `calc(${edge.c} * 33.33% + 16.66%)`,
                  width: 'calc(33.33% - 16px)',
                }}
              >
                <div
                  className={`w-full h-2 rounded-full transition-all duration-200 ${
                    edge.owner === null ? 'bg-transparent group-hover:bg-amber/40' : ''
                  }`}
                  style={{
                    backgroundColor: edge.owner !== null ? PLAYER_COLORS[edge.owner].hex : undefined,
                  }}
                />
              </button>
            ))}

            {/* Traits Verticaux */}
            {edges.filter((e) => e.type === 'v').map((edge) => (
              <button
                key={edge.id}
                onClick={() => handleEdgeClick(edge)}
                disabled={Boolean(movesLeft === 0 || (isEraserMode ? edge.owner === null : edge.owner !== null))}
                className={`absolute -translate-y-1/2 -translate-x-1/2 w-6 flex items-center justify-center z-20 ${
                  movesLeft > 0 ? 'hover:brightness-150 cursor-pointer group' : ''
                }`}
                style={{
                  top: `calc(${edge.r} * 33.33% + 16.66%)`,
                  left: `calc(${edge.c} * 33.33%)`,
                  height: 'calc(33.33% - 16px)',
                }}
              >
                <div
                  className={`h-full w-2 rounded-full transition-all duration-200 ${
                    edge.owner === null ? 'bg-transparent group-hover:bg-amber/40' : ''
                  }`}
                  style={{
                    backgroundColor: edge.owner !== null ? PLAYER_COLORS[edge.owner].hex : undefined,
                  }}
                />
              </button>
            ))}

            {/* 16 Points d'Intersection */}
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3].map((c) => (
                <div
                  key={`dot-${r}-${c}`}
                  className="absolute w-3.5 h-3.5 rounded-full bg-slate-300 border-2 border-[#121420] -translate-x-1/2 -translate-y-1/2 z-30 shadow-md"
                  style={{
                    top: `calc(${r} * 33.33%)`,
                    left: `calc(${c} * 33.33%)`,
                  }}
                />
              ))
            )}

          </div>
        </div>
      </div>
    );
  }

  // ================= 3. PHASE ÉVÉNEMENT =================
  if (phase === 'event') {
    const underdogName = names[underdogPlayer];
    const underdogColor = PLAYER_COLORS[underdogPlayer].hex;

    const uTeam = underdogPlayer === 0 ? finalTeam1 : finalTeam2;
    const oppTeam = underdogPlayer === 0 ? finalTeam2 : finalTeam1;
    const oppName = names[underdogPlayer === 0 ? 1 : 0];

    const needsMyCard = Boolean(selectedEventCard && ['discard_cross', 'swap_weak', 'swap_strong', 'heist'].includes(selectedEventCard.type));
    const needsOppCard = Boolean(selectedEventCard && ['discard_target', 'discard_cross', 'swap_weak', 'swap_strong', 'heist'].includes(selectedEventCard.type));

    return (
      <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] justify-between rounded-2xl p-4 overflow-y-auto">
        <div className="text-center">
          <div className="text-[10px] font-bold text-amber uppercase tracking-wider">CARTE ÉVÉNEMENT</div>
          <h1 className="font-serif text-2xl font-black text-white">
            <span style={{ color: underdogColor }}>{underdogName}</span> a tracé moins de traits ({linesDrawnCount[underdogPlayer]}) !
          </h1>
          <p className="text-xs text-slate-300 mt-1">Choisissez une carte face cachée pour appliquer son effet avant le bilan final.</p>
        </div>

        {/* Cartes face cachée */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto my-4 w-full">
          {drawnCards.map((card, idx) => {
            const isSelected = selectedEventCard?.id === card.id;

            return (
              <button
                key={card.id}
                disabled={Boolean(selectedEventCard !== null)}
                onClick={() => applyEventCard(card)}
                className={`h-60 rounded-2xl border-2 p-5 flex flex-col items-center justify-between text-center transition-all duration-500 shadow-2xl relative overflow-hidden ${
                  selectedEventCard === null
                    ? 'bg-gradient-to-br from-[#1c1e2e] to-[#121420] border-amber/40 hover:border-amber hover:scale-105 cursor-pointer'
                    : isSelected
                    ? 'bg-[#181a28] border-amber shadow-[0_0_30px_rgba(245,158,11,0.4)]'
                    : 'bg-[#121420]/40 border-white/5 opacity-30 grayscale'
                }`}
              >
                {selectedEventCard === null ? (
                  <div className="my-auto flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-amber/10 border border-amber/30 flex items-center justify-center text-3xl">
                      ❓
                    </div>
                    <span className="font-extrabold text-amber text-sm uppercase tracking-wider">Carte {idx + 1}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-between h-full w-full">
                    <div className="text-4xl my-2">{card.icon}</div>
                    <div>
                      <h3 className="font-bold text-amber text-lg">{card.title}</h3>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{card.description}</p>
                    </div>
                    <span className="text-[10px] font-black text-amber/80 uppercase">Effet Activé</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Interface de Sélection Manuelle si la carte exige un choix */}
        {selectedEventCard && selectedEventCard.type !== 'reinforcement' && (
          <div className="bg-[#121420] border border-amber/30 rounded-2xl p-4 max-w-3xl mx-auto w-full my-2 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-amber text-center">Sélectionnez les cartes concernées :</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Carte du joueur Underdog */}
              {needsMyCard && (
                <div className="border border-white/10 rounded-xl p-3 bg-surface">
                  <span className="text-xs font-bold text-white block mb-2">Ta carte ({underdogName}) :</span>
                  <div className="flex flex-wrap gap-2">
                    {uTeam.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => setMyCardToSwap(it)}
                        className={`p-1 rounded-lg border text-center text-xs flex flex-col items-center w-16 ${
                          myCardToSwap?.id === it.id ? 'border-amber bg-amber/20' : 'border-border bg-surface2'
                        }`}
                      >
                        {it.image_url && <img src={it.image_url} className="w-10 h-10 object-cover rounded" alt="" />}
                        <span className="truncate w-full text-[9px] font-bold text-white mt-1">{it.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Carte de l'adversaire */}
              {needsOppCard && (
                <div className="border border-white/10 rounded-xl p-3 bg-surface">
                  <span className="text-xs font-bold text-white block mb-2">Carte de {oppName} :</span>
                  <div className="flex flex-wrap gap-2">
                    {oppTeam.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => setOppCardToSwap(it)}
                        className={`p-1 rounded-lg border text-center text-xs flex flex-col items-center w-16 ${
                          oppCardToSwap?.id === it.id ? 'border-amber bg-amber/20' : 'border-border bg-surface2'
                        }`}
                      >
                        {it.image_url && <img src={it.image_url} className="w-10 h-10 object-cover rounded" alt="" />}
                        <span className="truncate w-full text-[9px] font-bold text-white mt-1">{it.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              className="btn py-2 px-6 text-xs mx-auto disabled:opacity-50"
              disabled={Boolean((needsMyCard && !myCardToSwap) || (needsOppCard && !oppCardToSwap))}
              onClick={executeManualSwap}
            >
              Confirmé le choix de carte
            </button>
          </div>
        )}

        {/* Message de confirmation */}
        {selectedEventCard && (
          <div className="text-center my-2 bg-amber/10 border border-amber/30 rounded-xl p-3 max-w-lg mx-auto">
            <span className="text-xs font-bold text-amber block">✨ Statut :</span>
            <span className="text-xs text-white font-semibold">{eventAppliedMessage}</span>
          </div>
        )}

        <div className="flex justify-center mt-2">
          {selectedEventCard ? (
            <button className="btn py-2.5 px-8 text-xs" onClick={() => setPhase('end')}>
              Voir le récapitulatif final ▶
            </button>
          ) : (
            <span className="text-xs text-slate-400 italic">Cliquez sur une carte pour la révéler</span>
          )}
        </div>
      </div>
    );
  }

  // ================= 4. END =================
  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] justify-between rounded-2xl p-4 overflow-hidden">
      <div className="text-center">
        <div className="text-[10px] font-bold text-amber uppercase tracking-wider">PARTIE TERMINÉE</div>
        <h1 className="font-serif text-2xl font-black text-amber">Line Capture</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 my-auto w-full max-w-4xl mx-auto">
        <div className="bg-[#121420] border-2 border-[#e2645a] rounded-xl p-3 flex flex-col gap-2">
          <div className="text-center border-b border-white/10 pb-1">
            <h2 className="text-lg font-bold text-[#e2645a]">{names[0]}</h2>
            <span className="text-xs text-slate-300 font-semibold">{finalTeam1.length} cartes obtenues</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {finalTeam1.map((it) => (
              <div key={it.id} className="bg-[#181a28] border border-white/10 rounded-lg p-1.5 w-24 text-center">
                {it.image_url && <img src={it.image_url} className="w-full h-14 object-cover rounded-md" alt="" />}
                <div className="text-[10px] font-bold text-white truncate mt-1">{it.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#121420] border-2 border-[#4fc9c0] rounded-xl p-3 flex flex-col gap-2">
          <div className="text-center border-b border-white/10 pb-1">
            <h2 className="text-lg font-bold text-[#4fc9c0]">{names[1]}</h2>
            <span className="text-xs text-slate-300 font-semibold">{finalTeam2.length} cartes obtenues</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {finalTeam2.map((it) => (
              <div key={it.id} className="bg-[#181a28] border border-white/10 rounded-lg p-1.5 w-24 text-center">
                {it.image_url && <img src={it.image_url} className="w-full h-14 object-cover rounded-md" alt="" />}
                <div className="text-[10px] font-bold text-white truncate mt-1">{it.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-2">
        <button className="btn py-2 px-6 text-xs" onClick={() => setPhase('setup')}>
          ↺ Nouvelle partie
        </button>
      </div>
    </div>
  );
}
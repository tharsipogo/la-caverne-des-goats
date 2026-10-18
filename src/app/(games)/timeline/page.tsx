'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CardTemplateConfig, DEFAULT_CARD_TEMPLATE_CONFIG, GameList, ListItem } from '@/lib/types';
import { fetchListItemMeta, shuffle } from '@/lib/utils';
import {
  TimelineCard,
  cardFromItem,
  fetchDatedCounts,
  formatTimelineDate,
  isPlacementCorrect,
} from '@/lib/timeline';
import { TIMELINE_EVENTS, allEventCards } from '@/lib/timelineEvents';
import { fetchCardTemplateOrDefault } from '@/lib/supabase/cardTemplates';
import { DisplayMode, mergeCardConfig } from '@/lib/supabase/cardDeck';
import { DisplayModeToggle } from '@/components/game/DisplayModeToggle';
import { ScaledGameCard } from '@/components/game/ScaledGameCard';
import { GameConfigShell } from '@/components/game/GameConfigShell';
import { PlayerNameField } from '@/components/game/PlayerNameField';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { getPlayerColor } from '@/lib/playerColors';

type Phase = 'setup' | 'play' | 'end';
type Stage = 'place' | 'reveal';
type GameMode = 'pile' | 'hand';

const MIN_CARDS = 8;
const TARGETS = [5, 7, 10];
const HAND_SIZES = [3, 5, 7];

export default function TimelinePage() {
  const router = useRouter();

  // ---------- Configuration ----------
  const [lists, setLists] = useState<GameList[]>([]);
  const [totals, setTotals] = useState<Map<string, number>>(new Map());
  const [datedCounts, setDatedCounts] = useState<Map<string, number>>(new Map());
  const [datesColumnMissing, setDatesColumnMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [useEvents, setUseEvents] = useState(true);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('image');
  const [deckAvailable, setDeckAvailable] = useState(false);

  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(Array.from({ length: 6 }, (_, i) => `Joueur ${i + 1}`));
  const [targetScore, setTargetScore] = useState(7);
  const [gameMode, setGameMode] = useState<GameMode>('pile');
  const [handSize, setHandSize] = useState(5);
  const [starting, setStarting] = useState(false);

  // ---------- Partie ----------
  const [phase, setPhase] = useState<Phase>('setup');
  const [templates, setTemplates] = useState<Record<string, CardTemplateConfig>>({});
  const [playMode, setPlayMode] = useState<DisplayMode>('image');
  const [line, setLine] = useState<TimelineCard[]>([]);
  const [pool, setPool] = useState<TimelineCard[]>([]);
  const [drawn, setDrawn] = useState<TimelineCard | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [stage, setStage] = useState<Stage>('place');
  const [result, setResult] = useState<{ correct: boolean; slot: number; drewCard?: boolean } | null>(null);
  const [hands, setHands] = useState<TimelineCard[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playGameMode, setPlayGameMode] = useState<GameMode>('pile');

  useEffect(() => {
    (async () => {
      const [{ data }, meta, dated] = await Promise.all([
        supabase.from('lists').select('*').order('name'),
        fetchListItemMeta(),
        fetchDatedCounts(),
      ]);
      setLists((data as GameList[]) || []);
      setTotals(meta.counts);
      setDatedCounts(dated.counts);
      setDatesColumnMissing(dated.error);
      setLoading(false);
    })();
  }, []);

  // Le choix Images/Cartes n'apparaît que si au moins une carte validée ET datée existe dans les bases choisies.
  useEffect(() => {
    if (selectedListIds.length === 0) {
      setDeckAvailable(false);
      setDisplayMode('image');
      return;
    }
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('items')
        .select('id', { count: 'exact', head: true })
        .in('list_id', selectedListIds)
        .not('timeline_year', 'is', null)
        .eq('card_validated', true);
      if (cancelled) return;
      const ok = (count || 0) > 0;
      setDeckAvailable(ok);
      if (!ok) setDisplayMode('image');
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedListIds]);

  function toggleList(id: string) {
    setSelectedListIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function setCount(n: number) {
    setPlayerCount(Math.max(2, Math.min(6, n)));
  }

  const availableCards =
    (useEvents ? TIMELINE_EVENTS.length : 0) +
    selectedListIds.reduce((sum, id) => sum + (datedCounts.get(id) || 0), 0);

  const minCards = gameMode === 'hand' ? 1 + playerCount * handSize + 5 : MIN_CARDS;

  async function startGame() {
    if (availableCards < minCards) {
      alert(`Il faut au moins ${minCards} cartes datées pour jouer (événements intégrés et/ou bases datées).`);
      return;
    }
    setStarting(true);

    let cards: TimelineCard[] = [];
    const tpl: Record<string, CardTemplateConfig> = {};

    if (selectedListIds.length > 0) {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .in('list_id', selectedListIds)
        .not('timeline_year', 'is', null);
      if (error) {
        console.error('Erreur chargement items Timeline :', error);
        alert(`Impossible de charger les items datés : ${error.message}`);
        setStarting(false);
        return;
      }
      let items = (data as ListItem[]) || [];
      if (displayMode === 'card') items = items.filter((i) => i.card_validated);
      cards = items.map(cardFromItem).filter((c): c is TimelineCard => c !== null);

      if (displayMode === 'card') {
        const results = await Promise.all(selectedListIds.map((id) => fetchCardTemplateOrDefault(id)));
        selectedListIds.forEach((id, i) => {
          tpl[id] = results[i];
        });
      }
    }
    if (useEvents) cards = [...cards, ...allEventCards()];

    if (cards.length < minCards) {
      alert(
        displayMode === 'card'
          ? `Seulement ${cards.length} carte(s) utilisable(s) en mode Cartes (il faut des cartes validées ET datées). Il en faut au moins ${minCards}.`
          : `Seulement ${cards.length} carte(s) datée(s). Il en faut au moins ${minCards}.`
      );
      setStarting(false);
      return;
    }

    const shuffled = shuffle(cards);
    const finalNames = playerNames.slice(0, playerCount).map((n, i) => n.trim() || `Joueur ${i + 1}`);

    setTemplates(tpl);
    setPlayMode(displayMode);
    setPlayGameMode(gameMode);
    setLine([shuffled[0]]);
    if (gameMode === 'hand') {
      const dealt: TimelineCard[][] = finalNames.map((_, i) => shuffled.slice(1 + i * handSize, 1 + (i + 1) * handSize));
      setHands(dealt);
      setSelectedId(dealt[0][0]?.id ?? null);
      setDrawn(null);
      setPool(shuffled.slice(1 + finalNames.length * handSize));
    } else {
      setHands([]);
      setSelectedId(null);
      setDrawn(shuffled[1]);
      setPool(shuffled.slice(2));
    }
    setNames(finalNames);
    setScores(finalNames.map(() => 0));
    setCurrent(0);
    setStage('place');
    setResult(null);
    setPhase('play');
    setStarting(false);
  }

  function placeCard(slot: number) {
    if (stage !== 'place') return;

    if (playGameMode === 'hand') {
      const hand = hands[current];
      const card = hand.find((c) => c.id === selectedId);
      if (!card) return;
      const correct = isPlacementCorrect(line, slot, card);
      let newHand = hand.filter((c) => c.id !== card.id);
      let drewCard = false;
      if (correct) {
        setLine([...line.slice(0, slot), card, ...line.slice(slot)]);
      } else if (pool.length > 0) {
        // Erreur : la carte est défaussée et on en pioche une nouvelle.
        newHand = [...newHand, pool[0]];
        setPool(pool.slice(1));
        drewCard = true;
      } else {
        // Pioche vide : la carte retourne dans la main.
        newHand = hand;
      }
      setHands((prev) => prev.map((h, i) => (i === current ? newHand : h)));
      setDrawn(card);
      setResult({ correct, slot, drewCard });
      setStage('reveal');
      return;
    }

    if (!drawn) return;
    const correct = isPlacementCorrect(line, slot, drawn);
    if (correct) {
      setLine([...line.slice(0, slot), drawn, ...line.slice(slot)]);
      setScores((prev) => prev.map((s, i) => (i === current ? s + 1 : s)));
    }
    setResult({ correct, slot });
    setStage('reveal');
  }

  function nextTurn() {
    if (playGameMode === 'hand') {
      if (hands[current].length === 0) {
        setPhase('end');
        return;
      }
      const next = (current + 1) % names.length;
      setCurrent(next);
      setSelectedId(hands[next][0]?.id ?? null);
      setDrawn(null);
      setStage('place');
      setResult(null);
      return;
    }
    if (scores[current] >= targetScore || pool.length === 0) {
      setPhase('end');
      return;
    }
    const [next, ...rest] = pool;
    setDrawn(next);
    setPool(rest);
    setCurrent((c) => (c + 1) % names.length);
    setStage('place');
    setResult(null);
  }

  function resetToSetup() {
    setPhase('setup');
    setLine([]);
    setPool([]);
    setDrawn(null);
    setHands([]);
    setResult(null);
  }

  function templateFor(card: TimelineCard): CardTemplateConfig {
    if (!card.item) return DEFAULT_CARD_TEMPLATE_CONFIG;
    const base = (card.listId && templates[card.listId]) || DEFAULT_CARD_TEMPLATE_CONFIG;
    return mergeCardConfig(card.item, base);
  }

  if (loading) return <SkeletonCard />;

  // ================= SETUP =================
  if (phase === 'setup') {
    const selectableLists = lists.filter((l) => (totals.get(l.id) || 0) > 0);
    return (
      <GameConfigShell
        title="Timeline"
        subtitle="Une frise commune : à tour de rôle, place une carte au bon endroit dans l'ordre chronologique. Deux modes : pioche partagée (points) ou main de cartes à vider."
        onBack={() => router.push('/')}
      >
        <div className="flex flex-col gap-3">
          <label className="text-[12.5px] text-muted block">Sources de cartes</label>

          <label className="flex items-center gap-3 bg-surface2 border border-border rounded-lg px-3.5 py-3 cursor-pointer">
            <input type="checkbox" checked={useEvents} onChange={(e) => setUseEvents(e.target.checked)} />
            <span className="flex-1">
              <span className="text-[13.5px] font-semibold block">📜 Événements intégrés</span>
              <span className="text-[12px] text-muted">
                {TIMELINE_EVENTS.length} événements (histoire, sciences, culture, sport, jeux vidéo) déjà datés
              </span>
            </span>
          </label>

          {selectableLists.length === 0 ? (
            <p className="text-[12.5px] text-muted">Aucune base pour l'instant — crée-en une depuis « Mes bases ».</p>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-[12px] text-muted">Mes bases (plusieurs possibles) :</span>
              {selectableLists.map((l) => {
                const dated = datedCounts.get(l.id) || 0;
                const total = totals.get(l.id) || 0;
                const disabled = dated === 0;
                return (
                  <label
                    key={l.id}
                    className={`flex items-center gap-3 border rounded-lg px-3.5 py-2.5 ${
                      disabled ? 'opacity-50 border-border' : 'cursor-pointer bg-surface2 border-border'
                    } ${selectedListIds.includes(l.id) ? 'border-amber' : ''}`}
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={selectedListIds.includes(l.id)}
                      onChange={() => toggleList(l.id)}
                    />
                    <span className="flex-1 text-[13.5px] font-medium">{l.name}</span>
                    <span className={`text-[12px] ${disabled ? 'text-muted' : 'text-teal'}`}>
                      {dated}/{total} daté{dated > 1 ? 's' : ''}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {datesColumnMissing && (
            <p className="text-[12.5px] text-red-400">
              Les colonnes de date n'existent pas encore en base : exécute{' '}
              <code>supabase/migration_timeline_dates.sql</code> dans l'éditeur SQL de Supabase.
            </p>
          )}

          <button
            type="button"
            className="btn-secondary w-fit text-[12.5px] px-3 py-1.5"
            onClick={() => router.push(selectedListIds[0] ? `/timeline/dates?list=${selectedListIds[0]}` : '/timeline/dates')}
          >
            📅 Dater les éléments de mes bases
          </button>
        </div>

        {deckAvailable && (
          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Affichage des cartes des bases</label>
            <DisplayModeToggle mode={displayMode} onChange={setDisplayMode} available={deckAvailable} />
          </div>
        )}

        <div>
          <label className="text-[12.5px] text-muted block mb-1.5">Mode de jeu</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {([
              ['pile', '🎴 Pioche partagée', 'Une carte piochée par tour. Bien placée = +1 point, sinon défaussée. Premier à N points.'],
              ['hand', '🖐️ Main de cartes', 'Chacun a une main : choisis la carte à placer. Raté = elle est défaussée et tu en pioches une. Premier à vider sa main.'],
            ] as [GameMode, string, string][]).map(([m, label, desc]) => (
              <button
                key={m}
                type="button"
                onClick={() => setGameMode(m)}
                className={`text-left rounded-lg border px-3.5 py-2.5 ${
                  gameMode === m ? 'border-amber bg-amber/10' : 'border-border bg-surface2'
                }`}
              >
                <span className={`text-[13.5px] font-semibold block ${gameMode === m ? 'text-amber' : 'text-text'}`}>{label}</span>
                <span className="text-[12px] text-muted">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[12.5px] text-muted block mb-1.5">Joueurs</label>
          <div className="flex items-center gap-3 mb-3">
            <button className="btn-secondary px-3 py-1.5" onClick={() => setCount(playerCount - 1)}>−</button>
            <span className="font-serif text-2xl w-8 text-center">{playerCount}</span>
            <button className="btn-secondary px-3 py-1.5" onClick={() => setCount(playerCount + 1)}>+</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Array.from({ length: playerCount }).map((_, i) => (
              <PlayerNameField
                key={i}
                index={i}
                value={playerNames[i]}
                onChange={(v) => setPlayerNames((prev) => prev.map((n, idx) => (idx === i ? v : n)))}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-[12.5px] text-muted block mb-1.5">
            {gameMode === 'hand' ? 'Cartes en main au départ' : 'Points pour gagner'}
          </label>
          <div className="flex gap-2">
            {(gameMode === 'hand' ? HAND_SIZES : TARGETS).map((t) => {
              const value = gameMode === 'hand' ? handSize : targetScore;
              return (
                <button
                  key={t}
                  onClick={() => (gameMode === 'hand' ? setHandSize(t) : setTargetScore(t))}
                  className={`px-3.5 py-2.5 rounded-lg text-sm border ${
                    value === t ? 'border-amber text-amber' : 'border-border text-text bg-surface2'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button className="btn w-fit" onClick={startGame} disabled={starting || availableCards < minCards}>
            {starting ? 'Préparation…' : '▶ Démarrer'}
          </button>
          <span className="text-[12px] text-muted">
            {availableCards} carte{availableCards > 1 ? 's' : ''} datée{availableCards > 1 ? 's' : ''} disponible
            {availableCards > 1 ? 's' : ''}
            {availableCards < minCards && ` (minimum ${minCards})`}
          </span>
        </div>
      </GameConfigShell>
    );
  }

  // ================= FIN =================
  if (phase === 'end') {
    const isHand = playGameMode === 'hand';
    const values = isHand ? hands.map((h) => h.length) : scores;
    const best = isHand ? Math.min(...values) : Math.max(...values);
    const winners = names.filter((_, i) => values[i] === best);
    return (
      <div className="flex flex-col items-center gap-6 py-6 max-w-5xl mx-auto w-full">
        <div className="eyebrow">Partie terminée</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
          {winners.length === 1 ? `🏆 Victoire de ${winners[0]} !` : `🤝 Égalité : ${winners.join(' & ')}`}
        </h1>

        <div className="flex flex-wrap justify-center gap-3">
          {names.map((n, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-2.5 border-2 text-center min-w-[110px]"
              style={{ borderColor: getPlayerColor(i).hex }}
            >
              <div className="text-xs font-bold" style={{ color: getPlayerColor(i).hex }}>{n}</div>
              <div className="font-serif text-2xl text-white">{values[i]}</div>
              {isHand && <div className="text-[10px] text-muted">carte{values[i] > 1 ? 's' : ''} restante{values[i] > 1 ? 's' : ''}</div>}
            </div>
          ))}
        </div>

        <div className="w-full">
          <div className="text-[12.5px] text-muted mb-2 text-center">La frise finale</div>
          <div className="overflow-x-auto pb-3">
            <div className="flex items-start gap-3 w-max mx-auto px-2">
              {line.map((c) => (
                <LineCard key={c.id} card={c} mode={playMode} template={templateFor(c)} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn" onClick={resetToSetup}>↺ Nouvelle partie</button>
        </div>
      </div>
    );
  }

  // ================= JEU =================
  const activeColor = getPlayerColor(current).hex;
  const reachedTarget = scores[current] >= targetScore;

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto w-full py-2">
      {/* Scores */}
      <div className="flex flex-wrap items-center gap-2">
        {names.map((n, i) => (
          <div
            key={i}
            className={`rounded-xl px-3 py-1.5 border-2 text-center transition-all ${
              i === current ? 'bg-white/10' : 'opacity-60'
            }`}
            style={{ borderColor: getPlayerColor(i).hex }}
          >
            <span className="text-xs font-bold mr-2" style={{ color: getPlayerColor(i).hex }}>{n}</span>
            {playGameMode === 'hand' ? (
              <>
                <span className="font-serif text-lg text-white">{hands[i]?.length ?? 0}</span>
                <span className="text-[10px] text-muted"> 🂠</span>
              </>
            ) : (
              <>
                <span className="font-serif text-lg text-white">{scores[i]}</span>
                <span className="text-[10px] text-muted">/{targetScore}</span>
              </>
            )}
          </div>
        ))}
        <span className="ml-auto text-[11px] text-muted">{pool.length} carte{pool.length > 1 ? 's' : ''} dans la pioche</span>
      </div>

      {/* Main du joueur (mode main) */}
      {playGameMode === 'hand' && stage === 'place' && (
        <div
          className="bg-[#121420]/90 rounded-2xl p-4 flex flex-col gap-3 border-2"
          style={{ borderColor: activeColor, boxShadow: `0 0 25px ${activeColor}40` }}
        >
          <div className="text-center sm:text-left">
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: activeColor }}>
              Au tour de {names[current]}
            </div>
            <div className="text-[13px] text-muted">
              Choisis une carte de ta main, puis clique sur un emplacement <b className="text-amber">＋</b> de la frise. Les dates sont cachées.
            </div>
          </div>
          <div className="flex flex-wrap justify-center sm:justify-start gap-3">
            {(hands[current] || []).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                aria-label={`Choisir ${c.name}`}
                className={`w-[132px] rounded-xl p-1 transition-all ${
                  selectedId === c.id ? 'ring-2 -translate-y-1' : 'opacity-70 hover:opacity-100'
                }`}
                style={selectedId === c.id ? { boxShadow: `0 0 0 2px ${activeColor}`, backgroundColor: `${activeColor}18` } : undefined}
              >
                <CardFace card={c} mode={playMode} template={templateFor(c)} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Carte piochée / carte jouée */}
      {drawn && !(playGameMode === 'hand' && stage === 'place') && (
        <div
          className="bg-[#121420]/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5 border-2"
          style={{ borderColor: activeColor, boxShadow: `0 0 25px ${activeColor}40` }}
        >
          <DrawnFace card={drawn} mode={playMode} template={templateFor(drawn)} />

          <div className="flex-1 flex flex-col gap-2 text-center sm:text-left">
            {stage === 'place' ? (
              <>
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: activeColor }}>
                  Au tour de {names[current]}
                </div>
                <div className="text-lg font-serif text-white">Où va cette carte dans la frise ?</div>
                <div className="text-[13px] text-muted">
                  Clique sur un emplacement <b className="text-amber">＋</b> de la frise ci-dessous. La date est cachée
                  jusqu'à ton choix.
                </div>
              </>
            ) : (
              <>
                <div className={`text-xl font-bold ${result?.correct ? 'text-teal' : 'text-red-400'}`}>
                  {playGameMode === 'hand'
                    ? result?.correct
                      ? `✅ Bien placée ! Il te reste ${hands[current]?.length ?? 0} carte${(hands[current]?.length ?? 0) > 1 ? 's' : ''}`
                      : result?.drewCard
                      ? '❌ Raté — la carte est défaussée, tu en piches une nouvelle'
                      : '❌ Raté — la pioche est vide, tu gardes ta carte'
                    : result?.correct
                    ? '✅ Bien placée ! +1 point'
                    : '❌ Raté — la carte est défaussée'}
                </div>
                <div className="text-lg font-serif text-white">
                  {drawn.name} <span className="text-amber">— {formatTimelineDate(drawn.date)}</span>
                </div>
                <div>
                  <button className="btn mt-1" onClick={nextTurn}>
                    {(playGameMode === 'hand' ? hands[current]?.length === 0 : reachedTarget || pool.length === 0)
                      ? 'Voir le résultat →'
                      : 'Joueur suivant →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Frise */}
      <div>
        <div className="text-[12.5px] text-muted mb-2">Frise chronologique (du plus ancien au plus récent) →</div>
        <div className="overflow-x-auto pb-3 -mx-1 px-1">
          <div className="flex items-stretch w-max min-w-full">
            {Array.from({ length: line.length + 1 }).map((_, slot) => (
              <div key={slot} className="flex items-stretch">
                <SlotButton
                  active={stage === 'place'}
                  color={activeColor}
                  onClick={() => placeCard(slot)}
                />
                {slot < line.length && (
                  <LineCard
                    card={line[slot]}
                    mode={playMode}
                    template={templateFor(line[slot])}
                    highlight={stage === 'reveal' && result?.correct === true && drawn?.id === line[slot].id}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Zone cliquable entre deux cartes de la frise. */
function SlotButton({ active, color, onClick }: { active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!active}
      aria-label="Placer la carte ici"
      className={`mx-1 w-10 shrink-0 rounded-xl flex items-center justify-center text-xl font-black transition-all ${
        active ? 'border-2 border-dashed hover:scale-105 cursor-pointer' : 'border border-transparent'
      }`}
      style={active ? { borderColor: `${color}99`, color, backgroundColor: `${color}12` } : undefined}
    >
      {active ? '＋' : <span className="w-px h-full bg-white/10 block" />}
    </button>
  );
}

/** Carte de la frise : visuel, nom (hors mode carte) et date révélée. */
function LineCard({
  card,
  mode,
  template,
  highlight = false,
}: {
  card: TimelineCard;
  mode: DisplayMode;
  template: CardTemplateConfig;
  highlight?: boolean;
}) {
  return (
    <div className={`w-[132px] shrink-0 flex flex-col gap-1.5 rounded-xl p-1 ${highlight ? 'ring-2 ring-teal' : ''}`}>
      <CardFace card={card} mode={mode} template={template} />
      <div className="text-center text-[12px] font-black text-amber leading-tight">{formatTimelineDate(card.date)}</div>
    </div>
  );
}

/** Grande carte piochée (date cachée tant qu'elle n'est pas posée). */
function DrawnFace({ card, mode, template }: { card: TimelineCard; mode: DisplayMode; template: CardTemplateConfig }) {
  return (
    <div className="w-[190px] shrink-0">
      <CardFace card={card} mode={mode} template={template} />
    </div>
  );
}

/** Visuel d'une carte : GameCard (mode Cartes), image, ou emoji de catégorie pour les événements. */
function CardFace({ card, mode, template }: { card: TimelineCard; mode: DisplayMode; template: CardTemplateConfig }) {
  if (mode === 'card' && card.item) {
    return <ScaledGameCard item={card.item} template={template} disableTilt />;
  }
  return (
    <div className="rounded-xl overflow-hidden border border-white/15 bg-[#141622]">
      <div className="relative w-full aspect-[4/3] bg-surface2">
        {card.image_url ? (
          <Image src={card.image_url} fill className="object-cover" alt="" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-80">
            {card.emoji ?? '🎴'}
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 text-center text-[12px] font-bold text-white leading-tight min-h-[40px] flex items-center justify-center">
        {card.name}
      </div>
    </div>
  );
}

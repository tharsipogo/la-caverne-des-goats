'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { fetchListItemMeta, pickRandom, shuffle } from '@/lib/utils';
import { calculateTeamScore, FACTIONS } from '@/lib/synergies';
import InstantWinModal from '@/components/InstantWinModal';

type Phase = 'setup' | 'round' | 'end';
type RoundStage = 'open' | 'respond';
type PIdx = 0 | 1;
type CoachMode = 'random' | 'choice';

const TEAM_SIZE = 5;
const ACCENTS: [string, string] = ['#e2645a', '#4fc9c0'];

export default function VersusPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [loading, setLoading] = useState(true);

  // Coachs & Terrains
  const [coachLists, setCoachLists] = useState<GameList[]>([]);
  const [coachListId, setCoachListId] = useState('');
  const [coachItems, setCoachItems] = useState<ListItem[]>([]);
  const [coachMode, setCoachMode] = useState<[CoachMode, CoachMode]>(['random', 'random']);
  const [coachChoiceId, setCoachChoiceId] = useState<[string, string]>(['', '']);
  const [coaches, setCoaches] = useState<[ListItem | null, ListItem | null]>([null, null]);

  const [terrainLists, setTerrainLists] = useState<GameList[]>([]);
  const [terrainListId, setTerrainListId] = useState('');
  const [terrainItems, setTerrainItems] = useState<ListItem[]>([]);
  const [terrain, setTerrain] = useState<ListItem | null>(null);

  // État du jeu
  const [names, setNames] = useState<[string, string]>(['Joueur 1', 'Joueur 2']);
  const [startBudget, setStartBudget] = useState(100);
  const [phase, setPhase] = useState<Phase>('setup');
  const [pool, setPool] = useState<ListItem[]>([]);
  const [currentCard, setCurrentCard] = useState<ListItem | null>(null);
  const [budgets, setBudgets] = useState<[number, number]>([0, 0]);
  const [teams, setTeams] = useState<[ListItem[], ListItem[]]>([[], []]);
  const [starterIndex, setStarterIndex] = useState<PIdx>(0);
  const [roundStage, setRoundStage] = useState<RoundStage>('open');
  const [highestBid, setHighestBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState<PIdx>(0);
  const [bidInput, setBidInput] = useState('');
  const [instantWinner, setInstantWinner] = useState<PIdx | null>(null);

  // Effet d'animation de surenchère
  const [bidPulse, setBidPulse] = useState(false);

  const currentListName = lists.find((l) => l.id === listId)?.name || '';
  const isOnePieceBase = currentListName.toLowerCase().includes('one piece');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      const { counts } = await fetchListItemMeta();
      const all = (data as GameList[]) || [];

      setLists(all.filter((l) => (counts.get(l.id) || 0) >= TEAM_SIZE * 2));
      const available = all.filter((l) => (counts.get(l.id) || 0) >= 1);
      setCoachLists(available);
      setTerrainLists(available);

      if (all.length > 0) setListId(all[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!coachListId) return setCoachItems([]);
    supabase.from('items').select('*').eq('list_id', coachListId).then(({ data }) => data && setCoachItems(data));
  }, [coachListId]);

  useEffect(() => {
    if (!terrainListId) return setTerrainItems([]);
    supabase.from('items').select('*').eq('list_id', terrainListId).then(({ data }) => data && setTerrainItems(data));
  }, [terrainListId]);

  const rerollCoaches = () => {
    if (coachItems.length === 0) return setCoaches([null, null]);
    const resolved: [ListItem | null, ListItem | null] = [null, null];

    if (coachMode[0] === 'random' && coachMode[1] === 'random') {
      const two = pickRandom(coachItems, Math.min(2, coachItems.length));
      resolved[0] = two[0] || null;
      resolved[1] = two[1] || two[0] || null;
    } else {
      resolved[0] = coachMode[0] === 'choice' && coachChoiceId[0]
        ? coachItems.find((c) => c.id === coachChoiceId[0]) || null
        : pickRandom(coachItems, 1)[0] || null;

      const remaining = coachItems.filter((c) => c.id !== resolved[0]?.id);
      resolved[1] = coachMode[1] === 'choice' && coachChoiceId[1]
        ? coachItems.find((c) => c.id === coachChoiceId[1]) || null
        : pickRandom(remaining.length ? remaining : coachItems, 1)[0] || null;
    }
    setCoaches(resolved);
  };

  const rerollTerrain = () => {
    setTerrain(terrainItems.length ? pickRandom(terrainItems, 1)[0] : null);
  };

  useEffect(rerollCoaches, [coachItems, coachMode, coachChoiceId]);
  useEffect(rerollTerrain, [terrainItems]);

  function triggerBidPulse() {
    setBidPulse(true);
    setTimeout(() => setBidPulse(false), 400);
  }

  function playRound(
    starter: PIdx,
    nextBudgets: [number, number],
    nextTeams: [ListItem[], ListItem[]],
    nextPool: ListItem[]
  ) {
    if (nextTeams[0].length >= TEAM_SIZE && nextTeams[1].length >= TEAM_SIZE) {
      return finishGame(nextBudgets, nextTeams, nextPool);
    }
    if (nextPool.length === 0) {
      return finishGame(nextBudgets, nextTeams, nextPool);
    }

    const [card, ...restPool] = nextPool;
    const full0 = nextTeams[0].length >= TEAM_SIZE;
    const full1 = nextTeams[1].length >= TEAM_SIZE;

    if (full0 || full1) {
      const winner: PIdx = full0 ? 1 : 0;
      const teamsAfter: [ListItem[], ListItem[]] = [nextTeams[0].slice(), nextTeams[1].slice()];
      teamsAfter[winner].push(card);

      const res = calculateTeamScore(teamsAfter[winner].map((i) => i.name), nextBudgets[winner], nextBudgets[winner === 0 ? 1 : 0], isOnePieceBase);
      if (res.instantWin) {
        setInstantWinner(winner);
        return finishGame(nextBudgets, teamsAfter, restPool);
      }

      return playRound(starter === 0 ? 1 : 0, nextBudgets, teamsAfter, restPool);
    }

    setBudgets(nextBudgets);
    setTeams(nextTeams);
    setPool(restPool);
    setCurrentCard(card);
    setStarterIndex(starter);
    setHighestBid(0);
    setHighestBidder(starter);
    setRoundStage('open');
    setBidInput('');
    setPhase('round');
  }

  function finishGame(b: [number, number], t: [ListItem[], ListItem[]], p: ListItem[]) {
    setBudgets(b);
    setTeams(t);
    setPool(p);
    setPhase('end');
  }

  async function start() {
    if (!listId) return;
    const { data: items } = await supabase.from('items').select('*').eq('list_id', listId);
    if (!items || items.length < TEAM_SIZE * 2) {
      return alert(`Il faut au moins ${TEAM_SIZE * 2} items dans cette base.`);
    }

    setNames([names[0].trim() || 'Joueur 1', names[1].trim() || 'Joueur 2']);
    setInstantWinner(null);
    playRound(0, [startBudget, startBudget], [[], []], shuffle(items as ListItem[]));
  }

  function handleBid(amount: number, bidder: PIdx) {
    triggerBidPulse();
    setHighestBid(amount);
    setHighestBidder(bidder);
    setBidInput('');
    if (roundStage === 'open') setRoundStage('respond');
  }

  function awardCard(winner: PIdx, cost: number) {
    if (!currentCard) return;

    const newTeams: [ListItem[], ListItem[]] = [teams[0].slice(), teams[1].slice()];
    newTeams[winner].push(currentCard);

    const newBudgets: [number, number] = [...budgets];
    newBudgets[winner] = Math.max(0, newBudgets[winner] - cost);

    const resWinner = calculateTeamScore(newTeams[winner].map((i) => i.name), newBudgets[winner], newBudgets[winner === 0 ? 1 : 0], isOnePieceBase);
    if (resWinner.instantWin) {
      setInstantWinner(winner);
      setTeams(newTeams);
      setBudgets(newBudgets);
      setPhase('end');
      return;
    }

    playRound(starterIndex === 0 ? 1 : 0, newBudgets, newTeams, pool);
  }

  const reset = () => {
    setPhase('setup');
    setPool([]);
    setCurrentCard(null);
    setTeams([[], []]);
    setBudgets([0, 0]);
    setInstantWinner(null);
  };

  if (loading) return <p className="text-muted">Chargement...</p>;

  const backgroundStyle: React.CSSProperties = terrain?.image_url
    ? {
        backgroundImage: `linear-gradient(rgba(10,10,14,0.60), rgba(10,10,14,0.60)), url(${terrain.image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  // SETUP
  if (phase === 'setup') {
    return (
      <div>
        <div className="mb-7">
          <div className="eyebrow">Mode</div>
          <h1 className="font-serif text-3xl">Versus</h1>
          <p className="text-muted mt-2 text-[14.5px] max-w-xl">
            Enchères carte par carte, gestion de budget et constitution de ton équipe de {TEAM_SIZE} cartes !
          </p>
        </div>

        {lists.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">
            Crée d'abord une base d'au moins {TEAM_SIZE * 2} items.
          </p>
        ) : (
          <div className="panel flex flex-col gap-6">
            <div>
              <label className="text-[12.5px] text-muted block mb-1.5">Base de jeu</label>
              <select className="input" value={listId} onChange={(e) => setListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-6 flex-wrap">
              {[0, 1].map((i) => (
                <div key={i}>
                  <label className="text-[12.5px] text-muted block mb-1.5">Nom du joueur {i + 1}</label>
                  <input
                    className="input"
                    value={names[i]}
                    onChange={(e) => setNames(i === 0 ? [e.target.value, names[1]] : [names[0], e.target.value])}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-[12.5px] text-muted block mb-1.5">Budget de départ</label>
              <div className="flex gap-2 items-center flex-wrap">
                {[50, 100, 200, 500].map((v) => (
                  <button
                    key={v}
                    onClick={() => setStartBudget(v)}
                    className={`px-3.5 py-2.5 rounded-lg text-sm border ${
                      startBudget === v ? 'border-amber text-amber' : 'border-border text-text bg-surface2'
                    }`}
                  >
                    {v}
                  </button>
                ))}
                <input
                  type="number"
                  className="input w-28"
                  value={startBudget}
                  min={1}
                  onChange={(e) => setStartBudget(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>

            <div className="border-t border-border pt-5 space-y-4">
              <div>
                <label className="text-[12.5px] text-muted block mb-1.5">Base de coachs (optionnel)</label>
                <select className="input" value={coachListId} onChange={(e) => setCoachListId(e.target.value)}>
                  <option value="">— Aucun coach —</option>
                  {coachLists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {coachListId && coachItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {([0, 1] as PIdx[]).map((i) => (
                    <div key={i} className="bg-surface2 border border-border rounded-lg p-3.5">
                      <div className="text-[13px] font-medium mb-2.5">Coach de {names[i]}</div>
                      <div className="flex gap-2 mb-2.5">
                        {(['random', 'choice'] as CoachMode[]).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setCoachMode((m) => i === 0 ? [mode, m[1]] : [m[0], mode])}
                            className={`flex-1 px-2.5 py-2 rounded-lg text-xs border ${
                              coachMode[i] === mode ? 'border-amber text-amber' : 'border-border text-text bg-surface'
                            }`}
                          >
                            {mode === 'random' ? '🎲 Aléatoire' : '🎯 Choisir'}
                          </button>
                        ))}
                      </div>
                      {coachMode[i] === 'choice' && (
                        <select
                          className="input text-[13px]"
                          value={coachChoiceId[i]}
                          onChange={(e) => setCoachChoiceId((c) => i === 0 ? [e.target.value, c[1]] : [c[0], e.target.value])}
                        >
                          <option value="">— Choisir un coach —</option>
                          {coachItems.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                      {coaches[i] && <CoachCard coach={coaches[i]} accent={ACCENTS[i]} size="sm" />}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="text-[12.5px] text-muted block mb-1.5">Base de terrains (optionnel)</label>
                <select className="input" value={terrainListId} onChange={(e) => setTerrainListId(e.target.value)}>
                  <option value="">— Aucun terrain —</option>
                  {terrainLists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="btn w-fit" onClick={start}>▶ Démarrer</button>
          </div>
        )}
      </div>
    );
  }

  // ROUND
  if (phase === 'round') {
    const responder: PIdx = highestBidder === 0 ? 1 : 0;
    const activeIdx: PIdx = roundStage === 'open' ? starterIndex : responder;
    const activeAccent = ACCENTS[activeIdx];
    const cardsDistributed = teams[0].length + teams[1].length;

    return (
      <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] justify-between rounded-2xl p-4 md:p-6 overflow-hidden" style={backgroundStyle}>
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] font-bold text-amber uppercase tracking-wider">MANCHE {cardsDistributed + 1}</div>
              <h1 className="text-xl md:text-2xl font-black text-white">Enchères</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-[#1a1d2e] border border-amber/40 px-3 py-1 rounded-lg text-xs font-bold text-amber">
                {terrain ? terrain.name : 'Terrains'}
              </div>
              <div className="bg-[#121420] border border-white/10 px-3 py-1 rounded-lg text-xs font-semibold text-slate-300">
                {cardsDistributed}/{TEAM_SIZE * 2} cartes
              </div>
            </div>
          </div>

          <div className="relative flex items-stretch bg-[#121420]/90 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <PlayerHeader idx={0} name={names[0]} coach={coaches[0]} budget={budgets[0]} cardsCount={teams[0].length} isActive={activeIdx === 0} isStarter={starterIndex === 0} />
            <div className="relative flex items-center justify-center px-3.5 bg-[#181b2c] border-x border-white/10 z-10">
              <span className="text-amber font-black text-xs px-1.5 py-0.5 rounded shadow-sm">VS</span>
            </div>
            <PlayerHeader idx={1} name={names[1]} coach={coaches[1]} budget={budgets[1]} cardsCount={teams[1].length} isActive={activeIdx === 1} isStarter={starterIndex === 1} reverse />
          </div>
        </div>

        {/* Carte en jeu */}
        <div className="flex flex-col items-center justify-center my-auto py-1">
          <div className="w-[190px] h-[220px] sm:w-[210px] sm:h-[240px] bg-[#141622] border-2 border-amber shadow-[0_0_30px_rgba(245,158,11,0.35)] rounded-2xl overflow-hidden relative">
            {currentCard?.image_url ? (
              <img src={currentCard.image_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full bg-surface2 flex items-center justify-center text-4xl">🎴</div>
            )}
          </div>
          <div className="font-serif text-xl font-bold text-white text-center max-w-[240px] mt-2 drop-shadow-md">
            {currentCard?.name}
          </div>
        </div>

        {/* Console d'enchère avec effet visuel d'impulsion lors de la mise */}
        <div className="w-full max-w-xl mx-auto">
          <div
            className={`bg-[#121420]/95 rounded-2xl p-3.5 shadow-2xl flex flex-col items-center gap-2.5 transition-all duration-300 border-2 ${
              bidPulse ? 'scale-105' : 'scale-100'
            }`}
            style={{ borderColor: activeAccent, boxShadow: `0 0 25px ${activeAccent}50` }}
          >
            {roundStage === 'open' ? (
              <>
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block animate-pulse" style={{ backgroundColor: activeAccent }} />
                  <b style={{ color: activeAccent }}>{names[starterIndex]}</b> ouvre les enchères.
                </div>
                {budgets[starterIndex] > 0 ? (
                  <div className="flex items-center gap-2 w-full max-w-sm">
                    <input
                      type="number"
                      className="input text-sm py-2"
                      placeholder={`1 à ${budgets[starterIndex]}`}
                      value={bidInput}
                      onChange={(e) => setBidInput(e.target.value)}
                    />
                    <button className="btn py-2 px-6" onClick={() => handleBid(Number(bidInput), starterIndex)}>Miser</button>
                  </div>
                ) : (
                  <button className="btn py-2 px-6" onClick={() => handleBid(0, starterIndex)}>Confirmer (0)</button>
                )}
              </>
            ) : (
              <>
                <div className="text-xs font-semibold text-white">
                  <b className="text-amber">{names[highestBidder]}</b> a misé <b className="text-amber">{highestBid}</b>. Au tour de <b style={{ color: activeAccent }}>{names[responder]}</b>.
                </div>
                <div className="flex items-center gap-2 w-full max-w-md justify-center">
                  <button className="btn-ghost py-2 text-xs" onClick={() => awardCard(highestBidder, highestBid)}>🏳 Passer</button>
                  {budgets[responder] > highestBid && (
                    <>
                      <input
                        type="number"
                        className="input text-sm py-2 w-28"
                        placeholder={`> ${highestBid}`}
                        value={bidInput}
                        onChange={(e) => setBidInput(e.target.value)}
                      />
                      <button className="btn py-2 px-5 text-xs" onClick={() => handleBid(Number(bidInput), responder)}>Miser plus</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // END
  const p1Res = calculateTeamScore(teams[0].map((t) => t.name), budgets[0], budgets[1], isOnePieceBase);
  const p2Res = calculateTeamScore(teams[1].map((t) => t.name), budgets[1], budgets[0], isOnePieceBase);

  let winnerText = 'Égalité !';
  if (isOnePieceBase) {
    if (instantWinner !== null) {
      winnerText = `Victoire Instantanée de ${names[instantWinner]} (L'Héritier du Chapeau) !`;
    } else if (p1Res.totalScore > p2Res.totalScore) {
      winnerText = `Victoire de ${names[0]} !`;
    } else if (p2Res.totalScore > p1Res.totalScore) {
      winnerText = `Victoire de ${names[1]} !`;
    }
  } else {
    winnerText = `Fin de partie pour ${names[0]} & ${names[1]}`;
  }

  const instantWinnerCards = instantWinner !== null
    ? teams[instantWinner].filter((c) => ['Luffy', 'Roger', 'JoyBoy', 'Shanks'].includes(c.name))
    : [];

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] justify-between rounded-2xl p-3 md:p-5 overflow-y-auto relative" style={backgroundStyle}>
      
      {/* Modal de victoire instantanée */}
      {instantWinner !== null && (
        <InstantWinModal
          winnerName={names[instantWinner]}
          cards={instantWinnerCards}
          accent={ACCENTS[instantWinner]}
          onClose={() => setInstantWinner(null)}
        />
      )}

      <div className="text-center my-2">
        <h2 className="text-2xl md:text-3xl font-black text-amber drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
          🏆 {winnerText}
        </h2>
      </div>

      <div className="flex items-center justify-center gap-6 md:gap-12 my-2">
        <EndPlayerSummary name={names[0]} coach={coaches[0]} res={p1Res} budget={budgets[0]} accent={ACCENTS[0]} isOnePiece={isOnePieceBase} />
        <div className="font-black text-3xl md:text-4xl text-amber drop-shadow select-none">VS</div>
        <EndPlayerSummary name={names[1]} coach={coaches[1]} res={p2Res} budget={budgets[1]} accent={ACCENTS[1]} isOnePiece={isOnePieceBase} />
      </div>

      <div className="grid grid-cols-2 gap-4 my-2 w-full max-w-5xl mx-auto">
        {[0, 1].map((pIdx) => {
          const res = pIdx === 0 ? p1Res : p2Res;
          return (
            <div key={pIdx} className="flex flex-col gap-2">
              {isOnePieceBase && (
                <SynergyBadges active={res.activeSynergies} pureD={res.pureDBonus > 0} eco={res.economyBonus > 0} accent={ACCENTS[pIdx]} />
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                {teams[pIdx].map((item) => {
                  const cd = res.cardDetails.find((c) => c.name === item.name);
                  return <CardTile key={item.id} item={item} cardDetail={cd} accent={ACCENTS[pIdx]} isOnePiece={isOnePieceBase} />;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center mt-2">
        <button className="btn py-2.5 px-8 text-sm" onClick={reset}>↺ Nouvelle partie</button>
      </div>
    </div>
  );
}

// COMPOSANTS SECONDAIRES
function PlayerHeader({ idx, name, coach, budget, cardsCount, isActive, isStarter, reverse = false }: any) {
  const accent = ACCENTS[idx];
  return (
    <div className={`flex-1 flex items-center justify-between p-3.5 border-b-4 transition-all bg-gradient-to-${reverse ? 'l' : 'r'} from-[${accent}]/25 via-[${accent}]/10 to-transparent ${isActive ? `border-[${accent}]` : 'border-transparent'}`}>
      {!reverse && (
        <div className="flex items-center gap-3.5">
          <CoachCard coach={coach} accent={accent} size="md" />
          <div>
            <div className="font-bold text-white text-base">{name}</div>
            {isStarter && <span className="text-[9px] font-black uppercase tracking-wider block mt-1" style={{ color: accent }}>OUVRE LES ENCHÈRES</span>}
          </div>
        </div>
      )}
      <div className="flex items-center gap-5 text-center">
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">BUDGET</span>
          <span className="text-amber font-extrabold text-base">💰 {budget}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 uppercase font-bold block">CARTES</span>
          <span className="font-extrabold text-base" style={{ color: accent }}>{cardsCount}/{TEAM_SIZE}</span>
        </div>
      </div>
      {reverse && (
        <div className="flex items-center gap-3.5 text-right">
          <div>
            <div className="font-bold text-white text-base">{name}</div>
            {isStarter && <span className="text-[9px] font-black uppercase tracking-wider block mt-1" style={{ color: accent }}>OUVRE LES ENCHÈRES</span>}
          </div>
          <CoachCard coach={coach} accent={accent} size="md" />
        </div>
      )}
    </div>
  );
}

function EndPlayerSummary({ name, coach, res, budget, accent, isOnePiece }: any) {
  return (
    <div className="flex flex-col items-center">
      <CoachCard coach={coach} accent={accent} size="lg" />
      <div className="font-extrabold text-xl mt-2 tracking-wide drop-shadow" style={{ color: accent }}>{name}</div>
      <div className="text-xs text-slate-300 font-semibold mt-1">💰 Budget restant: {budget}</div>
      
      {isOnePiece && (
        <>
          <div className="text-xs text-slate-300 font-semibold">⚡ Puissance Cartes: {res.cardsPowerTotal} pts</div>
          {res.economyBonus > 0 && <div className="text-[11px] text-amber font-bold">💰 Bonus Max Budget: +20 pts</div>}
          {res.pureDBonus > 0 && <div className="text-[11px] text-amber font-bold">👑 Bonus 100% D: +30 pts</div>}
          <div className="text-base font-black text-amber mt-1 bg-amber/10 border border-amber/40 px-3 py-0.5 rounded-lg">
            Score Total: {res.totalScore} pts
          </div>
        </>
      )}
    </div>
  );
}

// Carte de résumé avec affichage des badges de faction du personnage au survol/clic
function CardTile({ item, cardDetail, accent, isOnePiece }: any) {
  const [showFactions, setShowFactions] = useState(false);

  const characterFactions = isOnePiece
    ? FACTIONS.filter((f) => f.members.includes(item.name))
    : [];

  return (
    <div
      className="bg-[#121420]/95 border-2 rounded-xl p-2 flex flex-col items-center text-center w-28 sm:w-32 shadow-xl relative cursor-pointer transition-transform hover:scale-105"
      style={{ borderColor: `${accent}99` }}
      onClick={() => setShowFactions(!showFactions)}
      onMouseEnter={() => setShowFactions(true)}
      onMouseLeave={() => setShowFactions(false)}
    >
      {item.image_url ? (
        <img src={item.image_url} className="w-full h-16 sm:h-20 object-cover rounded-lg" alt="" />
      ) : (
        <div className="w-full h-16 sm:h-20 rounded-lg bg-surface2 flex items-center justify-center text-sm">🎴</div>
      )}

      {/* Tooltip Factions */}
      {showFactions && characterFactions.length > 0 && (
        <div className="absolute inset-0 bg-black/90 rounded-xl p-1.5 flex flex-col items-center justify-center gap-1 z-20 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="text-[9px] font-bold text-amber uppercase tracking-wider mb-0.5">Factions</div>
          <div className="flex flex-wrap gap-1 justify-center max-h-full overflow-y-auto">
            {characterFactions.map((f) => (
              <span key={f.id} className="text-[8px] bg-white/15 text-slate-200 px-1.5 py-0.5 rounded font-semibold border border-white/20">
                {f.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-[11px] font-bold text-white truncate max-w-full mt-1">{item.name}</div>
      
      {isOnePiece && cardDetail && (
        <div className="flex items-center justify-between w-full mt-1 px-1 text-[10px]">
          <span className="text-slate-400 line-through">{cardDetail.basePower}</span>
          {cardDetail.boostPercent > 0 && <span className="text-amber font-bold">+{cardDetail.boostPercent}%</span>}
          <span className="font-black text-white" style={{ color: accent }}>{cardDetail.finalPower} pts</span>
        </div>
      )}
    </div>
  );
}

function SynergyBadges({ active, pureD, eco, accent }: any) {
  return (
    <div className="flex flex-wrap gap-1 justify-center text-xs font-bold uppercase tracking-wider">
      {active.map((s: any) => (
        <span key={s.name} className="bg-white/10 px-2 py-0.5 rounded border border-white/20" style={{ color: accent }}>
          {s.name} (+{s.boost}%){s.isFull ? ' ⭐ Full' : ''}
        </span>
      ))}
      {pureD && <span className="bg-amber/20 border border-amber/50 text-amber px-2 py-0.5 rounded">👑 100% D (+30)</span>}
      {eco && <span className="bg-amber/20 border border-amber/50 text-amber px-2 py-0.5 rounded">💰 Éco Max (+20)</span>}
    </div>
  );
}

function CoachCard({ coach, accent, size = 'md' }: any) {
  if (!coach) return null;
  const dims = size === 'lg' ? 'w-28 h-36 md:w-36 md:h-48' : size === 'md' ? 'w-12 h-14' : 'w-10 h-12';
  return (
    <div className={`${dims} rounded-xl overflow-hidden border-2 border-white/60 shrink-0 shadow-lg`} style={{ boxShadow: `0 0 15px ${accent}66` }}>
      {coach.image_url ? (
        <img src={coach.image_url} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="w-full h-full bg-surface2 flex items-center justify-center text-xs">🧑‍🏫</div>
      )}
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { pickRandom, shuffle } from '@/lib/utils';

type Phase = 'setup' | 'round' | 'end';
type RoundStage = 'open' | 'respond';
type PIdx = 0 | 1;
type CoachMode = 'random' | 'choice';

const TEAM_SIZE = 5;

export default function VersusPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [loading, setLoading] = useState(true);

  // Coachs
  const [coachLists, setCoachLists] = useState<GameList[]>([]);
  const [coachListId, setCoachListId] = useState('');
  const [coachItems, setCoachItems] = useState<ListItem[]>([]);
  const [coachMode, setCoachMode] = useState<[CoachMode, CoachMode]>(['random', 'random']);
  const [coachChoiceId, setCoachChoiceId] = useState<[string, string]>(['', '']);
  const [coaches, setCoaches] = useState<[ListItem | null, ListItem | null]>([null, null]);

  // Terrain
  const [terrainLists, setTerrainLists] = useState<GameList[]>([]);
  const [terrainListId, setTerrainListId] = useState('');
  const [terrainItems, setTerrainItems] = useState<ListItem[]>([]);
  const [terrain, setTerrain] = useState<ListItem | null>(null);

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
  const [notices, setNotices] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      const forCards: GameList[] = [];
      const forCoaches: GameList[] = [];
      const forTerrains: GameList[] = [];
      if (data) {
        for (const l of data as GameList[]) {
          const { count } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('list_id', l.id);
          if (count && count >= TEAM_SIZE * 2) forCards.push(l);
          if (count && count >= 1) forCoaches.push(l);
          if (count && count >= 1) forTerrains.push(l);
        }
      }
      setLists(forCards);
      setCoachLists(forCoaches);
      setTerrainLists(forTerrains);
      if (forCards.length > 0) setListId(forCards[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!coachListId) {
      setCoachItems([]);
      return;
    }
    (async () => {
      const { data } = await supabase.from('items').select('*').eq('list_id', coachListId);
      if (data) setCoachItems(data as ListItem[]);
    })();
  }, [coachListId]);

  useEffect(() => {
    if (!terrainListId) {
      setTerrainItems([]);
      return;
    }
    (async () => {
      const { data } = await supabase.from('items').select('*').eq('list_id', terrainListId);
      if (data) setTerrainItems(data as ListItem[]);
    })();
  }, [terrainListId]);

  function rerollCoaches() {
    if (coachItems.length === 0) {
      setCoaches([null, null]);
      return;
    }
    const resolved: [ListItem | null, ListItem | null] = [null, null];
    if (coachMode[0] === 'random' && coachMode[1] === 'random') {
      const two = pickRandom(coachItems, Math.min(2, coachItems.length));
      resolved[0] = two[0] || null;
      resolved[1] = two[1] || two[0] || null;
    } else {
      resolved[0] =
        coachMode[0] === 'choice' && coachChoiceId[0]
          ? coachItems.find((c) => c.id === coachChoiceId[0]) || null
          : pickRandom(coachItems, 1)[0] || null;
      if (coachMode[1] === 'choice' && coachChoiceId[1]) {
        resolved[1] = coachItems.find((c) => c.id === coachChoiceId[1]) || null;
      } else {
        const remaining = coachItems.filter((c) => c.id !== resolved[0]?.id);
        const candidates = remaining.length > 0 ? remaining : coachItems;
        resolved[1] = pickRandom(candidates, 1)[0] || null;
      }
    }
    setCoaches(resolved);
  }

  function rerollTerrain() {
    if (terrainItems.length === 0) {
      setTerrain(null);
      return;
    }
    setTerrain(pickRandom(terrainItems, 1)[0] || null);
  }

  useEffect(() => {
    rerollCoaches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachItems, coachMode, coachChoiceId]);

  useEffect(() => {
    rerollTerrain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrainItems]);

  function playRound(
    starter: PIdx,
    nextBudgets: [number, number],
    nextTeams: [ListItem[], ListItem[]],
    nextPool: ListItem[],
    accNotices: string[] = []
  ) {
    if (nextTeams[0].length >= TEAM_SIZE && nextTeams[1].length >= TEAM_SIZE) {
      setBudgets(nextBudgets);
      setTeams(nextTeams);
      setPool(nextPool);
      setNotices([]);
      setPhase('end');
      return;
    }
    if (nextPool.length === 0) {
      setBudgets(nextBudgets);
      setTeams(nextTeams);
      setPool(nextPool);
      setNotices(['Plus de cartes disponibles dans la base.']);
      setPhase('end');
      return;
    }

    const card = nextPool[0];
    const restPool = nextPool.slice(1);
    const full0 = nextTeams[0].length >= TEAM_SIZE;
    const full1 = nextTeams[1].length >= TEAM_SIZE;

    if (full0 || full1) {
      const winner: PIdx = full0 ? 1 : 0;
      const teamsAfter: [ListItem[], ListItem[]] = [nextTeams[0].slice(), nextTeams[1].slice()];
      teamsAfter[winner] = [...teamsAfter[winner], card];
      const notice = `${names[winner]} reçoit "${card.name}" gratuitement (équipe adverse déjà complète).`;
      playRound(starter === 0 ? 1 : 0, nextBudgets, teamsAfter, restPool, [...accNotices, notice]);
      return;
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
    setNotices(accNotices);
    setPhase('round');
  }

  async function start() {
    if (!listId) return;
    const { data: items } = await supabase.from('items').select('*').eq('list_id', listId);
    if (!items || items.length < TEAM_SIZE * 2) {
      alert(`Il faut au moins ${TEAM_SIZE * 2} items dans cette base.`);
      return;
    }
    const cleanNames: [string, string] = [names[0].trim() || 'Joueur 1', names[1].trim() || 'Joueur 2'];
    setNames(cleanNames);

    const shuffled = shuffle(items as ListItem[]);
    playRound(0, [startBudget, startBudget], [[], []], shuffled);
  }

  function submitOpenBid() {
    const budget = budgets[starterIndex];
    const min = budget > 0 ? 1 : 0;
    const amount = Number(bidInput);
    if (Number.isNaN(amount) || amount < min || amount > budget) {
      alert(`Mise invalide (entre ${min} et ${budget}).`);
      return;
    }
    setHighestBid(amount);
    setHighestBidder(starterIndex);
    setRoundStage('respond');
    setBidInput('');
  }

  function respondPass() {
    awardCard(highestBidder, highestBid);
  }

  function respondRaise() {
    const responder: PIdx = highestBidder === 0 ? 1 : 0;
    const budget = budgets[responder];
    const amount = Number(bidInput);
    if (Number.isNaN(amount) || amount <= highestBid || amount > budget) {
      alert(`Mise invalide (doit être supérieure à ${highestBid} et au maximum ${budget}).`);
      return;
    }
    setHighestBid(amount);
    setHighestBidder(responder);
    setBidInput('');
  }

  function awardCard(winner: PIdx, cost: number) {
    if (!currentCard) return;
    const newBudgets: [number, number] = [...budgets];
    newBudgets[winner] -= cost;
    const newTeams: [ListItem[], ListItem[]] = [teams[0].slice(), teams[1].slice()];
    newTeams[winner] = [...newTeams[winner], currentCard];
    const nextStarter: PIdx = starterIndex === 0 ? 1 : 0;
    playRound(nextStarter, newBudgets, newTeams, pool);
  }

  function reset() {
    setPhase('setup');
    setPool([]);
    setCurrentCard(null);
    setTeams([[], []]);
    setBudgets([0, 0]);
    setNotices([]);
  }

  if (loading) return <p className="text-muted">Chargement...</p>;

  // ================= SETUP =================
  // ================= SETUP =================
  if (phase === 'setup') {
    return (
      <div>
        <div className="mb-7">
          <div className="eyebrow">Mode</div>
          <h1 className="font-serif text-3xl">Versus</h1>
          <p className="text-muted mt-2 text-[14.5px] max-w-xl">
            Deux joueurs, un budget commun, et des enchères carte par carte jusqu'à ce que chacun ait une équipe de {TEAM_SIZE}.
          </p>
        </div>

        {lists.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">
            Crée d'abord une base d'au moins {TEAM_SIZE * 2} items dans "Mes bases".
          </p>
        ) : (
          <div className="panel flex flex-col gap-6">
            <div>
              <label className="text-[12.5px] text-muted block mb-1.5">Base</label>
              <select className="input" value={listId} onChange={(e) => setListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-6 flex-wrap">
              <div>
                <label className="text-[12.5px] text-muted block mb-1.5">Nom du joueur 1</label>
                <input className="input" value={names[0]} onChange={(e) => setNames([e.target.value, names[1]])} />
              </div>
              <div>
                <label className="text-[12.5px] text-muted block mb-1.5">Nom du joueur 2</label>
                <input className="input" value={names[1]} onChange={(e) => setNames([names[0], e.target.value])} />
              </div>
            </div>

            <div>
              <label className="text-[12.5px] text-muted block mb-1.5">Budget de départ (identique pour les deux)</label>
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

            {/* Coachs */}
            <div className="border-t border-border pt-5">
              <label className="text-[12.5px] text-muted block mb-1.5">Base de coachs (optionnel)</label>
              <select className="input" value={coachListId} onChange={(e) => setCoachListId(e.target.value)}>
                <option value="">— Aucun coach —</option>
                {coachLists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              {coachListId && coachItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                  {([0, 1] as PIdx[]).map((i) => (
                    <div key={i} className="bg-surface2 border border-border rounded-lg p-3.5">
                      <div className="text-[13px] font-medium mb-2.5">Coach de {names[i]}</div>
                      <div className="flex gap-2 mb-2.5">
                        <button
                          onClick={() => setCoachMode((m) => (i === 0 ? ['random', m[1]] : [m[0], 'random']))}
                          className={`flex-1 px-2.5 py-2 rounded-lg text-xs border ${
                            coachMode[i] === 'random' ? 'border-amber text-amber' : 'border-border text-text bg-surface'
                          }`}
                        >
                          🎲 Aléatoire
                        </button>
                        <button
                          onClick={() => setCoachMode((m) => (i === 0 ? ['choice', m[1]] : [m[0], 'choice']))}
                          className={`flex-1 px-2.5 py-2 rounded-lg text-xs border ${
                            coachMode[i] === 'choice' ? 'border-amber text-amber' : 'border-border text-text bg-surface'
                          }`}
                        >
                          🎯 Choisir
                        </button>
                      </div>
                      {coachMode[i] === 'choice' && (
                        <select
                          className="input text-[13px]"
                          value={coachChoiceId[i]}
                          onChange={(e) =>
                            setCoachChoiceId((c) => (i === 0 ? [e.target.value, c[1]] : [c[0], e.target.value]))
                          }
                        >
                          <option value="">— Choisir un coach —</option>
                          {coachItems.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                      {coaches[i] && (
                        <div className="flex items-center gap-2.5 mt-3">
                          <CoachCard coach={coaches[i]} accent={i === 0 ? '#e2645a' : '#4fc9c0'} size="sm" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {coachListId && coachItems.length > 0 && (
                <button className="btn-ghost btn-small mt-3" onClick={rerollCoaches}>
                  🎲 Relancer le tirage des coachs
                </button>
              )}
            </div>

            {/* Terrain */}
            <div className="border-t border-border pt-5">
              <label className="text-[12.5px] text-muted block mb-1.5">Base de terrains (optionnel — tiré au hasard)</label>
              <select className="input" value={terrainListId} onChange={(e) => setTerrainListId(e.target.value)}>
                <option value="">— Aucun terrain —</option>
                {terrainLists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              {terrain && (
                <div className="flex items-center gap-3 mt-3">
                  {terrain.image_url && <img src={terrain.image_url} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                  <span className="text-[13px] text-amber font-medium">{terrain.name}</span>
                </div>
              )}
              {terrainListId && terrainItems.length > 0 && (
                <button className="btn-ghost btn-small mt-3" onClick={rerollTerrain}>
                  🎲 Relancer le tirage du terrain
                </button>
              )}
            </div>

            <button className="btn w-fit" onClick={start}>▶ Démarrer</button>
          </div>
        )}
      </div>
    );
  }

  // ================= ROUND =================
  if (phase === 'round') {
    const responder: PIdx = highestBidder === 0 ? 1 : 0;
    const activeIdx: PIdx = roundStage === 'open' ? starterIndex : responder;
    const activeAccent = activeIdx === 0 ? '#e2645a' : '#4fc9c0';
    
    const starterBudget = budgets[starterIndex];
    const responderBudget = budgets[responder];
    const canRaise = roundStage === 'respond' && responderBudget > highestBid;

    const bgStyle: React.CSSProperties = terrain?.image_url
      ? {
          backgroundImage: `linear-gradient(rgba(10,10,14,0.60), rgba(10,10,14,0.60)), url(${terrain.image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {};

    const cardsDistributed = teams[0].length + teams[1].length;
    const totalCards = TEAM_SIZE * 2;
    const currentListName = lists.find((l) => l.id === listId)?.name || '';

    return (
      <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] justify-between rounded-2xl p-4 md:p-6 overflow-hidden" style={bgStyle}>
        
        {/* En-tête supérieur */}
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
                {cardsDistributed}/{totalCards} cartes
              </div>
            </div>
          </div>

          {/* Bandeaux des deux joueurs en miroir parfait */}
          <div className="relative flex items-stretch bg-[#121420]/90 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            
            {/* Joueur 1 (Gauche) */}
            <div
              className={`flex-1 flex items-center justify-between p-3.5 border-b-4 transition-all bg-gradient-to-r from-[#e2645a]/25 via-[#e2645a]/10 to-transparent ${
                activeIdx === 0 ? 'border-[#e2645a]' : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <CoachCard coach={coaches[0]} accent="#e2645a" size="md" />
                <div>
                  <div className="font-bold text-white text-base">{names[0]}</div>
                  {coaches[0] && (
                    <span className="text-[10px] bg-[#e2645a]/30 text-[#e2645a] font-bold px-2 py-0.5 rounded border border-[#e2645a]/40 inline-block mt-0.5">
                      {coaches[0].name}
                    </span>
                  )}
                  {starterIndex === 0 && (
                    <span className="text-[9px] font-black text-[#e2645a] uppercase tracking-wider block mt-1">
                      OUVRE LES ENCHÈRES
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-5 text-center">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">BUDGET</span>
                  <span className="text-amber font-extrabold text-base">💰 {budgets[0]}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">CARTES</span>
                  <span className="font-extrabold text-base" style={{ color: '#e2645a' }}>{teams[0].length}/{TEAM_SIZE}</span>
                </div>
              </div>
            </div>

            {/* Démarcation centrale "VS" */}
            <div className="relative flex items-center justify-center px-3.5 bg-[#181b2c] border-x border-white/10 z-10">
              <span className="text-amber font-black text-xs px-1.5 py-0.5 rounded shadow-sm">
                VS
              </span>
            </div>

            {/* Joueur 2 (Droite - Inversé en miroir) */}
            <div
              className={`flex-1 flex items-center justify-between p-3.5 border-b-4 transition-all bg-gradient-to-l from-[#4fc9c0]/25 via-[#4fc9c0]/10 to-transparent ${
                activeIdx === 1 ? 'border-[#4fc9c0]' : 'border-transparent'
              }`}
            >
              <div className="flex items-center gap-5 text-center">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">CARTES</span>
                  <span className="font-extrabold text-base" style={{ color: '#4fc9c0' }}>{teams[1].length}/{TEAM_SIZE}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">BUDGET</span>
                  <span className="text-amber font-extrabold text-base">💰 {budgets[1]}</span>
                </div>
              </div>

              <div className="flex items-center gap-3.5 text-right">
                <div>
                  <div className="font-bold text-white text-base">{names[1]}</div>
                  {coaches[1] && (
                    <span className="text-[10px] bg-[#4fc9c0]/30 text-[#4fc9c0] font-bold px-2 py-0.5 rounded border border-[#4fc9c0]/40 inline-block mt-0.5">
                      {coaches[1].name}
                    </span>
                  )}
                  {starterIndex === 1 && (
                    <span className="text-[9px] font-black text-[#4fc9c0] uppercase tracking-wider block mt-1">
                      OUVRE LES ENCHÈRES
                    </span>
                  )}
                </div>
                <CoachCard coach={coaches[1]} accent="#4fc9c0" size="md" />
              </div>
            </div>

          </div>
        </div>

        {/* Zone centrale : Carte mise en jeu */}
        <div className="flex flex-col items-center justify-center my-auto py-1">
          {currentListName && (
            <span className="text-[11px] text-indigo-200/80 font-extrabold uppercase tracking-widest mb-1">
              {currentListName}
            </span>
          )}
          
          <div className="flex flex-col items-center gap-2">
            <div className="w-[190px] h-[220px] sm:w-[210px] sm:h-[240px] bg-[#141622] border-2 border-amber shadow-[0_0_30px_rgba(245,158,11,0.35)] rounded-2xl overflow-hidden relative">
              {currentCard?.image_url ? (
                <img src={currentCard.image_url} className="w-full h-full object-cover" alt={currentCard.name} />
              ) : (
                <div className="w-full h-full bg-surface2 flex items-center justify-center text-4xl">🎴</div>
              )}
            </div>

            <div className="font-serif text-xl font-bold text-white text-center max-w-[240px] drop-shadow-md">
              {currentCard?.name}
            </div>
          </div>
        </div>

        {/* Bloc d'action / Enchère */}
        <div className="w-full max-w-xl mx-auto">
          {roundStage === 'open' ? (
            <div
              className="bg-[#121420]/95 rounded-2xl p-3.5 shadow-2xl flex flex-col items-center gap-2.5 transition-all duration-300"
              style={{
                border: `2px solid ${activeAccent}`,
                boxShadow: `0 0 25px ${activeAccent}50`,
              }}
            >
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block animate-pulse" style={{ backgroundColor: activeAccent }} />
                <b style={{ color: activeAccent }}>{names[starterIndex]}</b> ouvre les enchères.
              </div>
              {starterBudget > 0 ? (
                <div className="flex items-center gap-2 w-full max-w-sm">
                  <input
                    type="number"
                    className="input text-sm py-2"
                    placeholder={`1 à ${starterBudget}`}
                    value={bidInput}
                    min={1}
                    max={starterBudget}
                    onChange={(e) => setBidInput(e.target.value)}
                  />
                  <button className="btn py-2 px-6" onClick={submitOpenBid}>Miser</button>
                </div>
              ) : (
                <button className="btn py-2 px-6" onClick={() => { setBidInput('0'); submitOpenBid(); }}>
                  Confirmer la mise (0)
                </button>
              )}
            </div>
          ) : (
            <div
              className="bg-[#121420]/95 rounded-2xl p-3.5 shadow-2xl flex flex-col items-center gap-2.5 transition-all duration-300"
              style={{
                border: `2px solid ${activeAccent}`,
                boxShadow: `0 0 25px ${activeAccent}50`,
              }}
            >
              <div className="text-xs font-semibold text-white">
                <b className="text-amber">{names[highestBidder]}</b> a misé <b className="text-amber">{highestBid}</b>. Au tour de <b style={{ color: activeAccent }}>{names[responder]}</b>.
              </div>
              <div className="flex items-center gap-2 w-full max-w-md justify-center">
                <button className="btn-ghost py-2 text-xs" onClick={respondPass}>🏳 Passer</button>
                {canRaise && (
                  <>
                    <input
                      type="number"
                      className="input text-sm py-2 w-28"
                      placeholder={`> ${highestBid}`}
                      value={bidInput}
                      min={highestBid + 1}
                      max={responderBudget}
                      onChange={(e) => setBidInput(e.target.value)}
                    />
                    <button className="btn py-2 px-5 text-xs" onClick={respondRaise}>Miser plus</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    );
  }

  // ================= END =================
  const endBgStyle: React.CSSProperties = terrain?.image_url
    ? {
        backgroundImage: `linear-gradient(rgba(10,10,14,0.60), rgba(10,10,14,0.60)), url(${terrain.image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] justify-between rounded-2xl p-3 md:p-5 overflow-hidden" style={endBgStyle}>
      
      {/* Badge Terrain */}
      {terrain && (
        <div className="flex justify-center mb-1">
          <div className="inline-flex items-center gap-2 bg-black/60 border border-amber/40 rounded-full px-4 py-1 backdrop-blur-md">
            {terrain.image_url && <img src={terrain.image_url} className="w-4 h-4 rounded-full object-cover" alt="" />}
            <span className="text-xs text-slate-300">Terrain de la partie :</span>
            <span className="font-bold text-amber text-xs">{terrain.name}</span>
          </div>
        </div>
      )}

      {/* Zone centrale : Coach 1, VS, Coach 2 */}
      <div className="flex items-center justify-center gap-6 md:gap-12 my-auto">
        {/* Coach 1 */}
        <div className="flex flex-col items-center">
          <CoachCard coach={coaches[0]} accent="#e2645a" size="lg" />
          <div className="font-extrabold text-[#e2645a] text-xl mt-2 tracking-wide drop-shadow">{names[0]}</div>
          <div className="text-xs text-slate-300 font-semibold">💰 {budgets[0]} restant{budgets[0] > 1 ? 's' : ''}</div>
        </div>

        {/* VS au centre */}
        <div className="font-black text-3xl md:text-4xl text-amber drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] select-none">
          VS
        </div>

        {/* Coach 2 */}
        <div className="flex flex-col items-center">
          <CoachCard coach={coaches[1]} accent="#4fc9c0" size="lg" />
          <div className="font-extrabold text-[#4fc9c0] text-xl mt-2 tracking-wide drop-shadow">{names[1]}</div>
          <div className="text-xs text-slate-300 font-semibold">💰 {budgets[1]} restant{budgets[1] > 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Grille des cartes obtenues */}
      <div className="grid grid-cols-2 gap-4 my-auto w-full max-w-5xl mx-auto">
        {/* Cartes Joueur 1 */}
        <div className="flex flex-wrap gap-2.5 justify-center">
          {teams[0].map((it) => (
            <div
              key={it.id}
              className="bg-[#121420]/95 border-2 border-[#e2645a]/60 rounded-xl p-2 flex flex-col items-center text-center w-36 sm:w-40 shadow-xl"
            >
              {it.image_url ? (
                <img src={it.image_url} className="w-full h-20 sm:h-24 object-cover rounded-lg" alt="" />
              ) : (
                <div className="w-full h-20 sm:h-24 rounded-lg bg-surface2 flex items-center justify-center text-sm">🎴</div>
              )}
              <div className="text-xs font-bold text-white truncate max-w-full mt-1.5">{it.name}</div>
            </div>
          ))}
        </div>

        {/* Cartes Joueur 2 */}
        <div className="flex flex-wrap gap-2.5 justify-center">
          {teams[1].map((it) => (
            <div
              key={it.id}
              className="bg-[#121420]/95 border-2 border-[#4fc9c0]/60 rounded-xl p-2 flex flex-col items-center text-center w-36 sm:w-40 shadow-xl"
            >
              {it.image_url ? (
                <img src={it.image_url} className="w-full h-20 sm:h-24 object-cover rounded-lg" alt="" />
              ) : (
                <div className="w-full h-20 sm:h-24 rounded-lg bg-surface2 flex items-center justify-center text-sm">🎴</div>
              )}
              <div className="text-xs font-bold text-white truncate max-w-full mt-1.5">{it.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bouton de réinitialisation */}
      <div className="flex justify-center mt-2">
        <button className="btn py-2.5 px-8 text-sm" onClick={reset}>↺ Nouvelle partie</button>
      </div>

    </div>
  );
}

function CoachCard({
  coach,
  accent,
  size = 'md',
}: {
  coach: ListItem | null;
  accent: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!coach) return null;
  
  const imgDims = size === 'lg' 
    ? 'w-32 h-44 md:w-40 md:h-52' 
    : size === 'md' 
    ? 'w-12 h-14' 
    : 'w-10 h-12';

  const glowShadow = size === 'lg' 
    ? `0 0 0 3px ${accent}, 0 0 25px ${accent}88` 
    : `0 0 0 2px ${accent}, 0 0 10px ${accent}66`;

  return (
    <div className="flex flex-col items-center shrink-0">
      <div
        className={`${imgDims} rounded-xl overflow-hidden border-2 border-white/60 transition-all duration-300`}
        style={{ boxShadow: glowShadow }}
      >
        {coach.image_url ? (
          <img src={coach.image_url} className="w-full h-full object-cover" alt={coach.name} />
        ) : (
          <div className="w-full h-full bg-surface2 flex items-center justify-center text-xs">🧑‍🏫</div>
        )}
      </div>
    </div>
  );
}
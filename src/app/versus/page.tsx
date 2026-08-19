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

  // Charge les items de la base de coachs sélectionnée
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

  // Charge les items de la base de terrains sélectionnée
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

  // Tire (ou retire selon les modes choisis) les coachs des deux joueurs.
  // Garantit deux coachs distincts quand au moins un des deux est en mode aléatoire.
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

  // Retire un nouveau terrain au hasard.
  function rerollTerrain() {
    if (terrainItems.length === 0) {
      setTerrain(null);
      return;
    }
    setTerrain(pickRandom(terrainItems, 1)[0] || null);
  }

  // Aperçu automatique dès qu'une base coach/terrain est chargée ou que les modes changent.
  useEffect(() => {
    rerollCoaches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachItems, coachMode, coachChoiceId]);

  useEffect(() => {
    rerollTerrain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrainItems]);

  // Résout récursivement (en mémoire, sans re-render intermédiaire) les manches automatiques
  // — quand l'équipe d'un joueur est déjà pleine, l'autre reçoit la carte gratuitement —
  // jusqu'à retomber sur une manche où les deux joueurs doivent réellement enchérir, ou la fin de partie.
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

    // Coachs et terrain : on garde ce qui a déjà été tiré/choisi en aperçu (via les boutons
    // "🎲 Relancer"), pas besoin de re-tirer ici — ça évite de perdre un choix qui convenait.

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

            {/* ------- Coachs ------- */}
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
                          onClick={() => setCoachMode((m) => (i === 0 ? [ 'random', m[1] ] : [ m[0], 'random' ]))}
                          className={`flex-1 px-2.5 py-2 rounded-lg text-xs border ${
                            coachMode[i] === 'random' ? 'border-amber text-amber' : 'border-border text-text bg-surface'
                          }`}
                        >
                          🎲 Aléatoire
                        </button>
                        <button
                          onClick={() => setCoachMode((m) => (i === 0 ? [ 'choice', m[1] ] : [ m[0], 'choice' ]))}
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

            {/* ------- Terrain ------- */}
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
    const starterBudget = budgets[starterIndex];
    const responderBudget = budgets[responder];
    const canRaise = roundStage === 'respond' && responderBudget > highestBid;

    const bgStyle: React.CSSProperties = terrain?.image_url
      ? {
          backgroundImage: `linear-gradient(rgba(10,10,14,0.85), rgba(10,10,14,0.92)), url(${terrain.image_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {};

    const activeIdx: PIdx = roundStage === 'open' ? starterIndex : responder;
    const activeAccent = activeIdx === 0 ? '#e2645a' : '#4fc9c0';
    const cardsDistributed = teams[0].length + teams[1].length;
    const totalCards = TEAM_SIZE * 2;
    const currentListName = lists.find((l) => l.id === listId)?.name || '';

    return (
      <div className="rounded-2xl -m-1 p-5 md:p-7" style={bgStyle}>
        <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="eyebrow">Manche {cardsDistributed + 1}</div>
            <h1 className="font-serif text-3xl">Enchères</h1>
          </div>
          {terrain && (
            <div className="inline-flex items-center gap-2 bg-surface/85 border border-amberDim rounded-full px-3 py-1.5">
              {terrain.image_url && <img src={terrain.image_url} className="w-5 h-5 rounded-full object-cover" alt="" />}
              <span className="text-[12px] text-amber font-medium">{terrain.name}</span>
              <button
                onClick={rerollTerrain}
                title="Relancer le terrain"
                className="text-muted hover:text-amber text-[13px] leading-none ml-0.5"
              >
                🎲
              </button>
            </div>
          )}
        </div>

        <div className="mb-5">
          <div className="flex justify-between text-[11px] text-muted mb-1.5">
            <span>Progression</span>
            <span>{cardsDistributed}/{totalCards} cartes distribuées</span>
          </div>
          <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber rounded-full transition-all duration-500"
              style={{ width: `${(cardsDistributed / totalCards) * 100}%` }}
            />
          </div>
        </div>

        {notices.length > 0 && (
          <div className="panel py-3 border-amberDim mb-4 text-[13px] text-muted flex flex-col gap-1">
            {notices.map((n, i) => (
              <div key={i}>ℹ️ {n}</div>
            ))}
          </div>
        )}

        {/* Bandeau des deux joueurs */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[0, 1].map((i) => {
            const accent = i === 0 ? '#e2645a' : '#4fc9c0';
            const isActive = highestBidder === i && roundStage === 'respond';
            return (
              <div
                key={i}
                className="p-4 pr-6"
                style={{
                  background: `linear-gradient(135deg, ${accent}2e, #1c1e26 70%)`,
                  border: `1px solid ${isActive ? accent : accent + '40'}`,
                  borderRadius: '10px',
                  clipPath:
                    i === 0
                      ? 'polygon(0 0, 100% 0, 94% 100%, 0% 100%)'
                      : 'polygon(6% 0, 100% 0, 100% 100%, 0% 100%)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <CoachCard coach={coaches[i]} accent={accent} size="sm" />
                  <div className="font-serif text-lg">{names[i]}</div>
                </div>
                <div className="flex gap-6 mt-3">
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider text-muted">Budget</div>
                    <div className="font-serif text-lg font-bold" style={{ color: accent }}>💰 {budgets[i]}</div>
                  </div>
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider text-muted">Cartes</div>
                    <div className="font-serif text-lg font-bold" style={{ color: accent }}>
                      {teams[i].length}/{TEAM_SIZE}
                    </div>
                  </div>
                </div>
                {teams[i].length > 0 && (
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {teams[i].map((it) => (
                      <div
                        key={it.id}
                        className="card-enter w-9 h-9 rounded-md overflow-hidden border shrink-0"
                        style={{ borderColor: accent + '77' }}
                        title={it.name}
                      >
                        {it.image_url ? (
                          <img src={it.image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full bg-surface2 flex items-center justify-center text-[10px]">🎴</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Carte en jeu */}
        <div className="flex flex-col items-center mb-6">
          {currentListName && <div className="text-[12px] text-muted mb-2">{currentListName}</div>}
          <div
            key={currentCard?.id}
            className="card-enter w-[290px] md:w-[320px] min-h-[250px] bg-gradient-to-br from-surface2 to-surface border-2 border-amber rounded-2xl flex flex-col items-center justify-center p-7 text-center gap-4"
            style={{ boxShadow: '0 0 34px rgba(232,171,79,0.28)' }}
          >
            {currentCard?.image_url && (
              <img src={currentCard.image_url} className="w-full max-h-[170px] object-contain rounded-lg" alt="" />
            )}
            <div className="font-serif text-2xl font-bold">{currentCard?.name}</div>
          </div>
        </div>

        {roundStage === 'open' ? (
          <div
            className="panel flex flex-col items-center gap-3 max-w-sm mx-auto text-center"
            style={{ borderColor: activeAccent }}
          >
            <p className="text-[14.5px]">
              <b style={{ color: activeAccent }}>{names[starterIndex]}</b> ouvre les enchères
              {starterBudget === 0 && <> — plus d'argent, mise obligatoire à 0</>}.
            </p>
            {starterBudget > 0 ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  className="input w-28"
                  placeholder={`1 à ${starterBudget}`}
                  value={bidInput}
                  min={1}
                  max={starterBudget}
                  onChange={(e) => setBidInput(e.target.value)}
                />
                <button className="btn" onClick={submitOpenBid}>Miser</button>
              </div>
            ) : (
              <button className="btn" onClick={() => { setBidInput('0'); submitOpenBid(); }}>
                Confirmer la mise obligatoire (0)
              </button>
            )}
          </div>
        ) : (
          <div
            className="panel flex flex-col items-center gap-3 max-w-sm mx-auto text-center"
            style={{ borderColor: activeAccent }}
          >
            <p className="text-[14.5px]">
              <b className="text-amber">{names[highestBidder]}</b> a misé <b className="text-amber">{highestBid}</b>.
              Au tour de <b style={{ color: activeAccent }}>{names[responder]}</b>.
            </p>
            <div className="flex gap-2 items-center flex-wrap justify-center">
              <button className="btn-ghost" onClick={respondPass}>🏳 Passer (laisser la carte)</button>
              {canRaise && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="input w-28"
                    placeholder={`> ${highestBid}`}
                    value={bidInput}
                    min={highestBid + 1}
                    max={responderBudget}
                    onChange={(e) => setBidInput(e.target.value)}
                  />
                  <button className="btn" onClick={respondRaise}>Miser plus</button>
                </div>
              )}
            </div>
            {!canRaise && <p className="text-muted text-[12px]">Pas assez d'argent pour surenchérir — seule l'option "Passer" est possible.</p>}
          </div>
        )}
      </div>
    );
  }

  // ================= END : récap façon "versus" =================
  const endBgStyle: React.CSSProperties = terrain?.image_url
    ? {
        backgroundImage: `linear-gradient(rgba(10,10,14,0.85), rgba(10,10,14,0.92)), url(${terrain.image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {};

  return (
    <div className="rounded-2xl -m-1 p-5 md:p-8" style={endBgStyle}>
      <div className="mb-8 text-center">
        <div className="eyebrow">Terminé</div>
        <h1 className="font-serif text-3xl">Récap final</h1>
      </div>

      {terrain && (
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-surface2 via-surface to-surface2 border border-amberDim rounded-full px-5 py-2.5">
            {terrain.image_url && <img src={terrain.image_url} className="w-8 h-8 rounded-full object-cover" alt="" />}
            <span className="text-[13px] text-muted">Terrain de la partie :</span>
            <span className="font-serif text-amber font-semibold">{terrain.name}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-start">
        <PlayerColumn name={names[0]} coach={coaches[0]} budget={budgets[0]} team={teams[0]} accent="#e2645a" align="right" />

        <div className="flex md:flex-col items-center justify-center gap-2 py-4">
          <div className="relative">
            <div className="font-serif text-5xl md:text-6xl font-black text-amber tracking-widest drop-shadow-[0_0_18px_rgba(232,171,79,0.55)]">
              VS
            </div>
          </div>
          <div className="hidden md:block w-px h-24 bg-border" />
        </div>

        <PlayerColumn name={names[1]} coach={coaches[1]} budget={budgets[1]} team={teams[1]} accent="#4fc9c0" align="left" />
      </div>

      <div className="flex justify-center mt-8">
        <button className="btn" onClick={reset}>↺ Nouvelle partie</button>
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
  const imgDims = size === 'lg' ? 'w-36 h-48 md:w-56 md:h-72 lg:w-64 lg:h-80' : size === 'md' ? 'w-28 h-36' : 'w-20 h-24';
  const nameSize = size === 'lg' ? 'text-sm md:text-base' : size === 'md' ? 'text-[11px]' : 'text-[10px]';

  return (
    <div className="flex flex-col items-center gap-0 shrink-0">
      <div
        className={`${imgDims} rounded-t-xl overflow-hidden`}
        style={{ boxShadow: `0 0 0 2px #14151a, 0 0 0 4px ${accent}` }}
      >
        {coach.image_url ? (
          <img src={coach.image_url} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full bg-surface2 flex items-center justify-center text-2xl">🧑‍🏫</div>
        )}
      </div>
      <div
        className="w-full rounded-b-xl px-2 py-1 text-center"
        style={{ background: accent }}
      >
        <span className={`font-serif font-bold ${nameSize} leading-tight text-[#14151a]`}>
          {coach.name}
        </span>
      </div>
    </div>
  );
}

function PlayerColumn({
  name,
  coach,
  budget,
  team,
  accent,
  align,
}: {
  name: string;
  coach: ListItem | null;
  budget: number;
  team: ListItem[];
  accent: string;
  align: 'left' | 'right';
}) {
  return (
    <div className={`flex flex-col gap-3 ${align === 'right' ? 'md:items-end' : 'md:items-start'}`}>
      <div className={`flex flex-col items-center w-full ${align === 'right' ? 'md:items-end md:text-right' : 'md:items-start md:text-left'}`}>
        {coach && (
          <div className="mb-2">
            <CoachCard coach={coach} accent={accent} size="lg" />
          </div>
        )}
        <div className="font-serif text-2xl font-bold" style={{ color: accent }}>{name}</div>
        <div className="text-muted text-[13px] mt-1">💰 {budget} restant{budget > 1 ? 's' : ''}</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2.5 w-full">
        {team.map((it) => (
          <div
            key={it.id}
            className="card-enter bg-surface border rounded-lg p-2.5 flex flex-col items-center gap-1.5 text-center"
            style={{ borderColor: accent + '55' }}
          >
            {it.image_url ? (
              <img src={it.image_url} className="w-full h-16 object-cover rounded-md" alt="" />
            ) : (
              <div className="w-full h-16 rounded-md bg-surface2 flex items-center justify-center text-lg">🎴</div>
            )}
            <div className="text-[12px] font-medium leading-tight">{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

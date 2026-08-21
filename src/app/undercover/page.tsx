'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { fetchListItemMeta, pickRandom, shuffle } from '@/lib/utils';

type Role = 'civil' | 'undercover' | 'mrwhite';

interface Player {
  id: number;
  name: string;
  role: Role;
  alive: boolean;
  seen: boolean;
}

type Phase = 'setup' | 'reveal' | 'game' | 'end';

export default function UndercoverPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');

  const [playerCount, setPlayerCount] = useState(5);
  const [playerNames, setPlayerNames] = useState<string[]>(Array.from({ length: 5 }, (_, i) => `Joueur ${i + 1}`));
  const [undercoverCount, setUndercoverCount] = useState(1);
  const [mrWhiteEnabled, setMrWhiteEnabled] = useState(false);

  const [phase, setPhase] = useState<Phase>('setup');
  const [civilWord, setCivilWord] = useState<ListItem | null>(null);
  const [undercoverWord, setUndercoverWord] = useState<ListItem | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);
  const [firstPlayer, setFirstPlayer] = useState<Player | null>(null);

  const [eliminationTarget, setEliminationTarget] = useState<Player | null>(null);
  const [mrWhiteGuessOpen, setMrWhiteGuessOpen] = useState(false);
  const [mrWhiteGuess, setMrWhiteGuess] = useState('');
  const [winner, setWinner] = useState<null | 'civils' | 'undercovers' | 'mrwhite'>(null);
  const [lastReveal, setLastReveal] = useState<{ name: string; role: Role } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      const { counts } = await fetchListItemMeta();
      const withEnough = ((data as GameList[]) || []).filter((l) => (counts.get(l.id) || 0) >= 2);
      setLists(withEnough);
      if (withEnough.length > 0) setListId(withEnough[0].id);
    })();
  }, []);

  function setCount(n: number) {
    const clamped = Math.max(3, Math.min(20, n));
    setPlayerCount(clamped);
    setPlayerNames((prev) => {
      const next = [...prev];
      while (next.length < clamped) next.push(`Joueur ${next.length + 1}`);
      return next.slice(0, clamped);
    });
    if (clamped < 5) setMrWhiteEnabled(false);
  }

  const civilCount = playerCount - undercoverCount - (mrWhiteEnabled ? 1 : 0);
  const maxUndercover = Math.max(1, Math.floor((playerCount - (mrWhiteEnabled ? 1 : 0)) / 2));

  async function startGame() {
    if (!listId) return;
    if (civilCount < 1) {
      alert('Il faut au moins 1 civil. Réduis le nombre d\'undercover ou désactive Mister White.');
      return;
    }
    const { data: items } = await supabase.from('items').select('*').eq('list_id', listId);
    if (!items || items.length < 2) {
      alert('Il faut au moins 2 items dans cette base.');
      return;
    }
    const [wordA, wordB] = pickRandom(items as ListItem[], 2);
    setCivilWord(wordA);
    setUndercoverWord(wordB);

    const roles: Role[] = [
      ...Array(civilCount).fill('civil'),
      ...Array(undercoverCount).fill('undercover'),
      ...(mrWhiteEnabled ? (['mrwhite'] as Role[]) : []),
    ];
    const shuffledRoles = shuffle(roles);
    const newPlayers: Player[] = playerNames.map((name, i) => ({
      id: i,
      name: name.trim() || `Joueur ${i + 1}`,
      role: shuffledRoles[i],
      alive: true,
      seen: false,
    }));

    setPlayers(newPlayers);
    setActivePlayerId(null);

    // Tirer au sort le premier joueur (hors Mister White de préférence s'il y a d'autres joueurs)
    const validFirstCandidates = newPlayers.filter((p) => p.role !== 'mrwhite');
    const candidates = validFirstCandidates.length > 0 ? validFirstCandidates : newPlayers;
    const randomStarter = candidates[Math.floor(Math.random() * candidates.length)];
    setFirstPlayer(randomStarter);

    setWinner(null);
    setPhase('reveal');
  }

  function toggleCard(p: Player) {
    if (p.seen) return;
    if (activePlayerId === p.id) {
      // Masquer et valider la vue
      setPlayers((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, seen: true } : item))
      );
      setActivePlayerId(null);
    } else if (activePlayerId === null) {
      // Révéler la carte
      setActivePlayerId(p.id);
    }
  }

  const seenCount = players.filter((p) => p.seen).length;
  const allSeen = players.length > 0 && seenCount === players.length;

  function checkWinner(currentPlayers: Player[]) {
    const aliveCivils = currentPlayers.filter((p) => p.alive && p.role === 'civil').length;
    const aliveThreats = currentPlayers.filter((p) => p.alive && (p.role === 'undercover' || p.role === 'mrwhite')).length;
    if (aliveThreats === 0) return 'civils';
    if (aliveThreats >= aliveCivils) return 'undercovers';
    return null;
  }

  function eliminate(player: Player) {
    setEliminationTarget(player);
  }

  function confirmElimination() {
    if (!eliminationTarget) return;
    const next = players.map((p) => (p.id === eliminationTarget.id ? { ...p, alive: false } : p));
    setPlayers(next);
    setLastReveal({ name: eliminationTarget.name, role: eliminationTarget.role });
    setEliminationTarget(null);

    if (eliminationTarget.role === 'mrwhite') {
      setMrWhiteGuessOpen(true);
      return;
    }
    const w = checkWinner(next);
    if (w) {
      setWinner(w as any);
      setPhase('end');
    }
  }

  function submitMrWhiteGuess() {
    const correct = mrWhiteGuess.trim().toLowerCase() === (civilWord?.name || '').trim().toLowerCase();
    setMrWhiteGuessOpen(false);
    setMrWhiteGuess('');
    if (correct) {
      setWinner('mrwhite');
      setPhase('end');
      return;
    }
    const w = checkWinner(players);
    if (w) {
      setWinner(w as any);
      setPhase('end');
    }
  }

  function resetAll() {
    setPhase('setup');
    setPlayers([]);
    setActivePlayerId(null);
    setFirstPlayer(null);
    setCivilWord(null);
    setUndercoverWord(null);
    setWinner(null);
    setLastReveal(null);
  }

  // ================= SETUP =================
  if (phase === 'setup') {
    return (
      <div>
        <div className="mb-7">
          <div className="eyebrow">Mode</div>
          <h1 className="font-serif text-3xl">Undercover</h1>
          <p className="text-muted mt-2 text-[14.5px] max-w-xl">
            Deux mots proches sont tirés d'une base : la majorité (civils) a le même mot, la minorité (undercover) a l'autre. Mister White n'a rien.
          </p>
        </div>

        {lists.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">Crée d'abord une base d'au moins 2 items dans "Mes bases".</p>
        ) : (
          <div className="panel flex flex-col gap-5 max-w-2xl">
            <div>
              <label className="text-[12.5px] text-muted block mb-1.5">Base de mots / images</label>
              <select className="input" value={listId} onChange={(e) => setListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12.5px] text-muted block mb-1.5">Nombre de joueurs</label>
              <div className="flex items-center gap-3">
                <button className="btn-secondary btn-small" onClick={() => setCount(playerCount - 1)}>−</button>
                <span className="font-serif text-xl w-8 text-center">{playerCount}</span>
                <button className="btn-secondary btn-small" onClick={() => setCount(playerCount + 1)}>+</button>
              </div>
            </div>

            <div>
              <label className="text-[12.5px] text-muted block mb-1.5">Noms des joueurs</label>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                {playerNames.map((name, i) => (
                  <input
                    key={i}
                    className="input"
                    value={name}
                    onChange={(e) => {
                      const next = [...playerNames];
                      next[i] = e.target.value;
                      setPlayerNames(next);
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-8 flex-wrap items-end">
              <div>
                <label className="text-[12.5px] text-muted block mb-1.5">Nombre d'undercover</label>
                <div className="flex items-center gap-3">
                  <button className="btn-secondary btn-small" onClick={() => setUndercoverCount(Math.max(1, undercoverCount - 1))}>−</button>
                  <span className="font-serif text-xl w-6 text-center">{undercoverCount}</span>
                  <button className="btn-secondary btn-small" onClick={() => setUndercoverCount(Math.min(maxUndercover, undercoverCount + 1))}>+</button>
                </div>
              </div>

              {playerCount >= 5 && (
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer pb-2">
                  <input type="checkbox" checked={mrWhiteEnabled} onChange={(e) => setMrWhiteEnabled(e.target.checked)} />
                  Activer Mister White
                </label>
              )}

              <div className="text-[13px] text-muted pb-2">
                → <b className="text-amber">{civilCount}</b> civil{civilCount > 1 ? 's' : ''}
              </div>
            </div>

            <button className="btn w-fit" onClick={startGame}>▶ Distribuer les cartes</button>
          </div>
        )}
      </div>
    );
  }

  // ================= REVEAL (Interactive Grid) =================
  if (phase === 'reveal') {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[75vh] gap-6 text-center py-6">
        <div className="text-amber font-bold text-xs tracking-widest uppercase">
          DISTRIBUTION
        </div>

        <div>
          <h1 className="text-3xl font-black text-white">Chacun tape sa carte</h1>
          <p className="text-muted text-sm mt-1">Ne montre pas ton mot aux autres !</p>
        </div>

        {/* Grille des cartes */}
        <div className="flex flex-wrap justify-center gap-4 max-w-3xl my-4">
          {players.map((p) => {
            const isBeingViewed = activePlayerId === p.id;
            const word = p.role === 'civil' ? civilWord : p.role === 'undercover' ? undercoverWord : null;

            if (p.seen) {
              // Carte déjà vue (Cochée)
              return (
                <div
                  key={p.id}
                  className="w-36 h-48 sm:w-40 sm:h-52 bg-[#12141f] border border-[#1d2133] rounded-2xl flex flex-col items-center justify-center text-slate-600 select-none opacity-60"
                >
                  <span className="text-3xl font-bold">✓</span>
                </div>
              );
            }

            if (isBeingViewed) {
              // Carte retournée (Révélée)
              return (
                <div
                  key={p.id}
                  className="w-36 h-48 sm:w-40 sm:h-52 bg-[#171a29] border-2 border-amber shadow-[0_0_20px_rgba(245,158,11,0.25)] rounded-2xl flex flex-col justify-between overflow-hidden p-2.5 transition-all"
                >
                  <div className="text-amber font-bold text-xs pt-1 truncate w-full">
                    {p.name}
                  </div>

                  <div className="flex flex-col items-center gap-1.5 my-auto px-1">
                    <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                      {p.role === 'civil' ? 'CIVIL' : p.role === 'undercover' ? 'UNDERCOVER' : 'MR. WHITE'}
                    </span>
                    {word ? (
                      <>
                        {word.image_url && (
                          <img src={word.image_url} className="w-full max-h-20 object-contain rounded-md" alt="" />
                        )}
                        <span className="text-white font-black text-sm sm:text-base leading-tight break-words max-w-full">
                          {word.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-300 text-xs italic">Tu n'as pas de mot</span>
                    )}
                  </div>

                  <button
                    onClick={() => toggleCard(p)}
                    className="w-full bg-[#202538] hover:bg-[#2a314a] text-amber font-bold text-xs py-1.5 rounded-lg border border-amber/30 transition"
                  >
                    J'ai vu ✓
                  </button>
                </div>
              );
            }

            // Carte masquée (Tap pour voir / En attente...)
            return (
              <div
                key={p.id}
                onClick={() => toggleCard(p)}
                className={`w-36 h-48 sm:w-40 sm:h-52 rounded-2xl border flex flex-col items-center justify-center p-3 gap-2 cursor-pointer transition-all ${
                  activePlayerId !== null
                    ? 'bg-[#12141f] border-[#1e2235] opacity-40 cursor-not-allowed'
                    : 'bg-[#171a2b] border-[#252a42] hover:border-amber/60 hover:bg-[#1d2138]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#252a42] flex items-center justify-center text-amber font-extrabold text-sm">
                  ?
                </div>
                <span className="text-amber font-semibold text-xs mt-1">
                  {activePlayerId !== null ? 'En attente...' : 'Tap pour voir'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Compteur de cartes vues */}
        <div className="text-muted text-xs font-medium">
          {seenCount} / {players.length} cartes vues
        </div>

        {/* Carte du premier joueur désigné une fois toutes les cartes vues */}
        {allSeen && firstPlayer && (
          <div className="flex flex-col items-center gap-4 mt-4 animate-fade-in">
            <div className="bg-[#171a2b] border border-amber/70 rounded-2xl p-5 text-center min-w-[260px] shadow-lg">
              <span className="text-muted text-xs block mb-1 font-semibold">C'est</span>
              <span className="text-amber font-black text-2xl block mb-1">{firstPlayer.name}</span>
              <span className="text-slate-300 text-xs">qui commence à décrire son mot !</span>
            </div>

            <button
              className="bg-amber hover:brightness-105 active:scale-95 text-[#101118] font-bold text-sm px-8 py-3.5 rounded-xl shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition"
              onClick={() => setPhase('game')}
            >
              Commencer la partie →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ================= GAME (elimination rounds) =================
  if (phase === 'game') {
    const alive = players.filter((p) => p.alive);
    return (
      <div className="max-w-4xl mx-auto py-4">
        <div className="mb-6">
          <div className="eyebrow">MANCHE EN COURS</div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">Discutez, puis éliminez un joueur</h1>
          <p className="text-muted mt-2 text-sm">Cliquez sur un joueur pour l'éliminer et révéler son rôle (pas son mot).</p>
        </div>

        {lastReveal && (
          <div className="bg-[#151824] border border-amber/40 rounded-xl p-4 mb-6 text-sm">
            <b>{lastReveal.name}</b> était :{' '}
            <span className="text-amber font-bold">
              {lastReveal.role === 'civil' ? 'Civil' : lastReveal.role === 'undercover' ? 'Undercover' : 'Mister White'}
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-6">
          {players.map((p) => (
            <div
              key={p.id}
              onClick={() => p.alive && eliminate(p)}
              className={`min-w-[130px] flex-1 sm:flex-none border rounded-xl p-4 text-center transition ${
                p.alive
                  ? 'bg-[#151824] border-[#232738] cursor-pointer hover:border-red-500/60 hover:bg-[#1a1d2d]'
                  : 'bg-[#11131c] border-[#1b1e2b] opacity-35 cursor-not-allowed'
              }`}
            >
              <div className="font-semibold text-base text-white">{p.name}</div>
              {!p.alive && (
                <div className="text-[11px] text-muted mt-1 font-medium">
                  {p.role === 'civil' ? 'Civil' : p.role === 'undercover' ? 'Undercover' : 'Mister White'}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-muted text-xs mt-6">{alive.length} joueurs en jeu.</div>

        {eliminationTarget && (
          <Modal onClose={() => setEliminationTarget(null)}>
            <p className="mb-5 text-sm">Éliminer <b className="text-amber">{eliminationTarget.name}</b> et révéler son rôle ?</p>
            <div className="flex gap-3 justify-end">
              <button className="btn-danger" onClick={confirmElimination}>Confirmer</button>
              <button className="btn-ghost" onClick={() => setEliminationTarget(null)}>Annuler</button>
            </div>
          </Modal>
        )}

        {mrWhiteGuessOpen && (
          <Modal onClose={() => setMrWhiteGuessOpen(false)}>
            <p className="mb-3 text-sm">Mister White a été éliminé. Veut-il tenter de deviner le mot des civils ?</p>
            <input className="input mb-4" value={mrWhiteGuess} onChange={(e) => setMrWhiteGuess(e.target.value)} placeholder="Sa proposition..." />
            <div className="flex gap-3 justify-end">
              <button className="btn" onClick={submitMrWhiteGuess}>Valider</button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setMrWhiteGuessOpen(false);
                  const w = checkWinner(players);
                  if (w) {
                    setWinner(w as any);
                    setPhase('end');
                  }
                }}
              >
                Il passe
              </button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ================= END =================
  return (
    <div className="flex flex-col items-center justify-center gap-6 min-h-[70vh] text-center max-w-xl mx-auto">
      <div className="eyebrow">Partie terminée</div>
      <h1 className="text-2xl md:text-3xl font-bold text-white">
        {winner === 'civils' && 'Les civils gagnent 🎉'}
        {winner === 'undercovers' && 'Les undercover gagnent 🕵️'}
        {winner === 'mrwhite' && 'Mister White gagne en devinant le mot ! 🤍'}
      </h1>
      <p className="text-muted text-sm leading-relaxed">
        Le mot civil était <b className="text-amber">{civilWord?.name}</b>, le mot undercover était{' '}
        <b className="text-amber">{undercoverWord?.name}</b>.
      </p>
      <button className="btn mt-2" onClick={resetAll}>↺ Nouvelle partie</button>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#141622] border border-[#232738] rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
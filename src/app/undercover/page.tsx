'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { pickRandom, shuffle } from '@/lib/utils';

type Role = 'civil' | 'undercover' | 'mrwhite';

interface Player {
  name: string;
  role: Role;
  alive: boolean;
  eliminatedRoleShown?: boolean;
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
  const [revealIdx, setRevealIdx] = useState(0);
  const [cardShown, setCardShown] = useState(false);

  const [eliminationTarget, setEliminationTarget] = useState<Player | null>(null);
  const [mrWhiteGuessOpen, setMrWhiteGuessOpen] = useState(false);
  const [mrWhiteGuess, setMrWhiteGuess] = useState('');
  const [winner, setWinner] = useState<null | 'civils' | 'undercovers' | 'mrwhite'>(null);
  const [lastReveal, setLastReveal] = useState<{ name: string; role: Role } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      const withEnough: GameList[] = [];
      if (data) {
        for (const l of data as GameList[]) {
          const { count } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('list_id', l.id);
          if (count && count >= 2) withEnough.push(l);
        }
      }
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
  const maxUndercover = Math.max(1, Math.floor((playerCount - (mrWhiteEnabled ? 1 : 0)) / 2) - (playerCount <= 3 ? 0 : 0));

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
      name: name.trim() || `Joueur ${i + 1}`,
      role: shuffledRoles[i],
      alive: true,
    }));
    setPlayers(newPlayers);
    setRevealIdx(0);
    setCardShown(false);
    setWinner(null);
    setPhase('reveal');
  }

  function nextReveal() {
    setCardShown(false);
    if (revealIdx + 1 >= players.length) {
      setPhase('game');
    } else {
      setRevealIdx(revealIdx + 1);
    }
  }

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
    const next = players.map((p) => (p.name === eliminationTarget.name ? { ...p, alive: false } : p));
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
          <div className="panel flex flex-col gap-5">
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

  // ================= REVEAL (pass & play) =================
  if (phase === 'reveal') {
    const p = players[revealIdx];
    const word = p.role === 'civil' ? civilWord : p.role === 'undercover' ? undercoverWord : null;
    return (
      <div className="flex flex-col items-center gap-6 mt-10">
        <div className="eyebrow">Distribution — {revealIdx + 1} / {players.length}</div>
        <h1 className="font-serif text-2xl text-center">
          Passe l'appareil à <span className="text-amber">{p.name}</span>
        </h1>

        {!cardShown ? (
          <button className="btn" onClick={() => setCardShown(true)}>🎴 Révéler ma carte</button>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="w-[260px] min-h-[220px] bg-gradient-to-br from-surface2 to-surface border border-amberDim rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-4">
              {word ? (
                <>
                  {word.image_url && <img src={word.image_url} className="w-full max-h-[160px] object-contain rounded-lg" alt="" />}
                  <div className="font-serif text-xl font-semibold">{word.name}</div>
                </>
              ) : (
                <div className="text-muted text-sm">
                  Carte vide — tu es <b className="text-amber">Mister White</b>.<br />Improvise !
                </div>
              )}
            </div>
            <button className="btn-secondary" onClick={nextReveal}>
              J'ai vu — carte suivante →
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
      <div>
        <div className="mb-7">
          <div className="eyebrow">Manche en cours</div>
          <h1 className="font-serif text-3xl">Discutez, puis éliminez un joueur</h1>
          <p className="text-muted mt-2 text-[14.5px]">Cliquez sur un joueur pour l'éliminer et révéler son rôle (pas son mot).</p>
        </div>

        {lastReveal && (
          <div className="panel py-4 border-amberDim">
            <b>{lastReveal.name}</b> était :{' '}
            <span className="text-amber">
              {lastReveal.role === 'civil' ? 'Civil' : lastReveal.role === 'undercover' ? 'Undercover' : 'Mister White'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 mt-6">
          {players.map((p) => (
            <div
              key={p.name}
              onClick={() => p.alive && eliminate(p)}
              className={`border rounded-card p-4 text-center transition ${
                p.alive
                  ? 'bg-surface border-border cursor-pointer hover:border-red'
                  : 'bg-surface2 border-border opacity-40'
              }`}
            >
              <div className="font-serif text-lg">{p.name}</div>
              {!p.alive && (
                <div className="text-[11px] text-muted mt-1">
                  {p.role === 'civil' ? 'Civil' : p.role === 'undercover' ? 'Undercover' : 'Mister White'}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-muted text-[13px] mt-6">{alive.length} joueur{alive.length > 1 ? 's' : ''} en jeu.</div>

        {eliminationTarget && (
          <Modal onClose={() => setEliminationTarget(null)}>
            <p className="mb-4">Éliminer <b className="text-amber">{eliminationTarget.name}</b> et révéler son rôle ?</p>
            <div className="flex gap-3">
              <button className="btn-danger" onClick={confirmElimination}>Confirmer</button>
              <button className="btn-ghost" onClick={() => setEliminationTarget(null)}>Annuler</button>
            </div>
          </Modal>
        )}

        {mrWhiteGuessOpen && (
          <Modal onClose={() => setMrWhiteGuessOpen(false)}>
            <p className="mb-3">Mister White a été éliminé. Veut-il tenter de deviner le mot des civils ?</p>
            <input className="input mb-3" value={mrWhiteGuess} onChange={(e) => setMrWhiteGuess(e.target.value)} placeholder="Sa proposition..." />
            <div className="flex gap-3">
              <button className="btn" onClick={submitMrWhiteGuess}>Valider la proposition</button>
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
    <div className="flex flex-col items-center gap-6 mt-16 text-center">
      <div className="eyebrow">Partie terminée</div>
      <h1 className="font-serif text-3xl">
        {winner === 'civils' && 'Les civils gagnent 🎉'}
        {winner === 'undercovers' && 'Les undercover gagnent 🕵️'}
        {winner === 'mrwhite' && 'Mister White gagne en devinant le mot ! 🤍'}
      </h1>
      <p className="text-muted">
        Le mot civil était <b className="text-amber">{civilWord?.name}</b>, le mot undercover était{' '}
        <b className="text-amber">{undercoverWord?.name}</b>.
      </p>
      <button className="btn" onClick={resetAll}>↺ Nouvelle partie</button>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-border rounded-card p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

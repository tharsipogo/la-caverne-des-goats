'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { fetchListItemMeta, pickRandom, rotateRandomStart, shuffle } from '@/lib/utils';

type Role = 'civil' | 'undercover';
type Phase = 'setup' | 'reveal' | 'draw' | 'elim' | 'end';

interface Player {
  id: number;
  name: string;
  role: Role;
  alive: boolean;
  seen: boolean;
}

const CANVAS_W = 640;
const CANVAS_H = 400;

export default function UndercoverArtistPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');

  const [playerCount, setPlayerCount] = useState(5);
  const [playerNames, setPlayerNames] = useState<string[]>(Array.from({ length: 5 }, (_, i) => `Joueur ${i + 1}`));
  const [undercoverCount, setUndercoverCount] = useState(1);

  const [phase, setPhase] = useState<Phase>('setup');
  const [word, setWord] = useState<ListItem | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);
  const [firstPlayer, setFirstPlayer] = useState<Player | null>(null);

  // drawing round
  const [drawQueue, setDrawQueue] = useState<Player[]>([]);
  const [drawIdx, setDrawIdx] = useState(0);
  const [drawerReady, setDrawerReady] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [turnInRound, setTurnInRound] = useState(1); // 1er ou 2ème tour de la manche

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const canvasInitRef = useRef(false);

  // elimination
  const [eliminationTarget, setEliminationTarget] = useState<Player | null>(null);
  const [winner, setWinner] = useState<null | 'civils' | 'undercover'>(null);
  const [lastReveal, setLastReveal] = useState<{ name: string; role: Role } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      const { counts } = await fetchListItemMeta();
      const withEnough = ((data as GameList[]) || []).filter((l) => (counts.get(l.id) || 0) >= 1);
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
  }

  const civilCount = playerCount - undercoverCount;
  const maxUndercover = Math.max(1, Math.floor(playerCount / 2));

  async function startGame() {
    if (!listId) return;
    if (civilCount < 1) {
      alert("Il faut au moins 1 civil. Réduis le nombre d'undercover.");
      return;
    }
    const { data: items } = await supabase.from('items').select('*').eq('list_id', listId);
    if (!items || items.length < 1) {
      alert('Il faut au moins 1 item dans cette base.');
      return;
    }
    const [chosenWord] = pickRandom(items as ListItem[], 1);
    setWord(chosenWord);

    const roles: Role[] = [...Array(civilCount).fill('civil'), ...Array(undercoverCount).fill('undercover')];
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

    const randomStarter = newPlayers[Math.floor(Math.random() * newPlayers.length)];
    setFirstPlayer(randomStarter);

    setWinner(null);
    setLastReveal(null);
    canvasInitRef.current = false;
    setRoundNumber(1);
    setTurnInRound(1);
    setPhase('reveal');
  }

  function toggleCard(p: Player) {
    if (p.seen) return;
    if (activePlayerId === p.id) {
      setPlayers((prev) => prev.map((item) => (item.id === p.id ? { ...item, seen: true } : item)));
      setActivePlayerId(null);
    } else if (activePlayerId === null) {
      setActivePlayerId(p.id);
    }
  }

  const seenCount = players.filter((p) => p.seen).length;
  const allSeen = players.length > 0 && seenCount === players.length;

  function startDrawingPhase() {
    if (!firstPlayer) return;
    const queue = rotateRandomStart(
      players.filter((p) => p.alive),
      (p) => p.id !== firstPlayer.id
    );
    setDrawQueue(queue);
    setDrawIdx(0);
    setDrawerReady(false);
    setTurnInRound(1);
    setPhase('draw');
  }

  function ensureCanvasInit() {
    if (canvasInitRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1c1e26';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    canvasInitRef.current = true;
  }

  useEffect(() => {
    if (phase === 'draw' || phase === 'elim' || phase === 'end') {
      ensureCanvasInit();
    }
  }, [phase]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawerReady) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    canvas.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    ctx.strokeStyle = '#f2f0e8';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawingRef.current = true;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endStroke() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setDrawerReady(false);

    if (drawIdx + 1 >= drawQueue.length) {
      if (turnInRound === 1) {
        // Deuxième tour de la même manche avant élimination
        setTurnInRound(2);
        setDrawIdx(0);
      } else {
        // Les 2 tours sont terminés, on passe au vote d'élimination
        setPhase('elim');
      }
    } else {
      setDrawIdx(drawIdx + 1);
    }
  }

  function checkWinner(currentPlayers: Player[]) {
    const aliveCivils = currentPlayers.filter((p) => p.alive && p.role === 'civil').length;
    const aliveUndercover = currentPlayers.filter((p) => p.alive && p.role === 'undercover').length;
    if (aliveUndercover === 0) return 'civils';
    if (aliveUndercover >= aliveCivils) return 'undercover';
    return null;
  }

  function confirmElimination() {
    if (!eliminationTarget) return;
    const next = players.map((p) => (p.id === eliminationTarget.id ? { ...p, alive: false } : p));
    setPlayers(next);
    setLastReveal({ name: eliminationTarget.name, role: eliminationTarget.role });
    setEliminationTarget(null);

    const w = checkWinner(next);
    if (w) {
      setWinner(w as any);
      setPhase('end');
      return;
    }

    const queue = rotateRandomStart(next.filter((p) => p.alive));
    setDrawQueue(queue);
    setDrawIdx(0);
    setDrawerReady(false);
    setTurnInRound(1);
    setRoundNumber((r) => r + 1);
    setPhase('draw');
  }

  function resetAll() {
    setPhase('setup');
    setPlayers([]);
    setActivePlayerId(null);
    setFirstPlayer(null);
    setWord(null);
    setWinner(null);
    setLastReveal(null);
    canvasInitRef.current = false;
  }

  const CanvasBoard = (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerLeave={endStroke}
      className={`w-full max-w-[640px] aspect-[8/5] rounded-xl border ${
        drawerReady ? 'border-amber cursor-crosshair' : 'border-border'
      } bg-surface2 touch-none`}
    />
  );

  // ================= SETUP =================
  if (phase === 'setup') {
    return (
      <div>
        <div className="mb-7">
          <div className="eyebrow">Mode</div>
          <h1 className="font-serif text-3xl">Undercover Artist</h1>
          <p className="text-muted mt-2 text-[14.5px] max-w-xl">
            Les civils connaissent tous le même mot, l'undercover n'a rien. Chacun ajoute un trait continu sur un dessin
            commun en 2 tours, puis on élimine un joueur.
          </p>
        </div>

        {lists.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">Crée d'abord une base d'au moins 1 item dans "Mes bases".</p>
        ) : (
          <div className="panel flex flex-col gap-5 max-w-2xl">
            <div>
              <label className="text-[12.5px] text-muted block mb-1.5">Base de mots</label>
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

  // ================= REVEAL =================
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

        <div className="flex flex-wrap justify-center gap-4 max-w-3xl my-4">
          {players.map((p) => {
            const isBeingViewed = activePlayerId === p.id;
            const isCivil = p.role === 'civil';

            if (p.seen) {
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
                      {isCivil ? 'CIVIL' : 'UNDERCOVER'}
                    </span>
                    {isCivil && word ? (
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

        <div className="text-muted text-xs font-medium">
          {seenCount} / {players.length} cartes vues
        </div>

        {allSeen && firstPlayer && (
          <div className="flex flex-col items-center gap-4 mt-4 animate-fade-in">
            <div className="bg-[#171a2b] border border-amber/70 rounded-2xl p-5 text-center min-w-[260px] shadow-lg">
              <span className="text-muted text-xs block mb-1 font-semibold">C'est</span>
              <span className="text-amber font-black text-2xl block mb-1">{firstPlayer.name}</span>
              <span className="text-slate-300 text-xs">qui commence à dessiner son trait !</span>
            </div>

            <button
              className="bg-amber hover:brightness-105 active:scale-95 text-[#101118] font-bold text-sm px-8 py-3.5 rounded-xl shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition"
              onClick={startDrawingPhase}
            >
              Commencer le dessin →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ================= DRAW =================
  if (phase === 'draw') {
    const drawer = drawQueue[drawIdx];
    return (
      <div>
        <div className="mb-6">
          <div className="eyebrow">Manche {roundNumber} — Tour {turnInRound}/2 — Dessin {drawIdx + 1} / {drawQueue.length}</div>
          <h1 className="font-serif text-3xl">
            {drawerReady ? (
              <>Dessine, <span className="text-amber">{drawer.name}</span> !</>
            ) : (
              <>Au tour de <span className="text-amber">{drawer.name}</span> (Tour {turnInRound})</>
            )}
          </h1>
          <p className="text-muted mt-2 text-[14.5px]">
            {drawerReady
              ? "Un seul trait continu : dès que tu relâches, c'est au joueur suivant."
              : "Passe l'appareil, puis clique pour commencer ton trait."}
          </p>
        </div>

        <div className="flex justify-center">{CanvasBoard}</div>

        {!drawerReady && (
          <div className="flex justify-center mt-5">
            <button className="btn" onClick={() => setDrawerReady(true)}>✏️ Je suis prêt(e), commencer mon trait</button>
          </div>
        )}
      </div>
    );
  }

  // ================= ELIM =================
  if (phase === 'elim') {
    const alive = players.filter((p) => p.alive);
    return (
      <div>
        <div className="mb-6">
          <div className="eyebrow">Manche {roundNumber} — discussion après 2 tours de dessin</div>
          <h1 className="font-serif text-3xl">Regardez le dessin, puis éliminez un joueur</h1>
        </div>

        <div className="flex justify-center mb-6">{CanvasBoard}</div>

        {lastReveal && (
          <div className="panel py-4 border-amberDim">
            <b>{lastReveal.name}</b> était :{' '}
            <span className="text-amber">{lastReveal.role === 'civil' ? 'Civil' : 'Undercover'}</span>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 mt-6">
          {players.map((p) => (
            <div
              key={p.id}
              onClick={() => p.alive && setEliminationTarget(p)}
              className={`border rounded-card p-4 text-center transition ${
                p.alive ? 'bg-surface border-border cursor-pointer hover:border-red' : 'bg-surface2 border-border opacity-40'
              }`}
            >
              <div className="font-serif text-lg">{p.name}</div>
              {!p.alive && <div className="text-[11px] text-muted mt-1">{p.role === 'civil' ? 'Civil' : 'Undercover'}</div>}
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
      </div>
    );
  }

  // ================= END =================
  return (
    <div className="flex flex-col items-center gap-6 mt-10 text-center">
      <div className="eyebrow">Partie terminée</div>
      <h1 className="font-serif text-3xl">
        {winner === 'civils' ? 'Les civils gagnent 🎉' : "L'undercover gagne 🕵️"}
      </h1>
      <p className="text-muted">
        Le mot était <b className="text-amber">{word?.name}</b>.
      </p>
      <div className="flex justify-center">{CanvasBoard}</div>
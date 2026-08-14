'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { pickRandom, shuffle } from '@/lib/utils';

type Role = 'civil' | 'undercover';
type Phase = 'setup' | 'reveal' | 'draw' | 'elim' | 'end';

interface Player {
  name: string;
  role: Role;
  alive: boolean;
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

  // reveal (pass & play)
  const [revealIdx, setRevealIdx] = useState(0);
  const [cardShown, setCardShown] = useState(false);

  // drawing round
  const [drawQueue, setDrawQueue] = useState<Player[]>([]);
  const [drawIdx, setDrawIdx] = useState(0);
  const [drawerReady, setDrawerReady] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);

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
      const withEnough: GameList[] = [];
      if (data) {
        for (const l of data as GameList[]) {
          const { count } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('list_id', l.id);
          if (count && count >= 1) withEnough.push(l);
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
      name: name.trim() || `Joueur ${i + 1}`,
      role: shuffledRoles[i],
      alive: true,
    }));
    setPlayers(newPlayers);
    setRevealIdx(0);
    setCardShown(false);
    setWinner(null);
    setLastReveal(null);
    canvasInitRef.current = false;
    setRoundNumber(1);
    setPhase('reveal');
  }

  function nextReveal() {
    setCardShown(false);
    if (revealIdx + 1 >= players.length) {
      const queue = players.filter((p) => p.alive);
      setDrawQueue(queue);
      setDrawIdx(0);
      setDrawerReady(false);
      setPhase('draw');
    } else {
      setRevealIdx(revealIdx + 1);
    }
  }

  // ---- Canvas init (une seule fois, le buffer persiste ensuite entre les manches) ----
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
      // manche de dessin terminée -> passage à l'élimination
      setPhase('elim');
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
    const next = players.map((p) => (p.name === eliminationTarget.name ? { ...p, alive: false } : p));
    setPlayers(next);
    setLastReveal({ name: eliminationTarget.name, role: eliminationTarget.role });
    setEliminationTarget(null);

    const w = checkWinner(next);
    if (w) {
      setWinner(w as any);
      setPhase('end');
      return;
    }
    // manche suivante : les joueurs encore en vie redessinent, un trait chacun
    const queue = next.filter((p) => p.alive);
    setDrawQueue(queue);
    setDrawIdx(0);
    setDrawerReady(false);
    setRoundNumber((r) => r + 1);
    setPhase('draw');
  }

  function resetAll() {
    setPhase('setup');
    setPlayers([]);
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
            commun (le trait s'arrête dès qu'on relâche), puis on élimine un joueur.
          </p>
        </div>

        {lists.length === 0 ? (
          <p className="text-muted text-sm py-8 text-center">Crée d'abord une base d'au moins 1 item dans "Mes bases".</p>
        ) : (
          <div className="panel flex flex-col gap-5">
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

  // ================= REVEAL (pass & play) =================
  if (phase === 'reveal') {
    const p = players[revealIdx];
    const hasWord = p.role === 'civil';
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
            <div className="w-[260px] min-h-[180px] bg-gradient-to-br from-surface2 to-surface border border-amberDim rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-4">
              {hasWord ? (
                <div className="font-serif text-xl font-semibold">{word?.name}</div>
              ) : (
                <div className="text-muted text-sm">
                  Carte vide — tu es <b className="text-amber">Undercover</b>.<br />Dessine comme si tu savais !
                </div>
              )}
            </div>
            <button className="btn-secondary" onClick={nextReveal}>J'ai vu — carte suivante →</button>
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
          <div className="eyebrow">Manche {roundNumber} — dessin {drawIdx + 1} / {drawQueue.length}</div>
          <h1 className="font-serif text-3xl">
            {drawerReady ? (
              <>Dessine, <span className="text-amber">{drawer.name}</span> !</>
            ) : (
              <>Au tour de <span className="text-amber">{drawer.name}</span></>
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
          <div className="eyebrow">Manche {roundNumber} — discussion</div>
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
              key={p.name}
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

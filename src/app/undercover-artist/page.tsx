'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { fetchListItemMeta, pickRandom, shuffle } from '@/lib/utils';

type GameMode = 'menu' | 'local' | 'online';
type Role = 'civil' | 'undercover';
type Phase = 'setup' | 'reveal' | 'draw' | 'elim' | 'undercover_guess' | 'end' | 'waiting';

interface Player {
  id: number;
  name: string;
  role: Role;
  alive: boolean;
  seen: boolean;
  userId?: string;
}

const CANVAS_W = 640;
const CANVAS_H = 400;

export default function UndercoverArtistPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');

  // Mode de jeu & Réseau
  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [myUserId] = useState(() => Math.random().toString(36).substring(2, 9));
  const channelRef = useRef<any>(null);

  // Configuration
  const [playerCount, setPlayerCount] = useState(5);
  const [playerNames, setPlayerNames] = useState<string[]>(Array.from({ length: 5 }, (_, i) => `Joueur ${i + 1}`));
  const [undercoverCount, setUndercoverCount] = useState(1);

  // État du jeu
  const [phase, setPhase] = useState<Phase>('setup');
  const [word, setWord] = useState<ListItem | null>(null);
  const [mySecretWord, setMySecretWord] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<Role>('civil');
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);
  const [firstPlayer, setFirstPlayer] = useState<Player | null>(null);

  // Phase de dessin & Tours
  const [drawQueue, setDrawQueue] = useState<Player[]>([]);
  const [drawIdx, setDrawIdx] = useState(0);
  const [drawerReady, setDrawerReady] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [turnInRound, setTurnInRound] = useState(1);

  // Canvas & Undo
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const canvasInitRef = useRef(false); // Fix de la référence
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);

  // Élimination, Ultime Chance & Résultats
  const [eliminationTarget, setEliminationTarget] = useState<Player | null>(null);
  const [eliminatedUndercover, setEliminatedUndercover] = useState<Player | null>(null);
  const [undercoverGuessInput, setUndercoverGuessInput] = useState('');
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

  // Synchronisation Supabase Realtime
  useEffect(() => {
    if (gameMode !== 'online' || !roomCode || phase === 'setup') return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(`room:${roomCode}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'game_init' }, ({ payload }) => {
        setWord(payload.word);
        setPlayers(payload.players);
        setFirstPlayer(payload.firstPlayer);
        
        const me = payload.players.find((p: Player) => p.userId === myUserId);
        if (me) {
          setMyRole(me.role);
          setMySecretWord(me.role === 'civil' ? payload.word.name : null);
        }
        setPhase('reveal');
      })
      .on('broadcast', { event: 'start_draw_phase' }, ({ payload }) => {
        setDrawQueue(payload.queue);
        setDrawIdx(0);
        setDrawerReady(false);
        setTurnInRound(1);
        setStrokeHistory([]);
        setPhase('draw');
      })
      .on('broadcast', { event: 'draw_point' }, ({ payload }) => {
        drawRemoteLine(payload.prevPos, payload.currentPos);
      })
      .on('broadcast', { event: 'next_drawer' }, ({ payload }) => {
        setDrawIdx(payload.nextIdx);
        setTurnInRound(payload.turnInRound);
        setDrawerReady(false);
        if (payload.phase) setPhase(payload.phase);
      })
      .on('broadcast', { event: 'start_undercover_guess' }, ({ payload }) => {
        setPlayers(payload.nextPlayers);
        setLastReveal(payload.lastReveal);
        setEliminatedUndercover(payload.target);
        setPhase('undercover_guess');
      })
      .on('broadcast', { event: 'player_eliminated' }, ({ payload }) => {
        setPlayers(payload.nextPlayers);
        setLastReveal(payload.lastReveal);
        if (payload.winner) {
          setWinner(payload.winner);
          setPhase('end');
        } else {
          setDrawQueue(payload.nextQueue);
          setDrawIdx(0);
          setTurnInRound(1);
          setRoundNumber((r) => r + 1);
          setPhase('draw');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !isHost) {
          channel.send({
            type: 'broadcast',
            event: 'guest_joined',
            payload: { name: playerNames[0], userId: myUserId },
          });
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [gameMode, roomCode, phase, isHost, myUserId, playerNames]);

  function drawRemoteLine(prevPos: { x: number; y: number }, currentPos: { x: number; y: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#f2f0e8';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(prevPos.x, prevPos.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();
  }

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

  async function startLocalGame() {
    if (!listId) return;
    if (civilCount < 1) return alert("Il faut au moins 1 civil.");
    
    const { data: items } = await supabase.from('items').select('*').eq('list_id', listId);
    if (!items || items.length < 1) return alert('Il faut au moins 1 item.');

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
    setStrokeHistory([]);
    setRoundNumber(1);
    setTurnInRound(1);
    setPhase('reveal');
  }

  async function createOnlineRoom() {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const { error } = await supabase.from('rooms').insert({
      code,
      list_id: listId,
      grid_size: 1,
      host_name: playerNames[0],
    });

    if (error) return alert('Erreur lors de la création du salon.');

    setIsHost(true);
    setRoomCode(code);
    setPhase('waiting');
  }

  async function joinOnlineRoom() {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return alert('Entre un code de salon valide.');

    const { data, error } = await supabase.from('rooms').select('*').eq('code', code).single();
    if (error || !data) return alert('Salon introuvable !');

    setIsHost(false);
    setRoomCode(code);
    setPhase('waiting');
  }

  async function startOnlineGame() {
    const { data: items } = await supabase.from('items').select('*').eq('list_id', listId);
    if (!items || items.length < 1) return alert('Base de mots vide.');

    const [chosenWord] = pickRandom(items as ListItem[], 1);
    const roles: Role[] = [...Array(civilCount).fill('civil'), ...Array(undercoverCount).fill('undercover')];
    const shuffledRoles = shuffle(roles);

    const newPlayers: Player[] = playerNames.map((name, i) => ({
      id: i,
      name: name.trim() || `Joueur ${i + 1}`,
      role: shuffledRoles[i],
      alive: true,
      seen: true,
      userId: i === 0 ? myUserId : undefined,
    }));

    const randomStarter = newPlayers[Math.floor(Math.random() * newPlayers.length)];

    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_init',
      payload: { word: chosenWord, players: newPlayers, firstPlayer: randomStarter },
    });

    setWord(chosenWord);
    setPlayers(newPlayers);
    setFirstPlayer(randomStarter);
    setMyRole(newPlayers[0].role);
    setMySecretWord(newPlayers[0].role === 'civil' ? chosenWord.name : null);
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

  function rotateList(list: Player[], startPlayerId: number): Player[] {
    const startIndex = list.findIndex((p) => p.id === startPlayerId);
    if (startIndex === -1) return list;
    return [...list.slice(startIndex), ...list.slice(0, startIndex)];
  }

  function startDrawingPhase() {
    if (!firstPlayer) return;
    const alivePlayers = players.filter((p) => p.alive);
    const queue = rotateList(alivePlayers, firstPlayer.id);

    if (gameMode === 'online' && isHost) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'start_draw_phase',
        payload: { queue },
      });
    }

    setDrawQueue(queue);
    setDrawIdx(0);
    setDrawerReady(false);
    setTurnInRound(1);
    setStrokeHistory([]);
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
    if (phase === 'draw' || phase === 'elim' || phase === 'undercover_guess' || phase === 'end') {
      ensureCanvasInit();
    }
  }, [phase]);

  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function saveCanvasState() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    setStrokeHistory((prev) => [...prev, snapshot]);
  }

  function undoLastStroke() {
    if (strokeHistory.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previousState = strokeHistory[strokeHistory.length - 1];
    ctx.putImageData(previousState, 0, 0);
    setStrokeHistory((prev) => prev.slice(0, -1));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const currentDrawer = drawQueue[drawIdx];
    if (gameMode === 'online' && currentDrawer?.userId !== myUserId) return;
    if (!drawerReady && gameMode === 'local') return;

    saveCanvasState();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    canvas.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    lastPosRef.current = pos;

    ctx.strokeStyle = '#f2f0e8';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    isDrawingRef.current = true;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    if (gameMode === 'online' && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'draw_point',
        payload: { prevPos: lastPosRef.current, currentPos: pos },
      });
    }

    lastPosRef.current = pos;
  }

  function endStroke() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPosRef.current = null;
    setDrawerReady(false);

    let nextIdx = drawIdx + 1;
    let nextTurnInRound = turnInRound;
    let nextPhase: Phase = 'draw';

    if (nextIdx >= drawQueue.length) {
      if (turnInRound === 1) {
        nextTurnInRound = 2;
        nextIdx = 0;
      } else {
        nextPhase = 'elim';
      }
    }

    if (gameMode === 'online' && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'next_drawer',
        payload: { nextIdx, turnInRound: nextTurnInRound, phase: nextPhase },
      });
    }

    setTurnInRound(nextTurnInRound);
    setDrawIdx(nextIdx);
    setPhase(nextPhase);
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
    const nextPlayers = players.map((p) => (p.id === eliminationTarget.id ? { ...p, alive: false } : p));
    setPlayers(nextPlayers);
    const reveal = { name: eliminationTarget.name, role: eliminationTarget.role };
    setLastReveal(reveal);

    if (eliminationTarget.role === 'undercover') {
      setEliminatedUndercover(eliminationTarget);
      setEliminationTarget(null);

      if (gameMode === 'online' && isHost) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'start_undercover_guess',
          payload: { nextPlayers, lastReveal: reveal, target: eliminationTarget },
        });
      }

      setPhase('undercover_guess');
      return;
    }

    setEliminationTarget(null);
    const w = checkWinner(nextPlayers);
    const alivePlayers = nextPlayers.filter((p) => p.alive);
    const randomNextStarter = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
    const nextQueue = rotateList(alivePlayers, randomNextStarter.id);

    if (gameMode === 'online' && isHost) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'player_eliminated',
        payload: { nextPlayers, lastReveal: reveal, winner: w, nextQueue },
      });
    }

    if (w) {
      setWinner(w as any);
      setPhase('end');
      return;
    }

    setDrawQueue(nextQueue);
    setDrawIdx(0);
    setDrawerReady(false);
    setTurnInRound(1);
    setRoundNumber((r) => r + 1);
    setPhase('draw');
  }

  function handleUndercoverGuessSubmit() {
    if (!word || !undercoverGuessInput.trim()) return;

    const normalize = (str: string) =>
      str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const isGuessCorrect = normalize(undercoverGuessInput) === normalize(word.name);

    if (isGuessCorrect) {
      setWinner('undercover');
    } else {
      setWinner('civils');
    }

    if (gameMode === 'online' && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'game_over',
        payload: { winner: isGuessCorrect ? 'undercover' : 'civils' },
      });
    }

    setPhase('end');
  }

  function resetAll() {
    setGameMode('menu');
    setPhase('setup');
    setPlayers([]);
    setActivePlayerId(null);
    setFirstPlayer(null);
    setWord(null);
    setMySecretWord(null);
    setWinner(null);
    setLastReveal(null);
    setEliminatedUndercover(null);
    setUndercoverGuessInput('');
    setStrokeHistory([]);
    setRoomCode('');
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

  // ================= 1. MENU PRINCIPAL =================
  if (gameMode === 'menu') {
    return (
      <div className="max-w-md mx-auto my-auto w-full bg-[#121420] p-6 rounded-2xl border border-white/10 flex flex-col gap-6 text-center shadow-2xl">
        <div>
          <div className="eyebrow font-serif">Jeu de dessin & rôle</div>
          <h1 className="text-3xl font-black text-amber mt-1">Undercover Artist</h1>
          <p className="text-muted text-xs mt-2">Retrouve l'imposteur qui dessine sans connaître le mot !</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setGameMode('local')}
            className="p-4 rounded-xl border border-amber/40 bg-amber/10 hover:bg-amber/20 text-white flex items-center justify-between transition-all group"
          >
            <div className="text-left">
              <div className="font-bold text-sm text-amber">🎮 Mode Local (1 écran)</div>
              <div className="text-[11px] text-slate-400">Passe le téléphone à tour de rôle</div>
            </div>
            <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <button
            onClick={() => setGameMode('online')}
            className="p-4 rounded-xl border border-[#4fc9c0]/40 bg-[#4fc9c0]/10 hover:bg-[#4fc9c0]/20 text-white flex items-center justify-between transition-all group"
          >
            <div className="text-left">
              <div className="font-bold text-sm text-[#4fc9c0]">🌐 Mode En Ligne</div>
              <div className="text-[11px] text-slate-400">Joue sur ton écran avec tes amis</div>
            </div>
            <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. SETUP =================
  if (phase === 'setup') {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <button onClick={() => setGameMode('menu')} className="text-xs text-slate-400 hover:text-white mb-4">
          ← Retour au menu
        </button>

        <div className="mb-6">
          <div className="eyebrow">{gameMode === 'local' ? 'Mode Local' : 'Mode En Ligne'}</div>
          <h1 className="font-serif text-3xl">Configuration</h1>
        </div>

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

          {gameMode === 'local' ? (
            <button className="btn w-full mt-2" onClick={startLocalGame}>▶ Distribuer les cartes</button>
          ) : (
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
              <button className="btn w-full" onClick={createOnlineRoom}>👑 Créer un salon</button>
              <div className="flex gap-2">
                <input
                  className="input uppercase flex-1"
                  placeholder="Code à 4 lettres"
                  maxLength={4}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                />
                <button className="btn-ghost border border-white/20" onClick={joinOnlineRoom}>Rejoindre</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= 3. WAITING (ONLINE) =================
  if (phase === 'waiting') {
    return (
      <div className="my-auto text-center flex flex-col items-center gap-4 p-4">
        <h2 className="text-xl text-white">Code du salon :</h2>
        <span className="text-4xl font-black text-amber tracking-widest bg-surface2 px-6 py-2 rounded-xl border border-amber/40 shadow-lg">
          {roomCode}
        </span>
        <p className="text-sm text-slate-400 animate-pulse">En attente des autres joueurs...</p>
        {isHost && (
          <button className="btn mt-4 px-8" onClick={startOnlineGame}>▶ Lancer la partie</button>
        )}
      </div>
    );
  }

  // ================= 4. REVEAL =================
  if (phase === 'reveal') {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[75vh] gap-6 text-center py-6">
        {gameMode === 'online' ? (
          <div className="bg-[#171a29] border-2 border-amber rounded-2xl p-6 max-w-sm w-full flex flex-col items-center gap-4">
            <span className="text-xs text-amber font-bold uppercase tracking-wider">TA CARTE SECRÈTE</span>
            <div className="text-xl font-bold text-white">{myRole === 'civil' ? 'CIVIL 😇' : 'UNDERCOVER 🕵️'}</div>
            {myRole === 'civil' ? (
              <div className="bg-surface2 p-3 rounded-xl w-full border border-white/10">
                <span className="text-xs text-slate-400 block">Mot à dessiner :</span>
                <span className="text-lg font-black text-amber">{mySecretWord}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-300 italic">Tu n'as pas de mot. Observe les traits des autres pour deviner !</p>
            )}
            {isHost && (
              <button className="btn w-full mt-2" onClick={startDrawingPhase}>Lancer le dessin →</button>
            )}
          </div>
        ) : (
          <>
            <div className="text-amber font-bold text-xs tracking-widest uppercase">DISTRIBUTION LOCAL</div>
            <div className="flex flex-wrap justify-center gap-4 max-w-3xl my-4">
              {players.map((p) => {
                const isBeingViewed = activePlayerId === p.id;
                const isCivil = p.role === 'civil';

                if (p.seen) {
                  return (
                    <div key={p.id} className="w-36 h-48 bg-[#12141f] border border-[#1d2133] rounded-2xl flex flex-col items-center justify-center text-slate-600 opacity-60">
                      <span className="text-3xl font-bold">✓</span>
                    </div>
                  );
                }

                if (isBeingViewed) {
                  return (
                    <div key={p.id} className="w-36 h-48 bg-[#171a29] border-2 border-amber rounded-2xl flex flex-col justify-between p-2.5">
                      <div className="text-amber font-bold text-xs truncate">{p.name}</div>
                      <div className="flex flex-col items-center gap-1 my-auto">
                        <span className="text-[10px] text-indigo-300 font-bold uppercase">{isCivil ? 'CIVIL' : 'UNDERCOVER'}</span>
                        {isCivil && word ? (
                          <span className="text-white font-black text-sm">{word.name}</span>
                        ) : (
                          <span className="text-slate-300 text-xs italic">Tu n'as pas de mot</span>
                        )}
                      </div>
                      <button onClick={() => toggleCard(p)} className="bg-[#202538] text-amber font-bold text-xs py-1.5 rounded-lg border border-amber/30">J'ai vu ✓</button>
                    </div>
                  );
                }

                return (
                  <div key={p.id} onClick={() => toggleCard(p)} className="w-36 h-48 rounded-2xl border flex flex-col items-center justify-center p-3 gap-2 cursor-pointer bg-[#171a2b] border-[#252a42]">
                    <div className="w-8 h-8 rounded-full bg-[#252a42] flex items-center justify-center text-amber font-bold">?</div>
                    <span className="text-amber text-xs">Tap pour voir</span>
                  </div>
                );
              })}
            </div>

            {allSeen && firstPlayer && (
              <button className="btn px-8 py-3" onClick={startDrawingPhase}>Commencer le dessin →</button>
            )}
          </>
        )}
      </div>
    );
  }

  // ================= 5. DRAW =================
  if (phase === 'draw') {
    const drawer = drawQueue[drawIdx];
    const isMyTurnToDraw = gameMode === 'online' ? drawer?.userId === myUserId : true;

    return (
      <div className="p-2 sm:p-4 max-w-4xl mx-auto">
        <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <div className="eyebrow">Manche {roundNumber} — Tour {turnInRound}/2 — Dessin {drawIdx + 1} / {drawQueue.length}</div>
            <h1 className="font-serif text-2xl sm:text-3xl">
              Au tour de <span className="text-amber">{drawer?.name}</span>
            </h1>
            {gameMode === 'online' && (
              <p className="text-xs text-slate-400 mt-1">
                {isMyTurnToDraw ? '🟢 C\'est ton tour ! Fais un seul trait continu.' : '🔴 Attends que l\'adversaire dessine...'}
              </p>
            )}
          </div>

          {strokeHistory.length > 0 && gameMode === 'local' && (
            <button onClick={undoLastStroke} className="px-3 py-1.5 rounded-xl bg-surface2 border border-border text-amber text-xs font-bold">
              ↩ Annuler le trait
            </button>
          )}
        </div>

        <div className="flex justify-center">{CanvasBoard}</div>

        {gameMode === 'local' && !drawerReady && (
          <div className="flex justify-center mt-4">
            <button className="btn" onClick={() => setDrawerReady(true)}>✏️ Je suis prêt(e), commencer mon trait</button>
          </div>
        )}
      </div>
    );
  }

  // ================= 6. ELIM (VOTE UNIQUE) =================
  if (phase === 'elim') {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <div className="eyebrow">Discussion après 2 tours de dessin</div>
          <h1 className="font-serif text-3xl">Sélectionnez le joueur à éliminer</h1>
          <p className="text-xs text-slate-400 mt-1">Attention, vous n'avez droit qu'à un seul vote pour cette manche !</p>
        </div>

        <div className="flex justify-center mb-6">{CanvasBoard}</div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {players.map((p) => (
            <div
              key={p.id}
              onClick={() => (p.alive && (gameMode === 'local' || isHost)) && setEliminationTarget(p)}
              className={`border rounded-xl p-3 text-center transition ${
                p.alive
                  ? 'bg-surface border-border cursor-pointer hover:border-red-500 hover:scale-105'
                  : 'bg-surface2 border-border opacity-40'
              }`}
            >
              <div className="font-bold text-sm text-white">{p.name}</div>
              {!p.alive && <div className="text-[10px] text-muted mt-1">{p.role === 'civil' ? 'Civil' : 'Undercover'}</div>}
            </div>
          ))}
        </div>

        {eliminationTarget && (
          <Modal onClose={() => setEliminationTarget(null)}>
            <p className="mb-4 text-center">Éliminer <b className="text-amber">{eliminationTarget.name}</b> et exécuter le vote ?</p>
            <div className="flex gap-3 justify-center">
              <button className="btn-danger py-2 px-4 text-xs" onClick={confirmElimination}>Confirmer le vote</button>
              <button className="btn-ghost py-2 px-4 text-xs" onClick={() => setEliminationTarget(null)}>Annuler</button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ================= 7. ULTIME TENTATIVE DE L'UNDERCOVER =================
  if (phase === 'undercover_guess') {
    const isEliminatedPlayer = gameMode === 'online' ? eliminatedUndercover?.userId === myUserId : true;

    return (
      <div className="p-4 max-w-md mx-auto text-center flex flex-col items-center gap-5 my-auto">
        <div className="bg-[#121420] border-2 border-amber rounded-2xl p-6 w-full shadow-2xl flex flex-col items-center gap-4">
          <span className="text-xs text-amber font-bold uppercase tracking-wider">🕵️ ULTIME CHANCE !</span>
          <h2 className="text-xl font-bold text-white">
            <span className="text-amber">{eliminatedUndercover?.name}</span> a été démasqué !
          </h2>
          <p className="text-xs text-slate-300">
            S'il/elle parvient à deviner le mot exact des civils, l'Undercover remporte la partie malgré tout !
          </p>

          {isEliminatedPlayer ? (
            <div className="w-full flex flex-col gap-3 mt-2">
              <input
                className="input w-full text-center text-sm font-bold"
                placeholder="Tape le mot mystère..."
                value={undercoverGuessInput}
                onChange={(e) => setUndercoverGuessInput(e.target.value)}
              />
              <button className="btn w-full py-3" onClick={handleUndercoverGuessSubmit}>
                🎯 Valider ma tentative
              </button>
            </div>
          ) : (
            <div className="p-4 bg-surface2 rounded-xl border border-white/10 w-full animate-pulse text-xs text-slate-400">
              En attente de l'ultime proposition de l'Undercover...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= 8. FIN DE PARTIE =================
  return (
    <div className="flex flex-col items-center gap-6 mt-10 text-center p-4">
      <div className="eyebrow">Partie terminée</div>
      <h1 className="font-serif text-3xl">
        {winner === 'civils' ? 'Les civils gagnent 🎉' : "L'undercover gagne 🕵️"}
      </h1>
      <p className="text-muted">Le mot était <b className="text-amber">{word?.name}</b>.</p>
      <div className="flex justify-center">{CanvasBoard}</div>
      <button className="btn mt-4" onClick={resetAll}>↺ Retour au menu</button>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
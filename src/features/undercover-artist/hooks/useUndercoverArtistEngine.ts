import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { fetchListItemMeta, pickRandom, shuffle } from '@/lib/utils';
import { GameMode, Phase, Player, Role } from '../types';

export const CANVAS_W = 640;
export const CANVAS_H = 400;

export function useUndercoverArtistEngine() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');

  const [gameMode, setGameMode] = useState<GameMode>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [myUserId] = useState(() => Math.random().toString(36).substring(2, 9));
  const channelRef = useRef<any>(null);

  const [playerCount, setPlayerCount] = useState(5);
  const [playerNames, setPlayerNames] = useState<string[]>(Array.from({ length: 5 }, (_, i) => `Joueur ${i + 1}`));
  const [undercoverCount, setUndercoverCount] = useState(1);

  const [phase, setPhase] = useState<Phase>('setup');
  const [word, setWord] = useState<ListItem | null>(null);
  const [mySecretWord, setMySecretWord] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<Role>('civil');
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);
  const [firstPlayer, setFirstPlayer] = useState<Player | null>(null);

  const [drawQueue, setDrawQueue] = useState<Player[]>([]);
  const [drawIdx, setDrawIdx] = useState(0);
  const [drawerReady, setDrawerReady] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);
  const [turnInRound, setTurnInRound] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const canvasInitRef = useRef(false);
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);

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
    if (civilCount < 1) return alert('Il faut au moins 1 civil.');

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

  return {
    lists,
    listId,
    setListId,
    gameMode,
    setGameMode,
    roomCode,
    joinCodeInput,
    setJoinCodeInput,
    isHost,
    myUserId,
    playerCount,
    setCount,
    playerNames,
    setPlayerNames,
    undercoverCount,
    setUndercoverCount,
    civilCount,
    maxUndercover,
    phase,
    word,
    mySecretWord,
    myRole,
    players,
    activePlayerId,
    firstPlayer,
    drawQueue,
    drawIdx,
    drawerReady,
    setDrawerReady,
    roundNumber,
    turnInRound,
    canvasRef,
    strokeHistory,
    eliminationTarget,
    setEliminationTarget,
    eliminatedUndercover,
    undercoverGuessInput,
    setUndercoverGuessInput,
    winner,
    startLocalGame,
    createOnlineRoom,
    joinOnlineRoom,
    startOnlineGame,
    toggleCard,
    startDrawingPhase,
    handlePointerDown,
    handlePointerMove,
    endStroke,
    undoLastStroke,
    confirmElimination,
    handleUndercoverGuessSubmit,
    resetAll,
  };
}
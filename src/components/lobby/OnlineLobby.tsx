'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  createGameSession,
  joinGameSession,
  selectGameForSession,
  markPlayerJoinedCurrentGame,
  endGameSession,
} from '@/lib/supabase/queries';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ProfileRow, SessionPlayerRow } from '@/types/database';
import { GameType } from '@/types/session';

const GAME_LABELS: Record<string, string> = {
  'qui-est-ce': '❓ Qui est-ce ?',
  'undercover-artist': '🎨 Undercover Artist',
  'soit-connecte': '🔗 Soit connecté',
};

interface OnlineLobbyProps {
  profile: ProfileRow;
  onStartGame: (sessionCode: string, gameType: GameType, isHost: boolean) => void;
}

export function OnlineLobby({ profile, onStartGame }: OnlineLobbyProps) {
  const [step, setStep] = useState<'menu' | 'room' | 'final'>('menu');
  const [code, setCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<SessionPlayerRow[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [pendingGame, setPendingGame] = useState<GameType | null>(null);
  const [ending, setEnding] = useState(false);

  const handleCreateRoom = async () => {
    try {
      const { session, code: newCode } = await createGameSession(profile.user_id, profile);
      setCode(newCode);
      setSessionId(session.id);
      setIsHost(true);
      setStep('room');
    } catch (err: any) {
      alert(`Erreur lors de la création du salon : ${err?.message || 'Inconnue'}`);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinInput.trim()) return alert('Renseigne le code du salon.');
    try {
      const session = await joinGameSession(joinInput, profile);
      setCode(session.code);
      setSessionId(session.id);
      setIsHost(session.host_id === profile.user_id);
      setStep('room');
    } catch (err: any) {
      alert(err.message || 'Impossible de rejoindre le salon.');
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    const fetchPlayers = async () => {
      const { data } = await supabase.from('session_players').select('*').eq('session_id', sessionId);
      if (data) setPlayers(data);
    };

    fetchPlayers();

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_players' }, fetchPlayers)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions' }, (payload) => {
        if (payload.new.status === 'in_game' && payload.new.current_game) {
          setPendingGame(payload.new.current_game as GameType);
        }
        if (payload.new.status === 'lobby') {
          setPendingGame(null);
        }
        if (payload.new.status === 'finished') {
          setStep('final');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleSelectGame = async (gameType: GameType) => {
    await selectGameForSession(sessionId, gameType);
    // L'hôte va directement configurer la partie, pas besoin de la modale.
    onStartGame(code, gameType, true);
  };

  const handleJoinCurrentGame = async () => {
    if (!pendingGame) return;
    await markPlayerJoinedCurrentGame(sessionId, profile.user_id);
    onStartGame(code, pendingGame, false);
  };

  const handleEndSession = async () => {
    setEnding(true);
    await endGameSession(sessionId);
    setEnding(false);
    setStep('final');
  };

  const joinedCount = players.filter((p) => p.joined_current_game).length;
  const sortedByScore = [...players].sort((a, b) => b.score - a.score);

  if (step === 'menu') {
    return (
      <Card className="max-w-xl w-full flex flex-col gap-4 text-center">
        <h2 className="text-xl font-bold text-amber">Salon En Ligne</h2>
        <Button onClick={handleCreateRoom} className="py-3">
          👑 Créer un nouveau salon
        </Button>
        <div className="text-xs text-slate-500 uppercase font-bold my-1">ou rejoindre</div>
        <div className="flex gap-2">
          <Input
            className="uppercase"
            placeholder="Code (ex: X7K2)"
            maxLength={4}
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
          />
          <Button variant="ghost" onClick={handleJoinRoom}>
            Rejoindre
          </Button>
        </div>
      </Card>
    );
  }

  if (step === 'final') {
    return (
      <Card className="max-w-xl w-full flex flex-col gap-5">
        <div className="text-center">
          <span className="text-xs text-amber font-bold uppercase tracking-widest">Salon terminé</span>
          <h2 className="text-2xl font-black text-white mt-1">Classement final</h2>
        </div>
        <div className="flex flex-col gap-2">
          {sortedByScore.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                i === 0 ? 'bg-amber/10 border-amber/40' : 'bg-[#1c1e26] border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-black text-muted w-5 text-center">{i + 1}</span>
                <img src={p.avatar_url} className="w-9 h-9 rounded-full object-cover border border-white/20" alt="" />
                <span className="font-bold text-sm text-white">{p.name}</span>
                {i === 0 && <span>🏆</span>}
              </div>
              <span className="text-sm font-bold text-amber">{p.score} pts</span>
            </div>
          ))}
        </div>
        <Button variant="secondary" className="w-full" onClick={() => setStep('menu')}>
          Retour au menu
        </Button>
      </Card>
    );
  }

  // step === 'room'
  return (
    <Card className="max-w-xl w-full flex flex-col gap-5">
      <div className="text-center">
        <span className="text-xs text-slate-400">Code du salon</span>
        <div className="text-4xl font-black text-amber tracking-widest">{code}</div>
      </div>

      {pendingGame && !isHost && (
        <div className="bg-green-500/20 border-2 border-green-500 p-4 rounded-2xl text-center flex flex-col gap-3">
          <span className="text-sm font-bold text-green-400">
            🚀 L'hôte lance : <b>{GAME_LABELS[pendingGame] || pendingGame}</b>
          </span>
          <span className="text-xs text-muted">
            {joinedCount}/{players.length} joueurs ont rejoint
          </span>
          <div className="flex gap-2 justify-center">
            <Button
              variant="primary"
              onClick={handleJoinCurrentGame}
              className="bg-green-500 text-black hover:bg-green-400 border-none py-3"
            >
              Rejoindre la partie →
            </Button>
            <Button variant="ghost" onClick={() => setPendingGame(null)}>
              Passer ce tour
            </Button>
          </div>
        </div>
      )}

      {pendingGame && isHost && (
        <div className="bg-amber/10 border border-amber/40 p-3 rounded-xl text-center text-xs text-amber">
          Partie en cours de configuration — {joinedCount}/{players.length} joueurs ont rejoint.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-xs text-muted font-bold uppercase">Joueurs ({players.length})</h3>
        {players.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-2.5 bg-[#1c1e26] rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <img src={p.avatar_url} className="w-9 h-9 rounded-full object-cover border border-white/20" alt="" />
              <span className="font-bold text-sm text-white">{p.name}</span>
            </div>
            <span className="text-xs text-amber font-bold">{p.score} pts</span>
          </div>
        ))}
      </div>

      {isHost && (
        <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
          <span className="text-xs text-muted block mb-1">Choisis un jeu à lancer pour le groupe :</span>
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" onClick={() => handleSelectGame('qui-est-ce')}>
              🎴 Qui est-ce ?
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleSelectGame('undercover-artist')}>
              ✏️ Undercover
            </Button>
            <Button size="sm" variant="teal" onClick={() => handleSelectGame('soit-connecte')}>
              🔗 Soit connecté
            </Button>
          </div>
          <Button variant="danger" size="sm" disabled={ending} onClick={handleEndSession}>
            {ending ? 'Fermeture…' : '🏁 Terminer le salon'}
          </Button>
        </div>
      )}
    </Card>
  );
}

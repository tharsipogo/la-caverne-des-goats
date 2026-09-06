'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Player {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string;
  is_approved: boolean;
  score: number;
}

interface Props {
  profile: any;
  onStartGame: (sessionCode: string, gameType: string, isHost: boolean) => void;
}

export default function OnlineLobby({ profile, onStartGame }: Props) {
  const [step, setStep] = useState<'menu' | 'waiting'>('menu');
  const [code, setCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [selectedGameNotification, setSelectedGameNotification] = useState<string | null>(null);

  // Création d'une session
  const handleCreateRoom = async () => {
    const newCode = Math.random().toString(36).substring(2, 6).toUpperCase();

    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert({ code: newCode, host_id: profile.user_id, status: 'lobby' })
      .select()
      .single();

    if (error || !session) {
      console.error('Erreur création salon :', error);
      return alert(`Erreur : ${error?.message || 'Salon non créé'}`);
    }

    const { error: playerError } = await supabase.from('session_players').insert({
      session_id: session.id,
      user_id: profile.user_id,
      name: profile.username,
      avatar_url: profile.avatar_url,
      is_approved: true,
    });

    if (playerError) {
      console.error('Erreur ajout joueur :', playerError);
      return alert(`Erreur ajout joueur : ${playerError.message}`);
    }

    setCode(newCode);
    setSessionId(session.id);
    setIsHost(true);
    setStep('waiting');
  };

  // Rejoindre une session
  const handleJoinRoom = async () => {
    if (!joinInput.trim()) return alert('Entre le code du salon !');
    const searchCode = joinInput.trim().toUpperCase();

    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('code', searchCode)
      .single();

    if (!session) return alert('Salon introuvable !');

    await supabase.from('session_players').insert({
      session_id: session.id,
      user_id: profile.user_id,
      name: profile.username,
      avatar_url: profile.avatar_url,
      is_approved: false,
    });

    setCode(searchCode);
    setSessionId(session.id);
    setIsHost(false);
    setStep('waiting');
  };

  // Écoute Realtime de la session
  useEffect(() => {
    if (!sessionId) return;

    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('session_players')
        .select('*')
        .eq('session_id', sessionId);
      if (data) setPlayers(data);
    };

    fetchPlayers();

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_players' }, fetchPlayers)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions' }, (payload) => {
        if (payload.new.status === 'in_game' && payload.new.current_game) {
          setSelectedGameNotification(payload.new.current_game);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleApprove = async (playerId: string) => {
    await supabase.from('session_players').update({ is_approved: true }).eq('id', playerId);
  };

  const handleSelectGame = async (gameType: string) => {
    await supabase
      .from('game_sessions')
      .update({ status: 'in_game', current_game: gameType })
      .eq('id', sessionId);
  };

  const myProfileInRoom = players.find((p) => p.user_id === profile.user_id);

  return (
    <div className="max-w-xl mx-auto p-4 w-full">
      {step === 'menu' && (
        <div className="bg-[#121420] p-6 rounded-2xl border border-white/10 flex flex-col gap-4 text-center shadow-2xl">
          <h2 className="text-xl font-bold text-amber">Salon En Ligne</h2>
          <button className="btn py-3" onClick={handleCreateRoom}>👑 Créer un nouveau salon</button>
          <div className="relative text-center my-1">
            <span className="bg-[#121420] px-3 text-xs text-slate-500 uppercase">ou rejoindre</span>
          </div>
          <div className="flex gap-2">
            <input
              className="input uppercase flex-1"
              placeholder="Code (ex: X7K2)"
              maxLength={4}
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
            />
            <button className="btn-ghost border border-white/20" onClick={handleJoinRoom}>Rejoindre</button>
          </div>
        </div>
      )}

      {step === 'waiting' && (
        <div className="bg-[#121420] p-6 rounded-2xl border border-white/10 flex flex-col gap-5 shadow-2xl">
          <div className="text-center">
            <span className="text-xs text-slate-400">Code du salon</span>
            <div className="text-4xl font-black text-amber tracking-widest">{code}</div>
          </div>

          {!myProfileInRoom?.is_approved && (
            <div className="bg-amber/10 border border-amber/40 p-3 rounded-xl text-center text-xs text-amber animate-pulse">
              En attente de validation par l'hôte du salon...
            </div>
          )}

          {/* Invitation quand l'hôte choisit un jeu */}
          {selectedGameNotification && (
            <div className="bg-green-500/20 border-2 border-green-500 p-4 rounded-2xl text-center flex flex-col gap-3 animate-in zoom-in-95 duration-200">
              <span className="text-sm font-bold text-green-400">
                🚀 L'hôte a sélectionné le jeu : <b className="uppercase">{selectedGameNotification}</b> !
              </span>
              <button
                className="btn py-3 text-xs font-black bg-green-500 text-black border-none"
                onClick={() => onStartGame(code, selectedGameNotification, isHost)}
              >
                Rejoindre la partie maintenant →
              </button>
            </div>
          )}

          {/* Liste des joueurs */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs text-slate-400 font-bold uppercase">Joueurs connectés ({players.length})</h3>
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2.5 bg-surface2 rounded-xl border border-white/10">
                <div className="flex items-center gap-3">
                  <img src={p.avatar_url} className="w-9 h-9 rounded-full object-cover border border-white/20" alt="" />
                  <div>
                    <span className="font-bold text-sm text-white block">{p.name}</span>
                    <span className="text-xs text-amber font-bold">{p.score} pts</span>
                  </div>
                </div>

                {!p.is_approved && isHost && (
                  <button className="btn py-1 px-3 text-xs" onClick={() => handleApprove(p.id)}>
                    Valider
                  </button>
                )}
                {!p.is_approved && !isHost && (
                  <span className="text-[10px] text-slate-500 italic">En attente</span>
                )}
              </div>
            ))}
          </div>

          {/* Panneau de sélection de l'hôte avec les 3 jeux */}
          {isHost && (
            <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
              <span className="text-xs text-slate-400 block mb-1">Choisis un jeu à lancer pour le groupe :</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className="btn py-3 text-xs font-bold"
                  onClick={() => handleSelectGame('qui-est-ce')}
                >
                  🎴 Qui est-ce ?
                </button>
                <button
                  className="btn-ghost border border-amber text-amber py-3 text-xs font-bold"
                  onClick={() => handleSelectGame('undercover-artist')}
                >
                  ✏️ Undercover Artist
                </button>
                <button
                  className="btn-ghost border border-[#4fc9c0] text-[#4fc9c0] hover:bg-[#4fc9c0]/10 py-3 text-xs font-bold"
                  onClick={() => handleSelectGame('soit-connecte')}
                >
                  🔗 Soit connecté
                </button>
              </div>
            </div>
          )}

          {!isHost && !selectedGameNotification && (
            <div className="p-3 bg-surface2 rounded-xl border border-white/10 text-center text-xs text-slate-400 animate-pulse">
              ⌛ L'hôte sélectionne actuellement le jeu...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
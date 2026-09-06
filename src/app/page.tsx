'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import OnlineLobby from '@/components/OnlineLobby';
import GuessWhoPage from '@/app/qui-est-ce/page';
import UndercoverArtistPage from '@/app/undercover-artist/page';
import SoitConnecteGame from '@/components/SoitConnecteGame';

type Screen = 'home' | 'solo_bases' | 'lobby' | 'game';

export default function HomePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [activeGame, setActiveGame] = useState<string>('');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const savedUserId = localStorage.getItem('caverne_user_id');
    if (!savedUserId) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', savedUserId)
        .single();

      if (data) setProfile(data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-400">Chargement de ton profil...</div>;

  return (
    <main className="min-h-screen bg-[#0b0c10] text-white">
      {/* 1. Modale d'authentification si non connecté */}
      {!profile && <AuthModal onProfileLoaded={(p) => setProfile(p)} />}

      {/* 2. Menu d'accueil principal (Une fois connecté) */}
      {profile && currentScreen === 'home' && (
        <div className="max-w-xl mx-auto p-4 flex flex-col gap-6 my-auto pt-10">
          {/* En-tête du Profil */}
          <div className="flex items-center justify-between bg-[#121420] p-4 rounded-2xl border border-white/10 shadow-xl">
            <div className="flex items-center gap-3">
              <img src={profile.avatar_url} className="w-12 h-12 rounded-xl bg-surface2 p-1 border border-amber object-cover" alt="" />
              <div>
                <h2 className="font-bold text-white">{profile.username}</h2>
                <span className="text-xs text-amber font-bold">🏆 {profile.online_wins || 0} victoires</span>
              </div>
            </div>
            <button
              className="btn-ghost text-xs border border-white/20"
              onClick={() => {
                localStorage.removeItem('caverne_user_id');
                setProfile(null);
              }}
            >
              Déconnexion
            </button>
          </div>

          {/* Choix des Modes de Jeu */}
          <div className="bg-[#121420] p-6 rounded-2xl border border-white/10 flex flex-col gap-3 text-center shadow-2xl">
            <h1 className="text-2xl font-black text-amber">La Caverne des GOATs</h1>
            <p className="text-xs text-slate-400 mb-2">Choisis ton mode de jeu</p>

            <button
              className="btn py-4 flex items-center justify-between px-6"
              onClick={() => setCurrentScreen('solo_bases')}
            >
              <span>🎮 Mode Solo / Local</span>
              <span className="text-xs font-normal text-amber-200">Mes bases →</span>
            </button>

            <button
              className="btn-ghost border border-[#4fc9c0] text-[#4fc9c0] hover:bg-[#4fc9c0]/10 py-4 flex items-center justify-between px-6"
              onClick={() => setCurrentScreen('lobby')}
            >
              <span>🌐 Mode En Ligne</span>
              <span className="text-xs font-normal text-[#4fc9c0]">Créer / Rejoindre →</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Redirection Mode Solo -> Mes Bases */}
      {profile && currentScreen === 'solo_bases' && (
        <div className="max-w-4xl mx-auto p-4">
          <button className="text-xs text-slate-400 hover:text-white mb-4" onClick={() => setCurrentScreen('home')}>
            ← Retour au menu principal
          </button>
          <div className="bg-[#121420] p-6 rounded-2xl border border-white/10 text-center">
            <h2 className="text-2xl font-bold text-amber mb-2">Mes Bases de Jeu</h2>
            <p className="text-xs text-slate-400 mb-6">Sélectionne une base de mots ou crée la tienne pour jouer en local.</p>
            <button className="btn py-2 px-6 text-xs" onClick={() => { setActiveGame('qui-est-ce'); setCurrentScreen('game'); }}>
              Lancer "Qui est-ce ?" en Solo
            </button>
          </div>
        </div>
      )}

      {/* 4. Lobby En Ligne (Création, Attente des joueurs, Choix du jeu par l'hôte) */}
      {profile && currentScreen === 'lobby' && (
        <div>
          <button className="text-xs text-slate-400 hover:text-white m-4" onClick={() => setCurrentScreen('home')}>
            ← Retour au menu principal
          </button>
          <OnlineLobby
            profile={profile}
            onStartGame={(code, gameType, hostFlag) => {
              setSessionCode(code);
              setActiveGame(gameType);
              setIsHost(hostFlag);
              setCurrentScreen('game');
            }}
          />
        </div>
      )}

      {/* 5. Lancement de la Partie active */}
      {/* Dans src/app/page.tsx */}
      {profile && currentScreen === 'game' && (
        <div>
          {activeGame === 'qui-est-ce' && <GuessWhoPage />}
          {activeGame === 'undercover-artist' && <UndercoverArtistPage />}
          {activeGame === 'soit-connecte' && (
            <SoitConnecteGame
              sessionCode={sessionCode}
              profile={profile}
              isHost={isHost}
              onLeaveGame={() => setCurrentScreen('lobby')} // 👈 Renvoie sur le salon d'attente !
            />
          )}
        </div>
      )}
    </main>
  );
}
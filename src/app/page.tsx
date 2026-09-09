'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useOnlineMode } from '@/lib/onlineModeContext';
import { OnlineLobby } from '@/components/lobby/OnlineLobby';
import SoitConnecteContainer from '@/features/soit-connecte/SoitConnecteContainer';
import UndercoverArtistContainer from '@/features/undercover-artist/UndercoverArtistContainer';
import { Card } from '@/components/ui/Card';
import { ProfileRow } from '@/types/database';
import { GameType } from '@/types/session';

type Screen = 'lobby' | 'game';

export default function HomePage() {
  const { user, isGuest, logout } = useAuth();
  const { onlineMode } = useOnlineMode();

  const [currentScreen, setCurrentScreen] = useState<Screen>('lobby');
  const [activeGame, setActiveGame] = useState<GameType | string>('');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [isHost, setIsHost] = useState(false);

  if (!user) return null; // AuthGate s'en occupe

  // ---------- Mode local : tableau de bord + profil ----------
  if (!onlineMode) {
    return (
      <div className="max-w-xl w-full flex flex-col gap-6">
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={user.avatar_url} className="w-12 h-12 rounded-xl bg-[#1c1e26] p-1 border border-amber object-cover" alt="" />
            <div>
              <h2 className="font-bold text-white">{user.username}</h2>
              {isGuest ? (
                <span className="text-xs text-muted">Invité — jeux locaux uniquement</span>
              ) : (
                <span className="text-xs text-amber font-bold">
                  🏆 {(user as ProfileRow).online_wins || 0} victoires · {(user as ProfileRow).games_played || 0} parties en ligne
                </span>
              )}
            </div>
          </div>
          <button className="text-xs text-muted hover:text-white" onClick={logout}>
            Déconnexion
          </button>
        </Card>

        <Card className="flex flex-col gap-3 text-center">
          <h1 className="text-2xl font-black text-amber">La Caverne des GOATs</h1>
          <p className="text-xs text-muted">
            Choisis un jeu dans le menu à gauche, ou passe en <b className="text-[#4fc9c0]">Mode En Ligne</b> pour jouer
            en salon avec tes amis.
          </p>
        </Card>
      </div>
    );
  }

  // ---------- Mode en ligne : invité bloqué ----------
  if (isGuest) {
    return (
      <Card className="max-w-md mx-auto my-auto text-center flex flex-col gap-3">
        <h2 className="text-xl font-black text-white">Compte requis</h2>
        <p className="text-sm text-muted">
          Le mode en ligne nécessite un compte (pas juste un profil invité). Déconnecte-toi et crée un compte pour
          jouer en salon avec tes amis.
        </p>
        <button className="text-xs text-amber underline" onClick={logout}>
          Créer un compte / me connecter
        </button>
      </Card>
    );
  }

  // ---------- Mode en ligne : salon ----------
  if (currentScreen === 'lobby') {
    return (
      <OnlineLobby
        profile={user as ProfileRow}
        onStartGame={(code, gameType, hostFlag) => {
          setSessionCode(code);
          setActiveGame(gameType);
          setIsHost(hostFlag);
          setCurrentScreen('game');
        }}
      />
    );
  }

  // ---------- Mode en ligne : partie en cours ----------
  return (
    <div className="w-full">
      {activeGame === 'soit-connecte' && (
        <SoitConnecteContainer
          sessionCode={sessionCode}
          profile={user as ProfileRow}
          isHost={isHost}
          onLeaveGame={() => {
            setActiveGame('');
            setCurrentScreen('lobby');
          }}
        />
      )}
      {activeGame === 'undercover-artist' && (
        <UndercoverArtistContainer
          onLeaveGame={() => {
            setActiveGame('');
            setCurrentScreen('lobby');
          }}
        />
      )}
    </div>
  );
}
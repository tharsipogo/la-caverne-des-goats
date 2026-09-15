'use client';

import { createContext, ReactNode, useContext, useState } from 'react';

interface OnlineModeContextValue {
  onlineMode: boolean;
  setOnlineMode: (v: boolean) => void;
}

const OnlineModeContext = createContext<OnlineModeContextValue | null>(null);

export function OnlineModeProvider({ children }: { children: ReactNode }) {
  const [onlineMode, setOnlineMode] = useState(false);
  return (
    <OnlineModeContext.Provider value={{ onlineMode, setOnlineMode }}>
      {children}
    </OnlineModeContext.Provider>
  );
}

export function useOnlineMode() {
  const ctx = useContext(OnlineModeContext);
  if (!ctx) throw new Error('useOnlineMode doit être utilisé dans <OnlineModeProvider>');
  return ctx;
}

/**
 * Jeux réellement jouables via le salon (créent leur partie à partir
 * de la session Supabase du salon : sessionCode/profile/isHost). Qui
 * est-ce ? et Undercover Artist ont chacun leur PROPRE système de
 * salon indépendant, non branché sur celui-ci — à ne pas proposer ici
 * tant qu'ils ne sont pas rebranchés, sous peine d'écran vide côté
 * joueurs qui rejoignent.
 */
export const ONLINE_GAMES = [
  { slug: 'soit-connecte', label: 'Soit connecté', icon: '🔗' },
  { slug: 'undercover-artist', label: 'Undercover Artist', icon: '🎨' },
  { slug: 'qui-est-ce', label: 'Qui est-ce ?', icon: '❓' },
] as const;

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

/** Jeux qui ont un vrai mode en ligne jouable via un salon. */
export const ONLINE_GAMES = [
  { slug: 'soit-connecte', label: 'Soit connecté', icon: '🔗' },
  { slug: 'qui-est-ce', label: 'Qui est-ce ?', icon: '❓' },
  { slug: 'undercover-artist', label: 'Undercover Artist', icon: '🎨' },
] as const;

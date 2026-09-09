'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { fetchProfileByUserId, fetchProfileByUsername, upsertProfile } from '@/lib/supabase/queries';
import { ProfileRow } from '@/types/database';

export interface GuestProfile {
  user_id: string;
  username: string;
  avatar_url: string;
  is_guest: true;
}

export type CurrentUser = (ProfileRow & { is_guest?: false }) | GuestProfile;

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  isGuest: boolean;
  register: (username: string, pin: string, avatarUrl: string) => Promise<{ error?: string }>;
  login: (username: string, pin: string) => Promise<{ error?: string }>;
  continueAsGuest: (username: string, avatarUrl: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY_USER_ID = 'caverne_user_id';
const STORAGE_KEY_GUEST = 'caverne_guest_profile';

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Zack',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Spooky',
];

export { DEFAULT_AVATARS };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const userId = localStorage.getItem(STORAGE_KEY_USER_ID);
      if (userId) {
        const profile = await fetchProfileByUserId(userId);
        if (profile) {
          setUser(profile);
          setLoading(false);
          return;
        }
      }
      const guestRaw = localStorage.getItem(STORAGE_KEY_GUEST);
      if (guestRaw) {
        try {
          setUser(JSON.parse(guestRaw));
        } catch {
          /* ignore */
        }
      }
      setLoading(false);
    })();
  }, []);

  const register: AuthContextValue['register'] = async (username, pin, avatarUrl) => {
    const trimmed = username.trim();
    if (!trimmed) return { error: 'Choisis un pseudo.' };
    if (!/^\d{4,6}$/.test(pin)) return { error: 'Le code doit faire 4 à 6 chiffres.' };

    const existing = await fetchProfileByUsername(trimmed);
    if (existing) return { error: 'Ce pseudo est déjà pris.' };

    const userId = Math.random().toString(36).substring(2, 10);
    try {
      const profile = await upsertProfile({
        user_id: userId,
        username: trimmed,
        avatar_url: avatarUrl,
        pin,
        online_wins: 0,
        games_played: 0,
      });
      if (!profile) return { error: 'Erreur lors de la création du compte.' };
      localStorage.setItem(STORAGE_KEY_USER_ID, profile.user_id);
      localStorage.removeItem(STORAGE_KEY_GUEST);
      setUser(profile);
      return {};
    } catch {
      return { error: 'Erreur lors de la création du compte.' };
    }
  };

  const login: AuthContextValue['login'] = async (username, pin) => {
    const trimmed = username.trim();
    if (!trimmed || !pin) return { error: 'Renseigne ton pseudo et ton code.' };

    const profile = await fetchProfileByUsername(trimmed);
    if (!profile || profile.pin !== pin) return { error: 'Pseudo ou code incorrect.' };

    localStorage.setItem(STORAGE_KEY_USER_ID, profile.user_id);
    localStorage.removeItem(STORAGE_KEY_GUEST);
    setUser(profile);
    return {};
  };

  const continueAsGuest: AuthContextValue['continueAsGuest'] = (username, avatarUrl) => {
    const guest: GuestProfile = {
      user_id: 'guest_' + Math.random().toString(36).substring(2, 10),
      username: username.trim() || 'Invité',
      avatar_url: avatarUrl,
      is_guest: true,
    };
    localStorage.setItem(STORAGE_KEY_GUEST, JSON.stringify(guest));
    localStorage.removeItem(STORAGE_KEY_USER_ID);
    setUser(guest);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY_USER_ID);
    localStorage.removeItem(STORAGE_KEY_GUEST);
    setUser(null);
  };

  const isGuest = !!user && 'is_guest' in user && user.is_guest === true;

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, register, login, continueAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}

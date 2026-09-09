import { GameList, ListItem } from '@/lib/types';

export type GameMode = 'menu' | 'local' | 'online';
export type Role = 'civil' | 'undercover';
export type Phase = 'setup' | 'reveal' | 'draw' | 'elim' | 'undercover_guess' | 'end' | 'waiting';

export interface Player {
  id: number;
  name: string;
  role: Role;
  alive: boolean;
  seen: boolean;
  userId?: string;
}

export interface UndercoverArtistProps {
  onLeaveGame?: () => void;
}

export interface DrawPoint {
  x: number;
  y: number;
  color: string;
  size: number;
  isNewStroke: boolean;
}
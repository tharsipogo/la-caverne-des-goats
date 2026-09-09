import { ProfileRow } from './database';

export type GameType = 'qui-est-ce' | 'undercover-artist' | 'soit-connecte' | '';

export interface Player {
  id: string; // user_id
  sessionPlayerId?: string; // id dans session_players
  name: string;
  avatarUrl: string;
  isApproved: boolean;
  score: number;
}

export interface SessionData {
  id: string;
  code: string;
  hostId: string;
  status: 'lobby' | 'in_game' | 'finished';
  currentGame: GameType;
  players: Player[];
}

export interface UserProfile extends ProfileRow {}
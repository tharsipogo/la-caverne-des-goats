import { ProfileRow } from '@/types/database';

export type GamePhase = 'setup' | 'playing' | 'recap' | 'final_end';

export interface PlayerSubmission {
  userId: string;
  userName: string;
  avatarUrl: string;
  words: string[];
}

export interface RankedPlayer {
  player: {
    id: string;
    name: string;
    avatar_url: string;
    score: number;
  };
  rank: number;
  pointsGiven: number;
}

export interface SoitConnecteProps {
  sessionCode: string;
  profile: ProfileRow;
  isHost: boolean;
  onLeaveGame: () => void;
}
export interface ProfileRow {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  pin?: string;
  online_wins: number;
  games_played: number;
  created_at?: string;
}

export interface GameSessionRow {
  id: string;
  code: string;
  host_id: string;
  status: 'lobby' | 'in_game' | 'finished';
  current_game: string | null;
  created_at?: string;
}

export interface SessionPlayerRow {
  id: string;
  session_id: string;
  user_id: string;
  name: string;
  avatar_url: string;
  is_approved: boolean;
  joined_current_game: boolean;
  score: number;
  created_at?: string;
}

export interface SoitConnecteWordRow {
  id: string;
  word: string;
  created_at?: string;
}
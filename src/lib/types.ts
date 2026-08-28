export type ListType = 'text' | 'image' | 'audio';

export interface GameList {
  id: string;
  name: string;
  type: ListType;
  tier_labels: any; // string[] (ancien format) ou TierRow[] (nouveau, normalisé à la lecture)
  cover_image_url: string | null;
  created_at: string;
  game_type?: string;
}

export interface TierRow {
  label: string;
  color: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  name: string;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface TierAssignment {
  id: string;
  list_id: string;
  item_id: string;
  tier: string;
  position: number;
}

export const TIER_COLOR_PALETTE = ['#e2645a', '#e8ab4f', '#e8d24f', '#8fd15c', '#4fc9c0', '#8b8d97', '#c084fc', '#f472b6'];

export const DEFAULT_TIER_LABELS = ['S', 'A', 'B', 'C', 'D', 'E'];

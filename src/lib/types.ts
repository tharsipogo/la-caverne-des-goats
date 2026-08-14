export type ListType = 'text' | 'image';

export interface GameList {
  id: string;
  name: string;
  type: ListType;
  tier_labels: string[];
  created_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  name: string;
  image_url: string | null;
  created_at: string;
}

export interface TierAssignment {
  id: string;
  list_id: string;
  item_id: string;
  tier: string;
}

export const DEFAULT_TIER_LABELS = ['S', 'A', 'B', 'C', 'D', 'E'];

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

/* ==================== MODÈLES DE CARTE ====================
 * Design commun "carte à collectionner" (métal sombre + coups de pinceau
 * manga + bannière "fumée" pour le nom), appliqué à chaque item d'une
 * base pour en faire une carte, réutilisable par n'importe quel futur
 * jeu de cartes via le composant <GameCard>. Le design lui-même (mise en
 * page, SVG) est fixe ; seules deux couleurs sont personnalisables :
 * la couleur des détails (pinceau/accents) et la couleur du nom. */

export interface CardTemplateConfig {
  accentColor: string; // couleur des coups de pinceau / accents métalliques
  nameColor: string; // couleur du texte du nom
}

export interface CardTemplate {
  id: string;
  list_id: string;
  name: string;
  config: CardTemplateConfig;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_CARD_TEMPLATE_CONFIG: CardTemplateConfig = {
  accentColor: '#f5a20a',
  nameColor: '#ffffff',
};

// Palette de couleurs partagée pour identifier les joueurs de façon
// cohérente dans tous les jeux (Joueur 1 = rouge, Joueur 2 = bleu, etc.)
export interface PlayerColor {
  name: string;
  hex: string;
  /** Couleur de fond translucide assortie, pour les chips/badges */
  soft: string;
}

export const PLAYER_COLORS: PlayerColor[] = [
  { name: 'Rouge', hex: '#ef4444', soft: 'rgba(239, 68, 68, 0.15)' },
  { name: 'Bleu', hex: '#3b82f6', soft: 'rgba(59, 130, 246, 0.15)' },
  { name: 'Vert', hex: '#22c55e', soft: 'rgba(34, 197, 94, 0.15)' },
  { name: 'Ambre', hex: '#f5a623', soft: 'rgba(245, 166, 35, 0.15)' },
  { name: 'Violet', hex: '#a78bfa', soft: 'rgba(167, 139, 250, 0.15)' },
  { name: 'Rose', hex: '#f472b6', soft: 'rgba(244, 114, 182, 0.15)' },
  { name: 'Orange', hex: '#fb923c', soft: 'rgba(251, 146, 60, 0.15)' },
  { name: 'Teal', hex: '#1eb996', soft: 'rgba(30, 185, 150, 0.15)' },
];

export function getPlayerColor(index: number): PlayerColor {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

import { supabase } from '@/lib/supabase';
import type { ListItem } from '@/lib/types';

/**
 * Logique du jeu Timeline : dates (année + mois optionnel), comparaison
 * tolérante, validation d'un placement dans la frise, et conversion des
 * items de bases / événements intégrés en "cartes de frise".
 */

export const MONTHS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export interface TimelineDate {
  year: number;
  /** 1 = janvier ... 12 = décembre ; null = mois inconnu. */
  month: number | null;
}

export interface TimelineCard {
  id: string;
  name: string;
  image_url: string | null;
  date: TimelineDate;
  source: 'event' | 'base';
  /** Événements intégrés : catégorie + emoji affichés à la place d'une image. */
  category?: string;
  emoji?: string;
  /** Items de bases : l'item d'origine (pour le rendu en carte) et sa base. */
  item?: ListItem;
  listId?: string;
}

/** "Juillet 1969", ou "1969" si le mois est inconnu. */
export function formatTimelineDate(d: TimelineDate): string {
  if (d.month == null || d.month < 1 || d.month > 12) return String(d.year);
  const m = MONTHS_FR[d.month - 1];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.year}`;
}

/**
 * Compare deux dates. Si les années sont égales et qu'un des deux mois est
 * inconnu, on ne peut pas les départager : retourne 0 (interchangeables).
 */
export function compareTimelineDates(a: TimelineDate, b: TimelineDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month == null || b.month == null) return 0;
  return a.month - b.month;
}

/** Tri stable de la frise (les mois inconnus passent avant les mois connus d'une même année). */
export function sortTimelineCards(cards: TimelineCard[]): TimelineCard[] {
  return [...cards].sort((a, b) => a.date.year - b.date.year || (a.date.month ?? 0) - (b.date.month ?? 0));
}

/**
 * Placer `card` à l'emplacement `slot` de `line` (0 = avant la première
 * carte, line.length = après la dernière) est-il correct ? Une date égale
 * (ou indiscernable) à celle d'un voisin est acceptée.
 */
export function isPlacementCorrect(line: TimelineCard[], slot: number, card: TimelineCard): boolean {
  const before = slot > 0 ? line[slot - 1] : null;
  const after = slot < line.length ? line[slot] : null;
  if (before && compareTimelineDates(before.date, card.date) > 0) return false;
  if (after && compareTimelineDates(card.date, after.date) > 0) return false;
  return true;
}

/** Item de base → carte de frise (null si l'item n'a pas d'année). */
export function cardFromItem(item: ListItem): TimelineCard | null {
  if (item.timeline_year == null) return null;
  return {
    id: `item:${item.id}`,
    name: item.name,
    image_url: item.image_url,
    date: { year: item.timeline_year, month: item.timeline_month ?? null },
    source: 'base',
    item,
    listId: item.list_id,
  };
}

/**
 * Nombre d'items datés par base. `error` est vrai si la requête échoue
 * (typiquement : migration_timeline_dates.sql pas encore exécutée).
 */
export async function fetchDatedCounts(): Promise<{ counts: Map<string, number>; error: boolean }> {
  const counts = new Map<string, number>();
  const PAGE_SIZE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('items')
      .select('list_id')
      .not('timeline_year', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Erreur fetchDatedCounts :', error);
      return { counts, error: true };
    }
    if (!data) break;
    for (const row of data as { list_id: string }[]) {
      counts.set(row.list_id, (counts.get(row.list_id) || 0) + 1);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { counts, error: false };
}

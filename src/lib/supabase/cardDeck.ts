import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CardTemplateConfig, ListItem } from '@/lib/types';

/**
 * Le deck de cartes d'une base, c'est l'ensemble de ses items dont
 * `card_validated` est vrai — construit progressivement depuis
 * l'éditeur de cartes (/cartes), item par item. Un jeu en mode
 * "cartes" ne pioche que dans ce sous-ensemble ; le mode "images"
 * classique continue d'utiliser tous les items, validés ou non.
 */

/** Couleurs effectives d'une carte : sa propre surcharge si définie, sinon les couleurs par défaut du deck. */
export function mergeCardConfig(item: Pick<ListItem, 'card_accent_color' | 'card_name_color'>, deckDefault: CardTemplateConfig): CardTemplateConfig {
  return {
    accentColor: item.card_accent_color || deckDefault.accentColor,
    nameColor: item.card_name_color || deckDefault.nameColor,
  };
}

export async function setItemCardValidated(itemId: string, validated: boolean) {
  return supabase.from('items').update({ card_validated: validated }).eq('id', itemId);
}

/** `accentColor`/`nameColor` à `null` efface la surcharge (la carte retombe sur les couleurs du deck). */
export async function setItemCardColors(
  itemId: string,
  colors: { accentColor: string | null; nameColor: string | null }
) {
  return supabase
    .from('items')
    .update({ card_accent_color: colors.accentColor, card_name_color: colors.nameColor })
    .eq('id', itemId);
}

export async function fetchValidatedCardItems(listId: string): Promise<ListItem[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('list_id', listId)
    .eq('card_validated', true)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Erreur fetchValidatedCardItems :', error);
    return [];
  }
  return (data as ListItem[]) || [];
}

export async function countValidatedCards(listId: string): Promise<number> {
  const { count, error } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', listId)
    .eq('card_validated', true);
  if (error) {
    console.error('Erreur countValidatedCards :', error);
    return 0;
  }
  return count || 0;
}

/**
 * Le deck d'une base est utilisable dans un jeu dès qu'il contient au
 * moins une carte validée (pas besoin d'attendre que 100% des items
 * le soient). Ce hook sert à afficher/masquer le choix "Images / Cartes"
 * dans l'écran de config d'un jeu.
 */
export function useCardDeckAvailable(listId: string | null | undefined): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!listId) {
      setAvailable(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const n = await countValidatedCards(listId);
      if (!cancelled) setAvailable(n > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [listId]);

  return available;
}

export type DisplayMode = 'image' | 'card';

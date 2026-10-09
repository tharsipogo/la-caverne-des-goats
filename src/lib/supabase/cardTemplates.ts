import { supabase } from '@/lib/supabase';
import { CardTemplate, CardTemplateConfig, DEFAULT_CARD_TEMPLATE_CONFIG } from '@/lib/types';

/**
 * Récupère le modèle de carte d'une base, ou `null` s'il n'en existe pas
 * encore (base jamais passée dans l'éditeur de cartes).
 */
export async function fetchCardTemplate(listId: string): Promise<CardTemplate | null> {
  const { data, error } = await supabase
    .from('card_templates')
    .select('*')
    .eq('list_id', listId)
    .maybeSingle();

  if (error) {
    console.error('Erreur fetchCardTemplate :', error);
    return null;
  }
  return data as CardTemplate | null;
}

/**
 * Crée ou met à jour (upsert sur `list_id`, qui est unique) le modèle de
 * carte d'une base.
 */
export async function saveCardTemplate(
  listId: string,
  config: CardTemplateConfig,
  name: string = 'Modèle par défaut'
): Promise<CardTemplate | null> {
  const { data, error } = await supabase
    .from('card_templates')
    .upsert(
      { list_id: listId, name, config, updated_at: new Date().toISOString() },
      { onConflict: 'list_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Erreur saveCardTemplate :', error);
    return null;
  }
  return data as CardTemplate;
}

/**
 * Le modèle d'une base, ou le modèle par défaut si elle n'en a pas encore
 * — pratique pour un jeu qui veut toujours avoir une mise en page valide
 * à afficher, même si l'hôte n'a jamais ouvert l'éditeur de cartes.
 */
export async function fetchCardTemplateOrDefault(listId: string): Promise<CardTemplateConfig> {
  const template = await fetchCardTemplate(listId);
  return template?.config ?? DEFAULT_CARD_TEMPLATE_CONFIG;
}

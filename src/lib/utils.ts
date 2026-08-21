import { supabase } from './supabase';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/**
 * Renvoie le tableau dans le même ordre relatif (circulaire), mais en démarrant
 * à un index choisi au hasard. Utile pour désigner un joueur de départ aléatoire
 * tout en gardant un tour de jeu cohérent ensuite.
 * `excludeStart` permet d'exclure certains indices comme point de départ possible
 * (ex. ne jamais faire démarrer Mister White).
 */
export function rotateRandomStart<T>(arr: T[], excludeStart?: (item: T) => boolean): T[] {
  const n = arr.length;
  if (n <= 1) return [...arr];
  const eligible = excludeStart ? arr.map((_, i) => i).filter((i) => !excludeStart(arr[i])) : arr.map((_, i) => i);
  const candidates = eligible.length > 0 ? eligible : arr.map((_, i) => i);
  const start = candidates[Math.floor(Math.random() * candidates.length)];
  return arr.map((_, i) => arr[(start + i) % n]);
}

export const IMAGE_BUCKET = 'item-images';
export const AUDIO_BUCKET = 'item-audio';

/**
 * Upload une image vers le bucket Supabase Storage "item-images"
 * et renvoie son URL publique.
 */
export async function uploadItemImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload un extrait audio vers le bucket Supabase Storage "item-audio"
 * et renvoie son URL publique.
 */
export async function uploadItemAudio(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp3';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Nom "propre" déduit d'un nom de fichier, pour pré-remplir l'item lors d'un ajout multiple. */
export function nameFromFilename(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

export interface ListItemMeta {
  counts: Map<string, number>;
  firstImages: Map<string, string>;
}

/**
 * Récupère en un minimum de requêtes le nombre d'items et la première image de chaque base,
 * plutôt qu'une requête par base (ce qui devient très lent dès qu'on a beaucoup de bases —
 * ex. 15 bases = 15 à 30 allers-retours réseau au lieu d'un ou deux).
 * Pagine par blocs de 1000 lignes (limite par défaut de Supabase) pour ne rien perdre
 * même quand il y a plus de 1000 items au total, tous comptes confondus.
 * À utiliser à la place d'une boucle `for (const l of lists) { await supabase... }`.
 */
export async function fetchListItemMeta(): Promise<ListItemMeta> {
  const counts = new Map<string, number>();
  const firstImages = new Map<string, string>();
  const PAGE_SIZE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('items')
      .select('list_id, image_url')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data) break;

    for (const it of data as { list_id: string; image_url: string | null }[]) {
      counts.set(it.list_id, (counts.get(it.list_id) || 0) + 1);
      if (it.image_url && !firstImages.has(it.list_id)) {
        firstImages.set(it.list_id, it.image_url);
      }
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { counts, firstImages };
}

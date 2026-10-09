'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem, CardTemplateConfig, DEFAULT_CARD_TEMPLATE_CONFIG } from '@/lib/types';
import { fetchCardTemplate, saveCardTemplate } from '@/lib/supabase/cardTemplates';
import { GameConfigShell } from '@/components/game/GameConfigShell';
import { GameCard } from '@/components/game/GameCard';
import { SkeletonCard } from '@/components/ui/Skeleton';

const accentColors = [
  { label: 'Orange', value: '#f5a20a' },
  { label: 'Rose', value: '#ff3f68' },
  { label: 'Turquoise', value: '#14b89a' },
  { label: 'Bleu', value: '#38a8ff' },
  { label: 'Violet', value: '#d95cff' },
  { label: 'Blanc métallique', value: '#c6ccd8' },
];

const nameColors = [
  { label: 'Blanc', value: '#ffffff' },
  { label: 'Crème', value: '#ffe7b2' },
  { label: 'Orange', value: '#f5a20a' },
  { label: 'Rose', value: '#ff6b89' },
  { label: 'Turquoise', value: '#58d8c0' },
  { label: 'Bleu clair', value: '#8bd0ff' },
];

export default function CardTemplateEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listIdFromUrl = searchParams.get('list');

  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState(listIdFromUrl || '');
  const [items, setItems] = useState<ListItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [config, setConfig] = useState<CardTemplateConfig>(DEFAULT_CARD_TEMPLATE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Liste des bases disponibles (pour le sélecteur, si on arrive ici
  // sans ?list=... déjà choisi).
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      setLists((data as GameList[]) || []);
    })();
  }, []);

  // Items + modèle existant de la base choisie.
  useEffect(() => {
    if (!listId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const [{ data: itemsData }, template] = await Promise.all([
        supabase.from('items').select('*').eq('list_id', listId).order('created_at', { ascending: true }),
        fetchCardTemplate(listId),
      ]);
      setItems((itemsData as ListItem[]) || []);
      setPreviewIndex(0);
      setConfig(template?.config || DEFAULT_CARD_TEMPLATE_CONFIG);
      setLoading(false);
    })();
  }, [listId]);

  function selectList(id: string) {
    setListId(id);
    router.replace(`/cartes?list=${id}`);
  }

  async function handleSave() {
    if (!listId) return;
    setSaving(true);
    setSaved(false);
    await saveCardTemplate(listId, config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const currentList = lists.find((l) => l.id === listId) || null;
  const previewItem = items[previewIndex] || { name: 'Exemple de nom', image_url: null };

  if (loading && listId) return <SkeletonCard />;

  return (
    <GameConfigShell
      title="Créer des cartes"
      subtitle={
        currentList
          ? `Design commun appliqué à chaque item de « ${currentList.name} ». Réutilisable plus tard dans n'importe quel jeu de cartes.`
          : "Choisis une base : chaque item deviendra une carte avec ce design commun."
      }
      onBack={() => router.push('/lists')}
    >
      {!listId || lists.length === 0 ? (
        <div className="flex flex-col gap-2">
          <label className="text-[12.5px] text-muted block">Base</label>
          <select className="input" value={listId} onChange={(e) => selectList(e.target.value)}>
            <option value="">— Choisir une base —</option>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {lists.length === 0 && (
            <p className="text-muted text-[13px] mt-1">
              Aucune base pour l'instant — crée-en une depuis « Mes bases ».
            </p>
          )}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col gap-3">
          <select className="input" value={listId} onChange={(e) => selectList(e.target.value)}>
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <p className="text-muted text-[13px]">
            Cette base n'a pas encore d'item — ajoute-en depuis « Mes bases » avant de créer un design.
          </p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Aperçu */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <select className="input w-full lg:w-[220px]" value={listId} onChange={(e) => selectList(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            <div className="w-[220px]">
              <GameCard item={previewItem} template={config} className="shadow-2xl" />
            </div>

            <button
              className="btn-secondary text-[12.5px] px-3 py-1.5"
              onClick={() => setPreviewIndex((i) => (i + 1) % items.length)}
            >
              🔀 Item suivant ({previewIndex + 1}/{items.length})
            </button>

            <button className="btn w-[220px]" onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : saved ? '✓ Modèle enregistré' : 'Enregistrer le modèle'}
            </button>
          </div>

          {/* Réglages */}
          <div className="flex-1 flex flex-col gap-6 min-w-0 customization-panel">
            <ColorPalette
              legend="Détails de la carte"
              colors={accentColors}
              value={config.accentColor}
              onChange={(value) => setConfig((c) => ({ ...c, accentColor: value }))}
            />

            <div className="panel-separator" />

            <ColorPalette
              legend="Couleur du nom"
              colors={nameColors}
              value={config.nameColor}
              onChange={(value) => setConfig((c) => ({ ...c, nameColor: value }))}
            />
          </div>
        </div>
      )}
    </GameConfigShell>
  );
}

function ColorPalette({
  legend,
  colors,
  value,
  onChange,
}: {
  legend: string;
  colors: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const isPreset = colors.some((c) => c.value.toLowerCase() === value.toLowerCase());

  function handleCustomColor(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
  }

  return (
    <fieldset className="color-control">
      <legend>{legend}</legend>
      <div className="color-swatches" role="group" aria-label={legend}>
        {colors.map((c) => (
          <button
            key={c.value}
            type="button"
            className="color-swatch"
            style={{ backgroundColor: c.value, color: c.value }}
            aria-pressed={value.toLowerCase() === c.value.toLowerCase()}
            aria-label={c.label}
            title={c.label}
            onClick={() => onChange(c.value)}
          />
        ))}

        <label
          className="custom-color"
          style={{ color: value }}
          aria-pressed={!isPreset}
          title="Couleur personnalisée"
        >
          <span className="custom-color-preview" style={{ backgroundColor: !isPreset ? value : '#20223a' }} />
          <input
            type="color"
            aria-label="Couleur personnalisée"
            value={value}
            onChange={handleCustomColor}
          />
        </label>
      </div>
    </fieldset>
  );
}

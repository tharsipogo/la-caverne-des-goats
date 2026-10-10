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

const accentColors = ['#f5a20a', '#ff3f68', '#14b89a', '#38a8ff', '#d95cff', '#c6ccd8'];
const nameColors = ['#ffffff', '#ffe7b2', '#f5a20a', '#ff6b89', '#58d8c0', '#8bd0ff'];

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
              <GameCard item={previewItem} template={config} workName={currentList?.name} className="shadow-2xl" />
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
          <div className="flex-1 flex flex-col gap-6 min-w-0 brush-controls">
            <fieldset className="brush-control-group">
              <legend>Couleur des détails</legend>
              <Palette
                ariaLabel="Choisir la couleur des détails"
                colors={accentColors}
                value={config.accentColor}
                onChange={(value) => setConfig((c) => ({ ...c, accentColor: value }))}
              />
            </fieldset>

            <div className="brush-control-divider" />

            <fieldset className="brush-control-group">
              <legend>Couleur du nom</legend>
              <Palette
                ariaLabel="Choisir la couleur du nom"
                colors={nameColors}
                value={config.nameColor}
                onChange={(value) => setConfig((c) => ({ ...c, nameColor: value }))}
              />
            </fieldset>
          </div>
        </div>
      )}
    </GameConfigShell>
  );
}

function Palette({
  ariaLabel,
  colors,
  value,
  onChange,
}: {
  ariaLabel: string;
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="brush-palette" aria-label={ariaLabel}>
      {colors.map((color) => (
        <button
          key={color}
          aria-label={`Choisir la couleur ${color}`}
          aria-pressed={value.toLowerCase() === color.toLowerCase()}
          className={`brush-swatch ${value.toLowerCase() === color.toLowerCase() ? 'is-active' : ''}`}
          onClick={() => onChange(color)}
          style={{ backgroundColor: color }}
          type="button"
        />
      ))}

      <label className="brush-custom-color">
        <span className="sr-only">{ariaLabel}</span>
        <input
          aria-label={ariaLabel}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          type="color"
          value={value}
        />
        <span aria-hidden="true" className="brush-custom-preview" style={{ backgroundColor: value }} />
      </label>
    </div>
  );
}

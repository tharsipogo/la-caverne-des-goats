'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem, CardTemplateConfig, DEFAULT_CARD_TEMPLATE_CONFIG } from '@/lib/types';
import { fetchCardTemplate, saveCardTemplate } from '@/lib/supabase/cardTemplates';
import { setItemCardValidated } from '@/lib/supabase/cardDeck';
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

  // Réglages propres à l'item actuellement prévisualisé : cadrage de
  // l'image + couleur personnalisée (optionnelle, sinon héritée du
  // deck). Enregistrés ensemble, séparément du modèle par défaut.
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [useCustomColors, setUseCustomColors] = useState(false);
  const [itemAccent, setItemAccent] = useState(DEFAULT_CARD_TEMPLATE_CONFIG.accentColor);
  const [itemNameColor, setItemNameColor] = useState(DEFAULT_CARD_TEMPLATE_CONFIG.nameColor);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemSaved, setItemSaved] = useState(false);
  const [validating, setValidating] = useState(false);

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

  // Recharge les réglages affichés quand on change d'item ou de base.
  useEffect(() => {
    const it = items[previewIndex];
    setCropX(it?.image_crop_x ?? 50);
    setCropY(it?.image_crop_y ?? 50);
    setZoom(it?.image_zoom ?? 1);
    setUseCustomColors(Boolean(it?.card_accent_color || it?.card_name_color));
    setItemAccent(it?.card_accent_color || config.accentColor);
    setItemNameColor(it?.card_name_color || config.nameColor);
    setItemSaved(false);
  }, [previewIndex, items, config.accentColor, config.nameColor]);

  function selectList(id: string) {
    setListId(id);
    router.replace(`/cartes?list=${id}`);
  }

  async function handleSave() {
    if (!listId) return;
    setSaving(true);
    setSaved(false);
    const result = await saveCardTemplate(listId, config);
    setSaving(false);
    if (!result) {
      alert(
        "Erreur à l'enregistrement des couleurs par défaut du deck. Détail dans la console du navigateur (F12)."
      );
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleSaveItemSettings() {
    const it = items[previewIndex];
    if (!it) return;
    setItemSaving(true);
    setItemSaved(false);
    const accentOverride = useCustomColors ? itemAccent : null;
    const nameOverride = useCustomColors ? itemNameColor : null;
    const { error } = await supabase
      .from('items')
      .update({
        image_crop_x: cropX,
        image_crop_y: cropY,
        image_zoom: zoom,
        card_accent_color: accentOverride,
        card_name_color: nameOverride,
      })
      .eq('id', it.id);
    if (error) {
      console.error('Erreur enregistrement réglages carte :', error);
      alert(
        `Erreur à l'enregistrement de cette carte : ${error.message}\n\n` +
          "Si l'erreur mentionne une colonne manquante (card_accent_color, card_name_color...), " +
          'il faut exécuter supabase/migration_card_deck.sql dans l\'éditeur SQL de Supabase.'
      );
    } else {
      setItems((prev) =>
        prev.map((p) =>
          p.id === it.id
            ? {
                ...p,
                image_crop_x: cropX,
                image_crop_y: cropY,
                image_zoom: zoom,
                card_accent_color: accentOverride,
                card_name_color: nameOverride,
              }
            : p
        )
      );
      setItemSaved(true);
      setTimeout(() => setItemSaved(false), 2500);
    }
    setItemSaving(false);
  }

  function resetCrop() {
    setCropX(50);
    setCropY(50);
    setZoom(1);
  }

  async function handleToggleValidated() {
    const it = items[previewIndex];
    if (!it) return;
    setValidating(true);
    const next = !it.card_validated;
    const { error } = await setItemCardValidated(it.id, next);
    if (error) {
      console.error('Erreur validation carte :', error);
      alert(`Erreur à la validation de cette carte : ${error.message}`);
    } else {
      setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, card_validated: next } : p)));
    }
    setValidating(false);
  }

  const currentList = lists.find((l) => l.id === listId) || null;
  const placeholderItem: ListItem = {
    id: '',
    list_id: listId,
    name: 'Exemple de nom',
    image_url: null,
    audio_url: null,
    created_at: '',
    card_validated: false,
    card_accent_color: null,
    card_name_color: null,
  };
  const rawPreviewItem = items[previewIndex] || placeholderItem;
  const previewItem = {
    ...rawPreviewItem,
    image_crop_x: cropX,
    image_crop_y: cropY,
    image_zoom: zoom,
  };
  const previewTemplate: CardTemplateConfig = useCustomColors
    ? { accentColor: itemAccent, nameColor: itemNameColor }
    : config;
  const validatedCount = items.filter((i) => i.card_validated).length;

  if (loading && listId) return <SkeletonCard />;

  return (
    <GameConfigShell
      title="Créer des cartes"
      subtitle={
        currentList
          ? `Valide chaque item en carte pour construire le deck de « ${currentList.name} ». Un deck avec au moins une carte validée devient choisissable dans les jeux.`
          : 'Choisis une base : tu pourras valider ses items un par un pour construire son deck de cartes.'
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
        <>
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
                <GameCard item={previewItem} template={previewTemplate} workName={currentList?.name} className="shadow-2xl" />
              </div>

              <button
                className="btn-secondary text-[12.5px] px-3 py-1.5"
                onClick={() => setPreviewIndex((i) => (i + 1) % items.length)}
              >
                🔀 Item suivant ({previewIndex + 1}/{items.length})
              </button>

              <button
                className={`w-[220px] text-[13px] font-semibold rounded-xl px-4 py-2.5 transition-colors ${
                  rawPreviewItem.card_validated
                    ? 'bg-teal/20 text-teal border border-teal/50'
                    : 'btn'
                }`}
                onClick={handleToggleValidated}
                disabled={validating || !rawPreviewItem.id}
              >
                {rawPreviewItem.card_validated ? '✓ Carte validée — retirer du deck' : '🎴 Valider cette carte'}
              </button>
            </div>

            {/* Réglages */}
            <div className="flex-1 flex flex-col gap-6 min-w-0 brush-controls">
              <fieldset className="brush-control-group">
                <legend>Couleurs par défaut du deck</legend>
                <div className="flex flex-col gap-3">
                  <Palette
                    ariaLabel="Choisir la couleur des détails par défaut"
                    colors={accentColors}
                    value={config.accentColor}
                    onChange={(value) => setConfig((c) => ({ ...c, accentColor: value }))}
                  />
                  <Palette
                    ariaLabel="Choisir la couleur du nom par défaut"
                    colors={nameColors}
                    value={config.nameColor}
                    onChange={(value) => setConfig((c) => ({ ...c, nameColor: value }))}
                  />
                  <button className="btn-secondary w-fit text-[12.5px] px-3 py-1.5" onClick={handleSave} disabled={saving}>
                    {saving ? 'Enregistrement…' : saved ? '✓ Couleurs du deck enregistrées' : 'Enregistrer les couleurs par défaut'}
                  </button>
                </div>
              </fieldset>

              <div className="brush-control-divider" />

              <fieldset className="brush-control-group flex flex-col gap-3">
                <legend>Réglages de cette carte — « {rawPreviewItem.name} »</legend>

                <label className="flex items-center gap-2 text-[12.5px] text-muted">
                  <input
                    type="checkbox"
                    checked={useCustomColors}
                    onChange={(e) => setUseCustomColors(e.target.checked)}
                  />
                  Couleur personnalisée pour cette carte (sinon, couleurs du deck)
                </label>

                {useCustomColors && (
                  <div className="flex flex-col gap-3 pl-1">
                    <Palette
                      ariaLabel="Choisir la couleur des détails de cette carte"
                      colors={accentColors}
                      value={itemAccent}
                      onChange={setItemAccent}
                    />
                    <Palette
                      ariaLabel="Choisir la couleur du nom de cette carte"
                      colors={nameColors}
                      value={itemNameColor}
                      onChange={setItemNameColor}
                    />
                  </div>
                )}

                {rawPreviewItem.image_url && (
                  <>
                    <SliderField label="Position horizontale" value={cropX} min={0} max={100} step={1} onChange={setCropX} />
                    <SliderField label="Position verticale" value={cropY} min={0} max={100} step={1} onChange={setCropY} />
                    <SliderField
                      label="Zoom"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.05}
                      format={(v) => `${v.toFixed(2)}×`}
                      onChange={setZoom}
                    />
                    <button className="btn-secondary w-fit text-[12.5px] px-3 py-1.5" onClick={resetCrop} type="button">
                      ↺ Recentrer l'image
                    </button>
                  </>
                )}

                <button
                  className="btn w-fit text-[12.5px] px-3 py-1.5"
                  onClick={handleSaveItemSettings}
                  disabled={itemSaving || !rawPreviewItem.id}
                  type="button"
                >
                  {itemSaving ? 'Enregistrement…' : itemSaved ? '✓ Réglages enregistrés' : 'Enregistrer les réglages de cette carte'}
                </button>
              </fieldset>
            </div>
          </div>

          {/* Deck */}
          <div className="border-t border-border pt-5 mt-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold text-white">
                Deck de cartes — {validatedCount}/{items.length} validée{validatedCount > 1 ? 's' : ''}
              </h3>
              {validatedCount > 0 && (
                <span className="text-[11.5px] text-teal">✓ Utilisable dans les jeux en mode « Cartes »</span>
              )}
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2">
              {items.map((it, idx) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setPreviewIndex(idx)}
                  title={it.name}
                  className={`relative aspect-square rounded-lg overflow-hidden border bg-white/[0.03] transition-colors ${
                    idx === previewIndex ? 'border-amber' : 'border-border hover:border-borderHover'
                  }`}
                >
                  {it.image_url ? (
                    <Image src={it.image_url} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <span className="flex items-center justify-center h-full text-[10px] text-muted">?</span>
                  )}
                  <span
                    className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      it.card_validated ? 'bg-teal text-[#06231c]' : 'bg-black/60 text-muted'
                    }`}
                  >
                    {it.card_validated ? '✓' : '·'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </GameConfigShell>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-[12.5px] text-muted">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="text-text font-semibold">{format ? format(value) : Math.round(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber"
      />
    </label>
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

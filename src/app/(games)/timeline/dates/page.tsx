'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { MONTHS_FR } from '@/lib/timeline';
import { GameConfigShell } from '@/components/game/GameConfigShell';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface Draft {
  year: string;
  month: string; // '' = pas de mois
}

function draftFromItem(it: ListItem): Draft {
  return {
    year: it.timeline_year != null ? String(it.timeline_year) : '',
    month: it.timeline_month != null ? String(it.timeline_month) : '',
  };
}

export default function TimelineDatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listIdFromUrl = searchParams.get('list');

  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState(listIdFromUrl || '');
  const [items, setItems] = useState<ListItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [onlyUndated, setOnlyUndated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('name');
      setLists((data as GameList[]) || []);
      if (!listIdFromUrl && data && data.length > 0) setListId((data as GameList[])[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!listId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Erreur chargement items :', error);
        alert(`Impossible de charger les items : ${error.message}`);
      }
      const rows = (data as ListItem[]) || [];
      setItems(rows);
      setDrafts(Object.fromEntries(rows.map((r) => [r.id, draftFromItem(r)])));
      setLoading(false);
    })();
  }, [listId]);

  function selectList(id: string) {
    setListId(id);
    router.replace(`/timeline/dates?list=${id}`);
  }

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function isDirty(it: ListItem): boolean {
    const d = drafts[it.id];
    if (!d) return false;
    const orig = draftFromItem(it);
    return d.year.trim() !== orig.year || d.month !== orig.month;
  }

  const dirtyItems = items.filter(isDirty);
  const datedCount = items.filter((it) => it.timeline_year != null).length;
  const visibleItems = onlyUndated ? items.filter((it) => it.timeline_year == null || isDirty(it)) : items;

  async function saveAll() {
    // Validation avant toute écriture : une année par ligne modifiée, ou vide pour effacer la date.
    const updates: { id: string; year: number | null; month: number | null }[] = [];
    for (const it of dirtyItems) {
      const d = drafts[it.id];
      const yearText = d.year.trim();
      if (yearText === '') {
        updates.push({ id: it.id, year: null, month: null });
        continue;
      }
      const year = Number(yearText);
      if (!Number.isInteger(year) || year < 0 || year > 2200) {
        alert(`Année invalide pour « ${it.name} » : « ${yearText} » (entier entre 0 et 2200).`);
        return;
      }
      updates.push({ id: it.id, year, month: d.month === '' ? null : Number(d.month) });
    }
    if (updates.length === 0) return;

    setSaving(true);
    const results = await Promise.all(
      updates.map((u) =>
        supabase.from('items').update({ timeline_year: u.year, timeline_month: u.month }).eq('id', u.id)
      )
    );
    setSaving(false);

    const failedIdx = results.findIndex((r) => r.error);
    const okIds = new Set(updates.filter((_, i) => !results[i].error).map((u) => u.id));

    if (okIds.size > 0) {
      setItems((prev) =>
        prev.map((it) => {
          if (!okIds.has(it.id)) return it;
          const u = updates.find((x) => x.id === it.id)!;
          return { ...it, timeline_year: u.year, timeline_month: u.month };
        })
      );
    }

    if (failedIdx !== -1) {
      const err = results[failedIdx].error!;
      console.error('Erreur enregistrement dates :', err);
      alert(
        `${results.filter((r) => r.error).length} date(s) non enregistrée(s) : ${err.message}\n\n` +
          "Si l'erreur mentionne une colonne manquante (timeline_year, timeline_month), " +
          "exécute supabase/migration_timeline_dates.sql dans l'éditeur SQL de Supabase."
      );
      return;
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  }

  const currentList = lists.find((l) => l.id === listId) || null;

  if (loading && listId && items.length === 0) return <SkeletonCard />;

  return (
    <GameConfigShell
      title="Dater les éléments"
      subtitle="Renseigne le mois (optionnel) et l'année de chaque élément pour pouvoir jouer à Timeline avec cette base. Les éléments sans année sont ignorés par le jeu."
      onBack={() => router.push('/timeline')}
    >
      <div className="flex flex-col gap-2">
        <label className="text-[12.5px] text-muted block">Base</label>
        <select className="input" value={listId} onChange={(e) => selectList(e.target.value)}>
          {lists.length === 0 && <option value="">— Aucune base —</option>}
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {currentList && items.length === 0 ? (
        <p className="text-muted text-[13px]">Cette base n'a pas encore d'item.</p>
      ) : (
        currentList && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[13px] text-text">
                <b>{datedCount}</b>/{items.length} daté{datedCount > 1 ? 's' : ''}
              </span>
              <label className="flex items-center gap-2 text-[12.5px] text-muted cursor-pointer">
                <input type="checkbox" checked={onlyUndated} onChange={(e) => setOnlyUndated(e.target.checked)} />
                Seulement les éléments sans date
              </label>
            </div>

            <div className="flex flex-col gap-2">
              {visibleItems.map((it) => {
                const d = drafts[it.id] || { year: '', month: '' };
                const dirty = isDirty(it);
                return (
                  <div
                    key={it.id}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 bg-surface2 ${
                      dirty ? 'border-amber' : 'border-border'
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-black/30">
                      {it.image_url ? (
                        <Image src={it.image_url} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <span className="flex items-center justify-center h-full text-[11px] text-muted">?</span>
                      )}
                    </div>
                    <span className="flex-1 min-w-0 truncate text-[13.5px] font-medium">{it.name}</span>
                    <select
                      className="input w-[130px] text-[13px]"
                      value={d.month}
                      onChange={(e) => updateDraft(it.id, { month: e.target.value })}
                      aria-label={`Mois de ${it.name}`}
                    >
                      <option value="">— mois —</option>
                      {MONTHS_FR.map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="input w-[90px] text-[13px]"
                      placeholder="Année"
                      value={d.year}
                      onChange={(e) => updateDraft(it.id, { year: e.target.value })}
                      aria-label={`Année de ${it.name}`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 sticky bottom-2">
              <button className="btn w-fit" onClick={saveAll} disabled={saving || dirtyItems.length === 0}>
                {saving
                  ? 'Enregistrement…'
                  : savedFlash
                  ? '✓ Dates enregistrées'
                  : `Enregistrer les dates${dirtyItems.length > 0 ? ` (${dirtyItems.length})` : ''}`}
              </button>
            </div>
          </>
        )
      )}
    </GameConfigShell>
  );
}

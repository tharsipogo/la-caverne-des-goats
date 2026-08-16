'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_TIER_LABELS, GameList, ListItem, TierAssignment, TierRow, TIER_COLOR_PALETTE } from '@/lib/types';

function normalizeTierRows(raw: any): TierRow[] {
  const arr = Array.isArray(raw) && raw.length > 0 ? raw : DEFAULT_TIER_LABELS;
  return arr.map((entry: any, i: number) => {
    if (typeof entry === 'string') {
      return { label: entry, color: TIER_COLOR_PALETTE[i % TIER_COLOR_PALETTE.length] };
    }
    return {
      label: entry?.label ?? `T${i + 1}`,
      color: entry?.color ?? TIER_COLOR_PALETTE[i % TIER_COLOR_PALETTE.length],
    };
  });
}

// Choisit une couleur de texte lisible (clair/foncé) selon la couleur de fond du tier.
function textColorFor(bgHex: string): string {
  const hex = bgHex.replace('#', '');
  if (hex.length !== 6) return '#1a1408';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#1a1408' : '#f2f0e8';
}

export default function TierPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);
  const [assignments, setAssignments] = useState<TierAssignment[]>([]);
  const [tierRows, setTierRows] = useState<TierRow[]>(normalizeTierRows(null));
  const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      const withItems: GameList[] = [];
      if (data) {
        for (const l of data as GameList[]) {
          const { count } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('list_id', l.id);
          if (count && count > 0) withItems.push(l);
        }
      }
      setLists(withItems);
      if (withItems.length > 0) setListId(withItems[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!listId) return;
    loadListData(listId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  async function loadListData(id: string) {
    const { data: list } = await supabase.from('lists').select('*').eq('id', id).single();
    if (list) setTierRows(normalizeTierRows((list as GameList).tier_labels));
    const { data: itemsData } = await supabase.from('items').select('*').eq('list_id', id);
    if (itemsData) setItems(itemsData as ListItem[]);
    const { data: assignData } = await supabase
      .from('tier_assignments')
      .select('*')
      .eq('list_id', id)
      .order('position', { ascending: true });
    if (assignData) setAssignments(assignData as TierAssignment[]);
  }

  async function saveTierRows(rows: TierRow[]) {
    setTierRows(rows);
    await supabase.from('lists').update({ tier_labels: rows }).eq('id', listId);
  }

  function itemsByTier(tier: string): ListItem[] {
    return assignments
      .filter((a) => a.tier === tier)
      .sort((a, b) => a.position - b.position)
      .map((a) => items.find((it) => it.id === a.item_id))
      .filter(Boolean) as ListItem[];
  }

  const unassigned = items.filter((it) => !assignments.find((a) => a.item_id === it.id));

  // Place (ou déplace/réordonne) un item dans une ligne, à un index précis de cette ligne.
  async function moveItemToTier(itemId: string, tier: string, targetIndex: number) {
    const currentOrder = itemsByTier(tier)
      .map((it) => it.id)
      .filter((id) => id !== itemId);
    const clamped = Math.max(0, Math.min(targetIndex, currentOrder.length));
    currentOrder.splice(clamped, 0, itemId);

    const rows = currentOrder.map((id, i) => ({ list_id: listId, item_id: id, tier, position: i }));
    await supabase.from('tier_assignments').upsert(rows, { onConflict: 'list_id,item_id' });
    loadListData(listId);
  }

  async function unassignItem(itemId: string) {
    await supabase.from('tier_assignments').delete().eq('list_id', listId).eq('item_id', itemId);
    loadListData(listId);
  }

  async function resetTiers() {
    if (!confirm('Réinitialiser tout le classement de cette tier list ?')) return;
    await supabase.from('tier_assignments').delete().eq('list_id', listId);
    loadListData(listId);
  }

  function addTierRow() {
    const next = [...tierRows, { label: 'Nouveau', color: TIER_COLOR_PALETTE[tierRows.length % TIER_COLOR_PALETTE.length] }];
    saveTierRows(next);
  }

  async function removeTierRow(index: number) {
    const row = tierRows[index];
    if (!confirm(`Supprimer la ligne "${row.label}" ? Les items qu'elle contient repasseront en "Non classés".`)) return;
    await supabase.from('tier_assignments').delete().eq('list_id', listId).eq('tier', row.label);
    const next = tierRows.filter((_, i) => i !== index);
    await saveTierRows(next);
    loadListData(listId);
  }

  function updateRowColor(index: number, color: string) {
    const next = [...tierRows];
    next[index] = { ...next[index], color };
    saveTierRows(next);
  }

  function commitLabelEdit(index: number, value: string) {
    const v = value.trim() || tierRows[index].label;
    const oldLabel = tierRows[index].label;
    const next = [...tierRows];
    next[index] = { ...next[index], label: v };
    saveTierRows(next);
    setEditingLabelIdx(null);
    // Les assignments référencent le tier par son nom : on les met à jour si le nom a changé.
    if (oldLabel !== v) {
      supabase.from('tier_assignments').update({ tier: v }).eq('list_id', listId).eq('tier', oldLabel).then(() => loadListData(listId));
    }
  }

  return (
    <div>
      <div className="mb-7">
        <div className="eyebrow">Mode</div>
        <h1 className="font-serif text-3xl">Tier List</h1>
        <p className="text-muted mt-2 text-[14.5px] max-w-xl">
          Glisse chaque item dans sa rangée, ou dépose-le sur un autre item pour choisir sa place exacte. Clique sur le nom
          d'une ligne pour le renommer, et utilise la pastille pour changer sa couleur.
        </p>
      </div>

      {lists.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">Crée d'abord une base avec des items dans "Mes bases".</p>
      ) : (
        <>
          <div className="panel py-4 flex items-center gap-3">
            <label className="text-[13px] text-muted">Base :</label>
            <select className="input w-auto" value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({items.length && l.id === listId ? items.length : ''})</option>
              ))}
            </select>
          </div>

          {tierRows.map((row, i) => (
            <div key={i} className="flex border border-border rounded-lg mb-2.5 overflow-hidden min-h-[86px]">
              <div
                className="w-[100px] shrink-0 flex items-center justify-center text-center font-serif font-bold cursor-pointer px-2 py-2 leading-tight"
                style={{ background: row.color, color: textColorFor(row.color) }}
                onClick={() => setEditingLabelIdx(i)}
              >
                {editingLabelIdx === i ? (
                  <input
                    autoFocus
                    className="w-full text-center bg-white/70 rounded text-[#1a1408] text-sm font-bold px-1 py-1"
                    defaultValue={row.label}
                    maxLength={24}
                    onBlur={(e) => commitLabelEdit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                  />
                ) : (
                  <span className="text-base line-clamp-2 break-words">{row.label}</span>
                )}
              </div>

              <div className="w-11 shrink-0 bg-surface border-r border-border flex flex-col items-center justify-center gap-2 py-2">
                <input
                  type="color"
                  value={row.color}
                  onChange={(e) => updateRowColor(i, e.target.value)}
                  title="Changer la couleur de cette ligne"
                  className="w-6 h-6 rounded cursor-pointer border border-border bg-transparent p-0"
                />
                <button
                  onClick={() => removeTierRow(i)}
                  title="Supprimer cette ligne"
                  className="text-muted hover:text-red text-xs leading-none"
                >
                  ✕
                </button>
              </div>

              <div
                className="flex-1 bg-surface flex flex-wrap gap-2.5 p-2.5 content-start"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => draggedItemId && moveItemToTier(draggedItemId, row.label, itemsByTier(row.label).length)}
              >
                {itemsByTier(row.label).map((it, idx) => (
                  <Chip
                    key={it.id}
                    item={it}
                    onDragStart={() => setDraggedItemId(it.id)}
                    onDropHere={() => draggedItemId && moveItemToTier(draggedItemId, row.label, idx)}
                  />
                ))}
              </div>
            </div>
          ))}

          <button className="btn-ghost btn-small mt-1 mb-6" onClick={addTierRow}>+ Ajouter une ligne</button>

          <div className="eyebrow mt-2">Non classés</div>
          <div
            className="mt-2 border-[1.5px] border-dashed border-border rounded-lg p-3.5 flex flex-wrap gap-2.5 min-h-[70px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => draggedItemId && unassignItem(draggedItemId)}
          >
            {unassigned.map((it) => (
              <Chip key={it.id} item={it} onDragStart={() => setDraggedItemId(it.id)} />
            ))}
          </div>

          <button className="btn-ghost btn-small mt-4" onClick={resetTiers}>↺ Réinitialiser cette tier list</button>
        </>
      )}
    </div>
  );
}

function Chip({
  item,
  onDragStart,
  onDropHere,
}: {
  item: ListItem;
  onDragStart: () => void;
  onDropHere?: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => onDropHere && e.preventDefault()}
      onDrop={(e) => {
        if (!onDropHere) return;
        e.preventDefault();
        e.stopPropagation();
        onDropHere();
      }}
      className="flex items-center gap-2 bg-surface2 border border-border rounded-lg pl-1.5 pr-2.5 py-1.5 text-[13px] cursor-grab select-none"
    >
      {item.image_url && <img src={item.image_url} className="w-[52px] h-[52px] rounded object-cover" alt="" />}
      <span>{item.name}</span>
    </div>
  );
}

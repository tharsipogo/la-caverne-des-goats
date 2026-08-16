'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_TIER_LABELS, GameList, ListItem, TierAssignment } from '@/lib/types';

const TIER_COLORS: Record<number, string> = {
  0: '#e2645a',
  1: '#e8ab4f',
  2: '#e8d24f',
  3: '#8fd15c',
  4: '#4fc9c0',
  5: '#8b8d97',
};

export default function TierPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);
  const [assignments, setAssignments] = useState<TierAssignment[]>([]);
  const [labels, setLabels] = useState<string[]>(DEFAULT_TIER_LABELS);
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
    if (list) setLabels((list as GameList).tier_labels?.length ? (list as GameList).tier_labels : DEFAULT_TIER_LABELS);
    const { data: itemsData } = await supabase.from('items').select('*').eq('list_id', id);
    if (itemsData) setItems(itemsData as ListItem[]);
    const { data: assignData } = await supabase.from('tier_assignments').select('*').eq('list_id', id);
    if (assignData) setAssignments(assignData as TierAssignment[]);
  }

  async function saveLabels(newLabels: string[]) {
    setLabels(newLabels);
    await supabase.from('lists').update({ tier_labels: newLabels }).eq('id', listId);
  }

  async function assignItem(itemId: string, tier: string | null) {
    if (tier === null) {
      await supabase.from('tier_assignments').delete().eq('list_id', listId).eq('item_id', itemId);
    } else {
      await supabase.from('tier_assignments').upsert(
        { list_id: listId, item_id: itemId, tier },
        { onConflict: 'list_id,item_id' }
      );
    }
    loadListData(listId);
  }

  async function resetTiers() {
    if (!confirm('Réinitialiser tout le classement de cette tier list ?')) return;
    await supabase.from('tier_assignments').delete().eq('list_id', listId);
    loadListData(listId);
  }

  const itemsByTier = (tier: string) => items.filter((it) => assignments.find((a) => a.item_id === it.id)?.tier === tier);
  const unassigned = items.filter((it) => !assignments.find((a) => a.item_id === it.id));

  return (
    <div>
      <div className="mb-7">
        <div className="eyebrow">Mode</div>
        <h1 className="font-serif text-3xl">Tier List</h1>
        <p className="text-muted mt-2 text-[14.5px] max-w-xl">
          Glisse chaque item dans sa rangée. Clique sur une lettre pour renommer le tier. Sauvegarde automatique.
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

          {labels.map((label, i) => (
            <div key={i} className="flex border border-border rounded-lg mb-2.5 overflow-hidden min-h-[86px]">
              <div
                className="w-[74px] shrink-0 flex items-center justify-center font-serif text-2xl font-bold text-[#1a1408] cursor-pointer"
                style={{ background: TIER_COLORS[i] || '#8b8d97' }}
                onClick={() => setEditingLabelIdx(i)}
              >
                {editingLabelIdx === i ? (
                  <input
                    autoFocus
                    className="w-11 text-center bg-white/70 rounded text-[#1a1408] text-lg font-bold"
                    defaultValue={label}
                    maxLength={4}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || label;
                      const next = [...labels];
                      next[i] = v;
                      saveLabels(next);
                      setEditingLabelIdx(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                  />
                ) : (
                  label
                )}
              </div>
              <div
                className="flex-1 bg-surface flex flex-wrap gap-2.5 p-2.5 content-start"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => draggedItemId && assignItem(draggedItemId, label)}
              >
                {itemsByTier(label).map((it) => (
                  <Chip key={it.id} item={it} onDragStart={() => setDraggedItemId(it.id)} />
                ))}
              </div>
            </div>
          ))}

          <div className="eyebrow mt-6">Non classés</div>
          <div
            className="mt-2 border-[1.5px] border-dashed border-border rounded-lg p-3.5 flex flex-wrap gap-2.5 min-h-[70px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => draggedItemId && assignItem(draggedItemId, null)}
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

function Chip({ item, onDragStart }: { item: ListItem; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 bg-surface2 border border-border rounded-lg pl-1.5 pr-2.5 py-1.5 text-[13px] cursor-grab select-none"
    >
      {item.image_url && <img src={item.image_url} className="w-[70px] h-[70px] rounded object-cover" alt="" />}
      <span>{item.name}</span>
    </div>
  );
}

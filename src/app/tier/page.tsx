'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_TIER_LABELS, GameList, ListItem, TierAssignment, TierRow, TIER_COLOR_PALETTE } from '@/lib/types';
import { fetchListItemMeta } from '@/lib/utils';

const POPOVER_PALETTE = [
  '#ef5350', '#ff7043', '#ffa726', '#ffca28', '#d4e157',
  '#9ccc65', '#26a69a', '#4dd0e1', '#42a5f5', '#7e57c2',
  '#ec407a', '#78909c', '#bdbdbd', '#ffffff',
];

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

function textColorFor(bgHex: string): string {
  const hex = bgHex.replace('#', '');
  if (hex.length !== 6) return '#101118';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#101118' : '#ffffff';
}

export default function TierPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);
  const [assignments, setAssignments] = useState<TierAssignment[]>([]);
  const [tierRows, setTierRows] = useState<TierRow[]>(normalizeTierRows(null));
  const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null);
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | 'pool' | null>(null);

  // État mobile : item actuellement sélectionné au clic/tap pour déplacement rapide
  const [selectedMobileItem, setSelectedMobileItem] = useState<ListItem | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      const { counts } = await fetchListItemMeta();
      const withItems = ((data as GameList[]) || []).filter((l) => (counts.get(l.id) || 0) > 0);
      setLists(withItems);
      if (withItems.length > 0) setListId(withItems[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!listId) return;
    loadListData(listId);
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
    const { error } = await supabase.from('lists').update({ tier_labels: rows }).eq('id', listId);
    if (error) {
      console.error('Erreur saveTierRows :', error);
      alert("Erreur lors de la sauvegarde des lignes : " + error.message);
    }
  }

  function itemsByTier(tier: string): ListItem[] {
    return assignments
      .filter((a) => a.tier === tier)
      .sort((a, b) => a.position - b.position)
      .map((a) => items.find((it) => it.id === a.item_id))
      .filter(Boolean) as ListItem[];
  }

  const unassigned = items.filter((it) => !assignments.find((a) => a.item_id === it.id));

  async function moveItemToTier(itemId: string, tier: string, targetIndex: number) {
    const currentOrder = itemsByTier(tier)
      .map((it) => it.id)
      .filter((id) => id !== itemId);
    const clamped = Math.max(0, Math.min(targetIndex, currentOrder.length));
    currentOrder.splice(clamped, 0, itemId);

    const rows = currentOrder.map((id, i) => ({ list_id: listId, item_id: id, tier, position: i }));
    await supabase.from('tier_assignments').upsert(rows, { onConflict: 'list_id,item_id' });
    setSelectedMobileItem(null);
    loadListData(listId);
  }

  async function unassignItem(itemId: string) {
    await supabase.from('tier_assignments').delete().eq('list_id', listId).eq('item_id', itemId);
    setSelectedMobileItem(null);
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

    const { error: delErr } = await supabase.from('tier_assignments').delete().eq('list_id', listId).eq('tier', row.label);
    if (delErr) {
      console.error('Erreur suppression assignments :', delErr);
      alert('Erreur lors du retrait des items de la ligne : ' + delErr.message);
      return;
    }

    const next = tierRows.filter((_, i) => i !== index);
    setTierRows(next);
    const { error: updErr } = await supabase.from('lists').update({ tier_labels: next }).eq('id', listId);
    if (updErr) {
      console.error('Erreur sauvegarde tier_labels :', updErr);
      alert('Erreur lors de la sauvegarde : ' + updErr.message);
    }
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
    if (oldLabel !== v) {
      supabase.from('tier_assignments').update({ tier: v }).eq('list_id', listId).eq('tier', oldLabel).then(() => loadListData(listId));
    }
  }

  return (
    <div className="flex flex-col md:h-full">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap shrink-0">
        <div>
          <div className="eyebrow">Mode</div>
          <h1 className="font-sans font-extrabold text-3xl">Tier List</h1>
        </div>
        {lists.length > 0 && (
          <div className="flex items-center gap-2.5">
            <label className="text-[12px] text-muted font-semibold">Base</label>
            <select className="input w-auto" value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {lists.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">Crée d'abord une base avec des items dans "Mes bases".</p>
      ) : (
        <div
          className="flex flex-col md:flex-row gap-5 md:flex-1 md:min-h-0 relative"
          onClick={() => {
            setColorPickerIdx(null);
            setSelectedMobileItem(null);
          }}
        >
          {/* ── Colonne gauche : les lignes de tier ── */}
          <div className="flex-1 md:overflow-y-auto md:pr-1 flex flex-col">
            {tierRows.map((row, i) => {
              const isDropTarget = dropTarget === row.label && draggedItemId !== null;
              return (
                <div key={i} className="group flex border border-border rounded-xl mb-2.5 min-h-[88px] shrink-0">
                  <div
                    className="relative w-[104px] shrink-0 flex flex-col items-center justify-center text-center px-2 py-2 rounded-l-xl cursor-pointer"
                    style={{ background: row.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedMobileItem) {
                        moveItemToTier(selectedMobileItem.id, row.label, itemsByTier(row.label).length);
                      }
                    }}
                  >
                    {editingLabelIdx === i ? (
                      <input
                        autoFocus
                        className="w-full text-center bg-white/25 rounded px-1 py-1 font-black text-[18px] outline-none"
                        style={{ color: textColorFor(row.color) }}
                        defaultValue={row.label}
                        maxLength={24}
                        onBlur={(e) => commitLabelEdit(i, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        onClick={(e) => { e.stopPropagation(); setEditingLabelIdx(i); setColorPickerIdx(null); }}
                        className="font-black text-[22px] leading-none select-none cursor-text line-clamp-2 break-words"
                        style={{ color: textColorFor(row.color) }}
                      >
                        {row.label}
                      </span>
                    )}

                    {/* Icônes au survol ou au tap */}
                    <div
                      className="absolute bottom-[7px] left-0 right-0 flex items-center justify-center gap-[7px] md:opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setColorPickerIdx(colorPickerIdx === i ? null : i)}
                        title="Changer la couleur"
                        className="w-[15px] h-[15px] rounded-[3px] border hover:scale-125 transition-transform"
                        style={{ borderColor: textColorFor(row.color) + '99' }}
                      />
                      <button
                        onClick={() => removeTierRow(i)}
                        title="Supprimer cette ligne"
                        className="text-[15px] font-bold leading-none hover:scale-125 transition-transform"
                        style={{ color: textColorFor(row.color) + 'aa' }}
                      >
                        ×
                      </button>
                    </div>

                    {colorPickerIdx === i && (
                      <div
                        className="absolute z-50 top-full mt-1.5 left-1/2 -translate-x-1/2 grid grid-cols-7 gap-[5px] p-2 rounded-lg bg-surface2 border border-border shadow-xl"
                        style={{ width: 164 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {POPOVER_PALETTE.map((c) => (
                          <button
                            key={c}
                            onClick={() => { updateRowColor(i, c); setColorPickerIdx(null); }}
                            className="rounded-[3px] hover:scale-125 transition-transform"
                            style={{
                              background: c,
                              width: 16,
                              height: 16,
                              border: row.color === c ? '2px solid #f3f4f6' : '1px solid rgba(255,255,255,0.15)',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className="flex-1 flex flex-wrap gap-2 p-2.5 items-center content-start rounded-r-xl transition-colors cursor-pointer"
                    style={{
                      background: isDropTarget ? row.color + '14' : '#161822',
                      outline: isDropTarget ? `1px dashed ${row.color}88` : 'none',
                      outlineOffset: '-4px',
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDropTarget(row.label); }}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={() => { if (draggedItemId) moveItemToTier(draggedItemId, row.label, itemsByTier(row.label).length); setDropTarget(null); }}
                    onClick={(e) => {
                      if (selectedMobileItem) {
                        e.stopPropagation();
                        moveItemToTier(selectedMobileItem.id, row.label, itemsByTier(row.label).length);
                      }
                    }}
                  >
                    {itemsByTier(row.label).map((it, idx) => (
                      <ItemChip
                        key={it.id}
                        item={it}
                        isSelected={selectedMobileItem?.id === it.id}
                        onDragStart={() => setDraggedItemId(it.id)}
                        onDropHere={() => draggedItemId && moveItemToTier(draggedItemId, row.label, idx)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMobileItem(selectedMobileItem?.id === it.id ? null : it);
                        }}
                      />
                    ))}
                    {isDropTarget && itemsByTier(row.label).length === 0 && (
                      <p className="text-[11px] m-auto" style={{ color: row.color + 'aa' }}>Déposer ici</p>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center gap-3 mt-1 shrink-0">
              <button className="btn-ghost btn-small" onClick={addTierRow}>+ Ajouter une ligne</button>
              <button className="btn-ghost btn-small border-transparent" onClick={resetTiers}>↺ Réinitialiser</button>
            </div>
          </div>

          {/* ── Colonne droite : Non classés ── */}
          <div className="md:w-[240px] shrink-0 flex flex-col md:h-full">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <span className="eyebrow mb-0">Non classés</span>
              <span className="text-[11px] font-bold text-faint">{unassigned.length}</span>
            </div>
            <div
              className="flex-1 md:overflow-y-auto border-[1.5px] border-dashed border-border rounded-xl p-2.5 flex flex-wrap content-start gap-2 min-h-[100px] cursor-pointer"
              style={{
                background: dropTarget === 'pool' ? 'rgba(245,158,11,0.04)' : 'transparent',
                outline: dropTarget === 'pool' ? '1px dashed rgba(245,158,11,0.3)' : 'none',
                outlineOffset: '-4px',
              }}
              onDragOver={(e) => { e.preventDefault(); setDropTarget('pool'); }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={() => { if (draggedItemId) unassignItem(draggedItemId); setDropTarget(null); }}
              onClick={(e) => {
                if (selectedMobileItem) {
                  e.stopPropagation();
                  unassignItem(selectedMobileItem.id);
                }
              }}
            >
              {unassigned.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 w-full py-10 opacity-40">
                  <span className="text-xl">🎉</span>
                  <p className="text-muted text-[11px] text-center">Tous classés !</p>
                </div>
              ) : (
                unassigned.map((it) => (
                  <ItemChip
                    key={it.id}
                    item={it}
                    isSelected={selectedMobileItem?.id === it.id}
                    onDragStart={() => setDraggedItemId(it.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMobileItem(selectedMobileItem?.id === it.id ? null : it);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Modal Popover Tactile pour Mobile quand une carte est cliquée ── */}
          {selectedMobileItem && (
            <div
              className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-[#1e202e] border-2 border-amber-500 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 w-[92%] max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-amber-400 truncate max-w-[200px]">
                  Classer : {selectedMobileItem.name}
                </span>
                <button
                  onClick={() => setSelectedMobileItem(null)}
                  className="text-xs text-muted hover:text-white px-2 font-bold"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pt-1">
                {tierRows.map((row) => (
                  <button
                    key={row.label}
                    onClick={() => moveItemToTier(selectedMobileItem.id, row.label, itemsByTier(row.label).length)}
                    className="px-2 py-2 rounded-lg text-xs font-black text-center truncate border border-white/10"
                    style={{ background: row.color, color: textColorFor(row.color) }}
                  >
                    {row.label}
                  </button>
                ))}
                <button
                  onClick={() => unassignItem(selectedMobileItem.id)}
                  className="col-span-3 px-2 py-1.5 rounded-lg text-[11px] font-bold text-center bg-surface2 border border-border text-muted"
                >
                  Remettre en Non Classés
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItemChip({
  item,
  isSelected,
  onDragStart,
  onDropHere,
  onClick,
}: {
  item: ListItem;
  isSelected?: boolean;
  onDragStart: () => void;
  onDropHere?: () => void;
  onClick?: (e: React.MouseEvent) => void;
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
      onClick={onClick}
      className={`flex flex-col items-center rounded-[10px] overflow-hidden select-none cursor-pointer bg-surface2 border transition ${
        isSelected
          ? 'border-amber-500 scale-105 shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-2 ring-amber-500/50'
          : 'border-border hover:border-borderHover hover:scale-[1.05]'
      }`}
      style={{ width: 72 }}
    >
      {item.image_url ? (
        <img src={item.image_url} className="w-full object-cover" style={{ height: 54 }} alt="" />
      ) : (
        <div className="w-full flex items-center justify-center bg-surface text-lg" style={{ height: 54 }}>🎴</div>
      )}
      <p className="text-[10px] font-semibold text-text text-center px-1 py-1.5 truncate w-full leading-tight">
        {item.name}
      </p>
    </div>
  );
}
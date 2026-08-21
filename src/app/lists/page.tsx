'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem, ListType } from '@/lib/types';
import { fetchListItemMeta, nameFromFilename, uploadItemAudio, uploadItemImage } from '@/lib/utils';

interface ListMeta extends GameList {
  itemCount: number;
  thumbnailUrl: string | null;
}

type TypeFilter = 'all' | ListType;

const TYPE_LABEL: Record<ListType, string> = { image: 'Images', audio: 'Audio', text: 'Texte' };
const TYPE_BADGE: Record<ListType, string> = {
  image: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  audio: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  text: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
};
const TYPE_ICON: Record<ListType, string> = { image: '🖼', audio: '🎵', text: '✎' };

export default function ListsPage() {
  const [lists, setLists] = useState<ListMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  async function loadLists() {
    setLoading(true);
    const { data, error } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const { counts, firstImages } = await fetchListItemMeta();
      const withMeta: ListMeta[] = (data as GameList[]).map((l) => ({
        ...l,
        itemCount: counts.get(l.id) || 0,
        thumbnailUrl: l.type === 'image' ? firstImages.get(l.id) || null : null,
      }));
      setLists(withMeta);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadLists();
  }, []);

  async function deleteList(id: string) {
    if (!confirm('Supprimer cette base et tous ses items ?')) return;
    await supabase.from('lists').delete().eq('id', id);
    await loadLists();
  }

  const openList = lists.find((l) => l.id === openListId) || null;

  if (openList) {
    return (
      <ListDetail
        list={openList}
        onBack={() => {
          setOpenListId(null);
          loadLists();
        }}
      />
    );
  }

  const totalElements = lists.reduce((sum, l) => sum + l.itemCount, 0);
  const filtered = lists.filter((l) => {
    if (typeFilter !== 'all' && l.type !== typeFilter) return false;
    if (search.trim() && !l.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-7 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">Bibliothèque</div>
          <h1 className="font-serif text-3xl">Mes bases</h1>
          <p className="text-muted mt-2 text-[14.5px] max-w-xl">Tes collections réutilisables pour tes jeux.</p>
        </div>
        <button className="btn h-fit" onClick={() => setModalOpen(true)}>+ Nouvelle base</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-surface2 flex items-center justify-center text-xl">📚</div>
          <div>
            <div className="font-serif text-2xl font-bold leading-none">{lists.length}</div>
            <div className="text-muted text-[12.5px]">collections</div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-surface2 flex items-center justify-center text-xl">🏷️</div>
          <div>
            <div className="font-serif text-2xl font-bold leading-none">{totalElements}</div>
            <div className="text-muted text-[12.5px]">éléments</div>
          </div>
        </div>
      </div>

      <input
        className="input mb-3.5"
        placeholder="Rechercher une base..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          ['all', 'Toutes'],
          ['image', 'Images'],
          ['audio', 'Audio'],
          ['text', 'Texte'],
        ] as [TypeFilter, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTypeFilter(val)}
            className={`px-3.5 py-2 rounded-lg text-sm border font-medium ${
              typeFilter === val ? 'border-amber text-amber bg-surface2' : 'border-border text-text bg-surface2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted mt-6">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">
          {lists.length === 0 ? "Aucune base pour l'instant — clique sur \"+ Nouvelle base\"." : 'Aucune base ne correspond à ta recherche.'}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
          {filtered.map((l) => (
            <div key={l.id} className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-amberDim transition flex flex-col">
              <div className="relative h-32 bg-gradient-to-br from-surface2 to-bg flex items-center justify-center group">
                {l.cover_image_url || l.thumbnailUrl ? (
                  <img src={l.cover_image_url || l.thumbnailUrl!} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-4xl opacity-30">{TYPE_ICON[l.type]}</span>
                )}
                <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase px-2 py-1 rounded-md ${TYPE_BADGE[l.type]}`}>
                  {TYPE_LABEL[l.type]}
                </span>
                <label
                  className="absolute top-2 right-2 w-7 h-7 rounded-md bg-black/60 border border-white/20 flex items-center justify-center text-xs cursor-pointer opacity-0 group-hover:opacity-100 transition"
                  title="Changer l'image de couverture"
                >
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadItemImage(file);
                      await supabase.from('lists').update({ cover_image_url: url }).eq('id', l.id);
                      loadLists();
                    }}
                  />
                </label>
              </div>
              <div className="p-4 flex flex-col gap-1 flex-1">
                <h3 className="font-serif text-lg leading-tight">{l.name}</h3>
                <p className="text-muted text-[13px]">{l.itemCount} élément{l.itemCount !== 1 ? 's' : ''}</p>
                <div className="mt-auto pt-3 flex gap-2">
                  <button className="btn-secondary btn-small flex-1" onClick={() => setOpenListId(l.id)}>Ouvrir</button>
                  <button className="btn-danger btn-small flex-1" onClick={() => deleteList(l.id)}>Supprimer</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <NewBaseModal
          onClose={() => setModalOpen(false)}
          onCreated={(id) => {
            setModalOpen(false);
            loadLists();
            setOpenListId(id);
          }}
        />
      )}
    </div>
  );
}

function NewBaseModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ListType>('image');
  const [files, setFiles] = useState<File[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [creating, setCreating] = useState(false);

  function addFiles(list: FileList | File[]) {
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.from('lists').insert({ name: trimmed, type }).select().single();
      if (error || !data) throw error || new Error('Création impossible');
      const listId = (data as GameList).id;

      if (coverFile) {
        const coverUrl = await uploadItemImage(coverFile);
        await supabase.from('lists').update({ cover_image_url: coverUrl }).eq('id', listId);
      }

      if (type === 'text') {
        const names = bulkText.split('\n').map((n) => n.trim()).filter(Boolean);
        if (names.length > 0) {
          await supabase.from('items').insert(names.map((n) => ({ list_id: listId, name: n })));
        }
      } else {
        for (const file of files) {
          const itemName = nameFromFilename(file.name);
          if (type === 'audio') {
            const audio_url = await uploadItemAudio(file);
            await supabase.from('items').insert({ list_id: listId, name: itemName, audio_url });
          } else {
            const image_url = await uploadItemImage(file);
            await supabase.from('items').insert({ list_id: listId, name: itemName, image_url });
          }
        }
      }
      onCreated(listId);
    } catch (e) {
      alert('Erreur : ' + (e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl font-bold">Nouvelle base</h2>
          <button className="w-8 h-8 rounded-lg bg-surface2 border border-border flex items-center justify-center text-muted hover:text-text" onClick={onClose}>
            ✕
          </button>
        </div>

        <label className="text-[11px] uppercase tracking-wider text-muted block mb-1.5">Nom de la base</label>
        <input
          autoFocus
          className="input mb-5"
          placeholder="Ex. Mes jeux Zelda préférés"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="text-[11px] uppercase tracking-wider text-muted block mb-1.5">
          Image de couverture (optionnelle — juste pour l'affichage, pas liée au contenu)
        </label>
        <label className="flex items-center gap-3 border border-border rounded-xl p-3 mb-5 cursor-pointer hover:border-amberDim transition">
          <div className="w-14 h-14 rounded-lg bg-surface2 overflow-hidden flex items-center justify-center shrink-0">
            {coverFile ? (
              <img src={URL.createObjectURL(coverFile)} className="w-full h-full object-cover" alt="" />
            ) : (
              <span className="text-lg opacity-40">🖼</span>
            )}
          </div>
          <span className="text-[13px] text-muted">
            {coverFile ? coverFile.name : <>Choisir une image <span className="text-amber underline">parcourir</span></>}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setCoverFile(e.target.files[0])}
          />
        </label>

        <label className="text-[11px] uppercase tracking-wider text-muted block mb-1.5">Type de contenu</label>
        <div className="flex gap-2 mb-5">
          {([
            ['image', '🖼 Images'],
            ['audio', '🎵 Audio'],
            ['text', 'T Texte'],
          ] as [ListType, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setType(val)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium border ${
                type === val ? 'bg-amber text-[#1a1408] border-amber' : 'bg-surface2 text-text border-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {type === 'text' ? (
          <>
            <label className="text-[11px] uppercase tracking-wider text-muted block mb-1.5">
              Noms (un par ligne, optionnel — tu pourras en ajouter après)
            </label>
            <textarea
              className="input min-h-[120px]"
              placeholder={'Ocarina of Time\nMajora\'s Mask\nBreath of the Wild'}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
          </>
        ) : (
          <>
            <label className="text-[11px] uppercase tracking-wider text-muted block mb-1.5">Fichiers (optionnel — tu pourras en ajouter après)</label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 text-center transition ${
                dragOver ? 'border-amber bg-surface2' : 'border-border'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-surface2 border border-border flex items-center justify-center text-lg">
                ⬆️
              </div>
              <div className="text-[14px] font-medium">Glisse tes fichiers ici</div>
              <label className="text-[13px] text-muted cursor-pointer">
                ou <span className="text-amber underline">parcourir</span>
                <input
                  type="file"
                  multiple
                  accept={type === 'audio' ? 'audio/*' : 'image/*'}
                  className="hidden"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
              </label>
              {files.length > 0 && (
                <div className="text-[12.5px] text-amber mt-1">{files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}</div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2.5 mt-6">
          <button className="btn-ghost" onClick={onClose} disabled={creating}>Annuler</button>
          <button className="btn" onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? 'Création…' : 'Créer la base'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListDetail({ list, onBack }: { list: GameList; onBack: () => void }) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [singleName, setSingleName] = useState('');
  const [bulkText, setBulkText] = useState('');

  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('list_id', list.id)
      .order('created_at', { ascending: true });
    if (!error && data) setItems(data as ListItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.id]);

  async function addSingleTextItem() {
    const name = singleName.trim();
    if (!name) return;
    await supabase.from('items').insert({ list_id: list.id, name });
    setSingleName('');
    loadItems();
  }

  async function addBulkTextItems() {
    const names = bulkText
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    await supabase.from('items').insert(names.map((name) => ({ list_id: list.id, name })));
    setBulkText('');
    loadItems();
  }

  // Ajout de PLUSIEURS fichiers (images ou audio) en une fois
  async function handleMultiFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fileArr = Array.from(files);
      for (const file of fileArr) {
        const name = nameFromFilename(file.name);
        if (list.type === 'audio') {
          const audio_url = await uploadItemAudio(file);
          await supabase.from('items').insert({ list_id: list.id, name, audio_url });
        } else {
          const image_url = await uploadItemImage(file);
          await supabase.from('items').insert({ list_id: list.id, name, image_url });
        }
      }
      await loadItems();
    } catch (e) {
      alert("Erreur pendant l'upload d'un fichier : " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteItem(id: string) {
    await supabase.from('items').delete().eq('id', id);
    loadItems();
  }

  return (
    <div>
      <button className="text-muted text-[13px] flex items-center gap-1.5 mb-4 hover:text-amber" onClick={onBack}>
        ← Toutes les bases
      </button>
      <div className="mb-7 flex items-center gap-3">
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${TYPE_BADGE[list.type]}`}>
          {TYPE_LABEL[list.type]}
        </span>
      </div>
      <div className="mb-7">
        <h1 className="font-serif text-3xl">{list.name}</h1>
        <p className="text-muted mt-2 text-[14.5px]">{items.length} item{items.length > 1 ? 's' : ''}</p>
      </div>

      {list.type === 'image' || list.type === 'audio' ? (
        <div className="panel">
          <label className="text-[12.5px] text-muted block mb-1.5">
            Ajouter un ou plusieurs {list.type === 'audio' ? 'extraits audio' : 'images'} d'un coup
          </label>
          <input
            type="file"
            accept={list.type === 'audio' ? 'audio/*' : 'image/*'}
            multiple
            disabled={uploading}
            onChange={(e) => handleMultiFileUpload(e.target.files)}
            className="text-muted text-[12.5px]"
          />
          {uploading && <p className="text-amber text-xs mt-2">Envoi en cours…</p>}
          <p className="text-muted text-xs mt-2">
            Le nom de chaque item est pris depuis le nom du fichier — tu pourras le modifier directement dans Supabase si besoin.
          </p>
        </div>
      ) : (
        <div className="panel flex flex-col gap-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[12.5px] text-muted block mb-1.5">Ajouter un item</label>
              <input className="input" value={singleName} onChange={(e) => setSingleName(e.target.value)} placeholder="Ex. Ocarina of Time" />
            </div>
            <button className="btn" onClick={addSingleTextItem}>+ Ajouter</button>
          </div>
          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">
              Ou coller plusieurs noms d'un coup (un par ligne)
            </label>
            <textarea
              className="input min-h-[90px]"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'Ocarina of Time\nMajora\'s Mask\nBreath of the Wild'}
            />
            <button className="btn-secondary mt-2" onClick={addBulkTextItems}>+ Ajouter tout le paquet</button>
          </div>
        </div>
      )}

      <div className="panel max-h-[400px] overflow-y-auto">
        {loading ? (
          <p className="text-muted">Chargement...</p>
        ) : items.length === 0 ? (
          <p className="text-muted text-sm py-6 text-center">Aucun item pour l'instant.</p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 px-2.5 py-2 rounded-lg border border-border mb-2 bg-surface2">
              {it.image_url ? (
                <img src={it.image_url} className="w-9 h-9 object-cover rounded-md" alt={it.name} />
              ) : (
                <div className="w-9 h-9 rounded-md bg-bg flex items-center justify-center text-muted text-sm shrink-0">
                  {list.type === 'image' ? '🖼' : list.type === 'audio' ? '🎵' : '✎'}
                </div>
              )}
              <div className="flex-1 text-sm">{it.name}</div>
              {it.audio_url && (
                <audio controls preload="none" src={it.audio_url} className="h-8 max-w-[180px]" />
              )}
              <button className="btn-danger btn-small" onClick={() => deleteItem(it.id)}>Retirer</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

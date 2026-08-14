'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem, ListType } from '@/lib/types';
import { nameFromFilename, uploadItemImage } from '@/lib/utils';

export default function ListsPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [loading, setLoading] = useState(true);
  const [openListId, setOpenListId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ListType>('text');

  async function loadLists() {
    setLoading(true);
    const { data, error } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
    if (!error && data) setLists(data as GameList[]);
    setLoading(false);
  }

  useEffect(() => {
    loadLists();
  }, []);

  async function createList() {
    const name = newName.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from('lists')
      .insert({ name, type: newType })
      .select()
      .single();
    if (!error && data) {
      setNewName('');
      await loadLists();
      setOpenListId(data.id);
    }
  }

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

  return (
    <div>
      <div className="mb-7">
        <div className="eyebrow">Bibliothèque</div>
        <h1 className="font-serif text-3xl">Mes bases</h1>
        <p className="text-muted mt-2 text-[14.5px] max-w-xl">
          Crée des bases d'éléments (persos, jeux, films...) réutilisables dans le Blind Ranking, la Tier List et l'Undercover.
        </p>
      </div>

      <div className="panel flex gap-3.5 flex-wrap items-end">
        <div>
          <label className="text-[12.5px] text-muted block mb-1.5">Nom de la base</label>
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex. Mes jeux Zelda préférés"
          />
        </div>
        <div>
          <label className="text-[12.5px] text-muted block mb-1.5">Type de contenu</label>
          <select className="input" value={newType} onChange={(e) => setNewType(e.target.value as ListType)}>
            <option value="text">Texte (noms)</option>
            <option value="image">Images</option>
          </select>
        </div>
        <button className="btn" onClick={createList}>+ Créer la base</button>
      </div>

      {loading ? (
        <p className="text-muted mt-6">Chargement...</p>
      ) : lists.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">Aucune base pour l'instant — crée-en une ci-dessus.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4 mt-6">
          {lists.map((l) => (
            <div key={l.id} className="bg-surface border border-border rounded-card p-4.5 flex flex-col gap-2 hover:border-amberDim transition">
              <div className="eyebrow">{l.type === 'image' ? 'Images' : 'Texte'}</div>
              <h3 className="font-serif text-lg">{l.name}</h3>
              <div className="mt-auto pt-2.5 flex gap-2">
                <button className="btn-secondary btn-small" onClick={() => setOpenListId(l.id)}>Ouvrir</button>
                <button className="btn-danger btn-small" onClick={() => deleteList(l.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
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

  // Ajout de PLUSIEURS fichiers images en une fois
  async function handleMultiFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fileArr = Array.from(files);
      for (const file of fileArr) {
        const image_url = await uploadItemImage(file);
        const name = nameFromFilename(file.name);
        await supabase.from('items').insert({ list_id: list.id, name, image_url });
      }
      await loadItems();
    } catch (e) {
      alert("Erreur pendant l'upload d'une image : " + (e as Error).message);
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
      <div className="mb-7">
        <div className="eyebrow">{list.type === 'image' ? 'Base image' : 'Base texte'}</div>
        <h1 className="font-serif text-3xl">{list.name}</h1>
        <p className="text-muted mt-2 text-[14.5px]">{items.length} item{items.length > 1 ? 's' : ''}</p>
      </div>

      {list.type === 'image' ? (
        <div className="panel">
          <label className="text-[12.5px] text-muted block mb-1.5">
            Ajouter une ou plusieurs images d'un coup
          </label>
          <input
            type="file"
            accept="image/*"
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
                <div className="w-9 h-9 rounded-md bg-bg flex items-center justify-center text-muted text-sm">
                  {list.type === 'image' ? '🖼' : '✎'}
                </div>
              )}
              <div className="flex-1 text-sm">{it.name}</div>
              <button className="btn-danger btn-small" onClick={() => deleteItem(it.id)}>Retirer</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

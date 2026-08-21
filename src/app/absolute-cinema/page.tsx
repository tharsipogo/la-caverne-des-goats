'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { pickRandom } from '@/lib/utils';

type Phase = 'setup' | 'draft' | 'end';

interface PlayerTeam {
  name: string;
  style?: ListItem;
  actor1?: ListItem;
  actress?: ListItem;
  comedian?: ListItem;
  actor2?: ListItem;
  director?: ListItem;
  composer?: ListItem;
}

const PLAYER_COLORS = [
  { border: 'border-[#e2645a]', text: 'text-[#e2645a]', bg: 'bg-[#e2645a]', hex: '#e2645a' }, // Joueur 1 : Rouge
  { border: 'border-[#4fc9c0]', text: 'text-[#4fc9c0]', bg: 'bg-[#4fc9c0]', hex: '#4fc9c0' }, // Joueur 2 : Bleu
  { border: 'border-[#10b981]', text: 'text-[#10b981]', bg: 'bg-[#10b981]', hex: '#10b981' }, // Joueur 3 : Vert
  { border: 'border-[#a855f7]', text: 'text-[#a855f7]', bg: 'bg-[#a855f7]', hex: '#a855f7' }, // Joueur 4 : Violet
];

// Le style de film passe en position 1
const CATEGORIES = [
  { key: 'style', label: '1. Style / Genre de film', baseKey: 'styleListId', optional: true },
  { key: 'actor1', label: '2. Acteur principal', baseKey: 'actor1ListId', optional: false },
  { key: 'actress', label: '3. Actrice principale', baseKey: 'actressListId', optional: false },
  { key: 'comedian', label: '4. Comédien', baseKey: 'comedianListId', optional: false },
  { key: 'actor2', label: '5. Acteur / Actrice secondaire', baseKey: 'actor2ListId', optional: false },
  { key: 'director', label: '6. Réalisateur', baseKey: 'directorListId', optional: false },
  { key: 'composer', label: '7. Compositeur', baseKey: 'composerListId', optional: false },
] as const;

export default function AbsoluteCinemaPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [loading, setLoading] = useState(true);

  // Configuration
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4']);
  
  // Selection des bases
  const [bases, setBases] = useState({
    styleListId: '',
    actor1ListId: '',
    actressListId: '',
    comedianListId: '',
    actor2ListId: '',
    actor2ListIdSecondary: '',
    directorListId: '',
    composerListId: '',
  });

  // Items chargés
  const [loadedItems, setLoadedItems] = useState<Record<string, ListItem[]>>({});

  // État du jeu
  const [phase, setPhase] = useState<Phase>('setup');
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [teams, setTeams] = useState<PlayerTeam[]>([]);
  const [usedItemIds, setUsedItemIds] = useState<Set<string>>(new Set());
  const [currentChoices, setCurrentChoices] = useState<ListItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('name');
      if (data) setLists(data as GameList[]);
      setLoading(false);
    })();
  }, []);

  async function startGame() {
    if (!bases.actor1ListId || !bases.actressListId || !bases.comedianListId || !bases.actor2ListId || !bases.directorListId || !bases.composerListId) {
      alert('Veuillez sélectionner toutes les bases obligatoires.');
      return;
    }

    setLoading(true);
    const itemMap: Record<string, ListItem[]> = {};
    const listIdsToFetch = Array.from(new Set(Object.values(bases).filter(Boolean)));

    const results = await Promise.all(
      listIdsToFetch.map((id) => supabase.from('items').select('*').eq('list_id', id))
    );
    listIdsToFetch.forEach((id, i) => {
      if (results[i].data) itemMap[id] = results[i].data as ListItem[];
    });

    setLoadedItems(itemMap);
    
    const initialTeams: PlayerTeam[] = playerNames.slice(0, playerCount).map((name) => ({
      name: name.trim() || 'Joueur',
    }));

    setTeams(initialTeams);
    setUsedItemIds(new Set());
    setCurrentPlayerIdx(0);

    // Si pas de base style configurée, on commence directement à l'étape 1 (Acteur 1)
    const initialStep = bases.styleListId ? 0 : 1;
    setCurrentStepIdx(initialStep);
    setPhase('draft');
    setLoading(false);

    generateChoices(0, initialStep, new Set(), itemMap);
  }

  function generateChoices(pIdx: number, sIdx: number, used: Set<string>, itemsMap = loadedItems) {
    const currentCat = CATEGORIES[sIdx];
    let availablePool: ListItem[] = [];

    if (currentCat.key === 'actor2') {
      const pool1 = itemsMap[bases.actor2ListId] || [];
      const pool2 = bases.actor2ListIdSecondary ? itemsMap[bases.actor2ListIdSecondary] || [] : [];
      availablePool = [...pool1, ...pool2];
    } else {
      const listId = bases[currentCat.baseKey as keyof typeof bases];
      availablePool = itemsMap[listId] || [];
    }

    const filteredPool = availablePool.filter((item) => !used.has(item.id));
    const choices = pickRandom(filteredPool, Math.min(3, filteredPool.length));
    setCurrentChoices(choices);
  }

  function selectItem(item: ListItem) {
    const currentCatKey = CATEGORIES[currentStepIdx].key;
    
    const updatedTeams = [...teams];
    updatedTeams[currentPlayerIdx] = {
      ...updatedTeams[currentPlayerIdx],
      [currentCatKey]: item,
    };
    setTeams(updatedTeams);

    const updatedUsed = new Set(usedItemIds).add(item.id);
    setUsedItemIds(updatedUsed);

    let nextPlayerIdx = currentPlayerIdx + 1;
    let nextStepIdx = currentStepIdx;

    if (nextPlayerIdx >= playerCount) {
      nextPlayerIdx = 0;
      nextStepIdx += 1;
    }

    if (nextStepIdx >= CATEGORIES.length) {
      setPhase('end');
      return;
    }

    setCurrentPlayerIdx(nextPlayerIdx);
    setCurrentStepIdx(nextStepIdx);
    generateChoices(nextPlayerIdx, nextStepIdx, updatedUsed);
  }

  if (loading) return <p className="text-muted p-8">Chargement d'Absolute Cinema...</p>;

  // ================= 1. SETUP =================
  if (phase === 'setup') {
    return (
      <div>
        <div className="mb-7">
          <div className="eyebrow">Mode</div>
          <h1 className="font-serif text-3xl font-black text-amber">Absolute Cinema</h1>
          <p className="text-muted mt-2 text-[14.5px] max-w-xl">
            Créez le meilleur casting pour votre film. Tirez à tour de rôle vos acteurs, réalisateurs et compositeurs.
          </p>
        </div>

        <div className="panel flex flex-col gap-6">
          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Nombre de joueurs</label>
            <div className="flex gap-2.5">
              {[2, 3, 4].map((num, i) => (
                <button
                  key={num}
                  onClick={() => setPlayerCount(num)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    playerCount === num 
                      ? `${PLAYER_COLORS[i].border} ${PLAYER_COLORS[i].text} bg-white/5 shadow-md` 
                      : 'border-border text-text bg-surface2 opacity-60'
                  }`}
                >
                  {num} Joueurs
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i}>
                <label className="text-[12.5px] font-bold block mb-1 flex items-center gap-2" style={{ color: PLAYER_COLORS[i].hex }}>
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PLAYER_COLORS[i].hex }} />
                  Joueur {i + 1}
                </label>
                <input
                  className="input border-white/10"
                  value={playerNames[i]}
                  onChange={(e) => {
                    const newNames = [...playerNames];
                    newNames[i] = e.target.value;
                    setPlayerNames(newNames);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-amber">Bases de données</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="text-[12.5px] text-amber font-bold block mb-1">Style / Genre de film (Optionnel)</label>
                <select className="input border-amber/30" value={bases.styleListId} onChange={(e) => setBases({ ...bases, styleListId: e.target.value })}>
                  <option value="">— Aucun style optionnel —</option>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[12.5px] text-muted block mb-1">Base Acteur 1 *</label>
                <select className="input" value={bases.actor1ListId} onChange={(e) => setBases({ ...bases, actor1ListId: e.target.value })}>
                  <option value="">— Choisir une base —</option>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[12.5px] text-muted block mb-1">Base Actrice *</label>
                <select className="input" value={bases.actressListId} onChange={(e) => setBases({ ...bases, actressListId: e.target.value })}>
                  <option value="">— Choisir une base —</option>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[12.5px] text-muted block mb-1">Base Comédien *</label>
                <select className="input" value={bases.comedianListId} onChange={(e) => setBases({ ...bases, comedianListId: e.target.value })}>
                  <option value="">— Choisir une base —</option>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface2/50 p-3.5 rounded-xl border border-border">
                <div>
                  <label className="text-[12.5px] text-muted block mb-1">Acteur/Actrice 2 (Base A) *</label>
                  <select className="input" value={bases.actor2ListId} onChange={(e) => setBases({ ...bases, actor2ListId: e.target.value })}>
                    <option value="">— Choisir première base —</option>
                    {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[12.5px] text-muted block mb-1">Acteur/Actrice 2 (Base B optionnelle)</label>
                  <select className="input" value={bases.actor2ListIdSecondary} onChange={(e) => setBases({ ...bases, actor2ListIdSecondary: e.target.value })}>
                    <option value="">— Aucune (seule base A) —</option>
                    {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[12.5px] text-muted block mb-1">Base Réalisateur *</label>
                <select className="input" value={bases.directorListId} onChange={(e) => setBases({ ...bases, directorListId: e.target.value })}>
                  <option value="">— Choisir une base —</option>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[12.5px] text-muted block mb-1">Base Compositeur *</label>
                <select className="input" value={bases.composerListId} onChange={(e) => setBases({ ...bases, composerListId: e.target.value })}>
                  <option value="">— Choisir une base —</option>
                  {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button className="btn mt-2 w-fit" onClick={startGame}>
            🎬 Lancer le casting
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. DRAFT / SÉLECTION =================
  if (phase === 'draft') {
    const activePlayerName = teams[currentPlayerIdx]?.name;
    const currentCat = CATEGORIES[currentStepIdx];
    const currentColor = PLAYER_COLORS[currentPlayerIdx];

    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div 
          className="bg-[#121420] border-2 rounded-2xl p-4 flex items-center justify-between shadow-2xl transition-all duration-300"
          style={{ 
            borderColor: currentColor.hex,
            boxShadow: `0 0 25px ${currentColor.hex}35`
          }}
        >
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ backgroundColor: currentColor.hex }} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: currentColor.hex }}>
                Tour de {activePlayerName}
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white">Choisissez une carte :</h2>
            </div>
          </div>
          <div className="bg-black/40 text-amber font-bold text-xs px-3.5 py-2 rounded-xl border border-amber/30">
            {currentCat.label}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {currentChoices.map((item) => (
            <button
              key={item.id}
              onClick={() => selectItem(item)}
              className="group bg-[#141622] hover:bg-[#1a1d2e] border-2 border-white/10 rounded-2xl p-3.5 flex flex-col items-center gap-3 transition-all duration-300 text-center"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = currentColor.hex}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              <div className="w-full h-52 bg-surface2 rounded-xl overflow-hidden relative border border-white/5">
                {item.image_url ? (
                  <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={item.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                )}
              </div>
              <div className="font-bold text-white text-base group-hover:text-amber transition-colors">
                {item.name}
              </div>
            </button>
          ))}
        </div>

        {currentChoices.length === 0 && (
          <p className="text-center text-muted py-8">Plus de cartes disponibles pour cette catégorie.</p>
        )}
      </div>
    );
  }

  // ================= 3. RÉCAPITULATIF FINAL (Compact 1 Page) =================
  const gridColsClass = 
    playerCount === 2 ? 'grid-cols-2' : 
    playerCount === 3 ? 'grid-cols-3' : 
    'grid-cols-4';

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] justify-between rounded-2xl p-2 md:p-4 overflow-hidden">
      <div className="text-center">
        <div className="text-[10px] font-bold text-amber uppercase tracking-wider">CASTING TERMINÉ</div>
        <h1 className="font-serif text-2xl md:text-3xl font-black text-amber">Absolute Cinema</h1>
      </div>

      {/* Colonnes ajustables selon le nombre de joueurs */}
      <div className={`grid ${gridColsClass} gap-3 my-auto w-full max-w-7xl mx-auto`}>
        {teams.map((team, idx) => {
          const pColor = PLAYER_COLORS[idx];
          return (
            <div 
              key={idx} 
              className="bg-[#121420]/95 border-2 rounded-xl p-2.5 flex flex-col gap-2 shadow-xl"
              style={{ 
                borderColor: pColor.hex,
                boxShadow: `0 0 15px ${pColor.hex}20`
              }}
            >
              <div className="text-center pb-1.5 border-b border-white/10">
                <span className="text-[9px] uppercase font-black tracking-widest block" style={{ color: pColor.hex }}>
                  Film {idx + 1}
                </span>
                <h2 className="text-lg font-black text-white truncate">{team.name}</h2>
              </div>

              <div className="flex flex-col gap-1.5">
                {[
                  ...(team.style ? [{ label: 'Style', item: team.style }] : []),
                  { label: 'Acteur 1', item: team.actor1 },
                  { label: 'Actrice', item: team.actress },
                  { label: 'Comédien', item: team.comedian },
                  { label: 'Acteur 2', item: team.actor2 },
                  { label: 'Réalisateur', item: team.director },
                  { label: 'Compositeur', item: team.composer },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#181a28] p-1.5 rounded-lg border border-white/5">
                    <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 bg-surface2 border border-white/10">
                      {c.item?.image_url ? (
                        <img src={c.item.image_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px]">🍿</div>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 leading-tight">{c.label}</div>
                      <div className="text-[11px] font-extrabold text-white truncate leading-tight">{c.item?.name || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center mt-1">
        <button className="btn py-2 px-6 text-xs" onClick={() => setPhase('setup')}>
          ↺ Nouvelle partie
        </button>
      </div>
    </div>
  );
}
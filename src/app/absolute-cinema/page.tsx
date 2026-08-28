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

const PLAYER_THEMES = [
  { border: 'border-[#E63946]', text: 'text-[#E63946]', bg: 'bg-[#E63946]', hex: '#E63946', label: 'Rubis', tag: '💎 Rubis' },
  { border: 'border-[#457B9D]', text: 'text-[#457B9D]', bg: 'bg-[#457B9D]', hex: '#457B9D', label: 'Saphir', tag: '💎 Saphir' },
  { border: 'border-[#2A9D8F]', text: 'text-[#2A9D8F]', bg: 'bg-[#2A9D8F]', hex: '#2A9D8F', label: 'Émeraude', tag: '💎 Émeraude' },
  { border: 'border-[#9D4EDD]', text: 'text-[#9D4EDD]', bg: 'bg-[#9D4EDD]', hex: '#9D4EDD', label: 'Améthyste', tag: '💎 Améthyste' },
];

const CATEGORIES = [
  { key: 'style', label: '1. Style / Genre de film', baseKey: 'styleListId', optional: true, icon: '🎞️' },
  { key: 'actor1', label: '2. Acteur principal', baseKey: 'actor1ListId', optional: false, icon: '🎭' },
  { key: 'actress', label: '3. Actrice principale', baseKey: 'actressListId', optional: false, icon: '🌟' },
  { key: 'comedian', label: '4. Comédien', baseKey: 'comedianListId', optional: false, icon: '🤡' },
  { key: 'actor2', label: '5. Acteur / Actrice secondaire', baseKey: 'actor2ListId', optional: false, icon: '🎬' },
  { key: 'director', label: '6. Réalisateur', baseKey: 'directorListId', optional: false, icon: '🎥' },
  { key: 'composer', label: '7. Compositeur', baseKey: 'composerListId', optional: false, icon: '🎼' },
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
      if (data && data.length > 0) {
        const fetchedLists = data as GameList[];
        setLists(fetchedLists);

        // Auto-détection par game_type
        const styleTag = fetchedLists.find((l) => l.game_type === 'genre');
        const actor1Tag = fetchedLists.find((l) => l.game_type === 'acteurs');
        const actressTag = fetchedLists.find((l) => l.game_type === 'actrices');
        const comedianTag = fetchedLists.find((l) => l.game_type === 'comediens');
        const actor2Tag = fetchedLists.find((l) => l.game_type === 'acteurs');
        const actress2Tag = fetchedLists.find((l) => l.game_type === 'actrices');
        const directorTag = fetchedLists.find((l) => l.game_type === 'realisateur');
        const composerTag = fetchedLists.find((l) => l.game_type === 'directeur_musicale');

        setBases({
          styleListId: styleTag ? styleTag.id : '',
          actor1ListId: actor1Tag ? actor1Tag.id : '',
          actressListId: actressTag ? actressTag.id : '',
          comedianListId: comedianTag ? comedianTag.id : '',
          actor2ListId: actor2Tag ? actor2Tag.id : '',
          actor2ListIdSecondary: actress2Tag ? actress2Tag.id : '',
          directorListId: directorTag ? directorTag.id : '',
          composerListId: composerTag ? composerTag.id : '',
        });
      }
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

  if (loading) return <p className="text-[#D4AF37] p-8 text-center font-serif text-lg">Chargement de la Première...</p>;

  // ================= 1. SETUP =================
  if (phase === 'setup') {
    return (
      <div className="bg-[#0A0A0C] min-h-[calc(100vh-2rem)] rounded-2xl p-4 md:p-8 text-[#E0E0E0] border border-[#D4AF37]/30 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="text-xs uppercase tracking-[0.3em] font-extrabold text-[#D4AF37] mb-1">
            ⚜️ FOAT Award ⚜️
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA771C]">
            ABSOLUTE CINEMA
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xl mx-auto italic font-serif">
            Composez le casting d'exception qui remportera le FOAT Award.
          </p>
        </div>

        <div className="bg-[#121115] border border-[#D4AF37]/20 rounded-2xl p-6 flex flex-col gap-6 shadow-xl max-w-4xl mx-auto">
          <div>
            <label className="text-xs uppercase tracking-wider font-extrabold text-[#D4AF37] block mb-2">
              Nombre de Producteurs
            </label>
            <div className="flex gap-3">
              {[2, 3, 4].map((num, i) => (
                <button
                  key={num}
                  onClick={() => setPlayerCount(num)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 ${
                    playerCount === num
                      ? `${PLAYER_THEMES[i].border} ${PLAYER_THEMES[i].text} bg-[#D4AF37]/10 shadow-[0_0_15px_rgba(212,175,55,0.2)]`
                      : 'border-white/10 text-slate-400 bg-white/5 hover:border-[#D4AF37]/50'
                  }`}
                >
                  {num} Joueurs
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i} className="bg-[#18161E] p-3 rounded-xl border border-white/5">
                <label className="text-xs font-bold block mb-1.5 flex items-center justify-between" style={{ color: PLAYER_THEMES[i].hex }}>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PLAYER_THEMES[i].hex }} />
                    Producteur {i + 1}
                  </span>
                  <span className="text-[10px] text-slate-500">{PLAYER_THEMES[i].tag}</span>
                </label>
                <input
                  className="w-full bg-[#0D0C10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#D4AF37] outline-none"
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

          <div className="border-t border-[#D4AF37]/20 pt-5 flex flex-col gap-4">
            <h2 className="text-xs uppercase tracking-widest font-black text-[#D4AF37]">
              🏛️ Attributions des Catalogues
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="text-xs text-[#D4AF37] font-bold block mb-1">Genre & Style de Film (Optionnel)</label>
                <select
                  className="w-full bg-[#0D0C10] border border-[#D4AF37]/30 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
                  value={bases.styleListId}
                  onChange={(e) => setBases({ ...bases, styleListId: e.target.value })}
                >
                  <option value="">— Aucun style optionnel —</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.game_type === 'genre' ? '★ (Auto)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Base Acteur 1 *</label>
                <select
                  className="w-full bg-[#0D0C10] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
                  value={bases.actor1ListId}
                  onChange={(e) => setBases({ ...bases, actor1ListId: e.target.value })}
                >
                  <option value="">— Choisir une base —</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.game_type === 'acteurs' ? '★ (Auto)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Base Actrice *</label>
                <select
                  className="w-full bg-[#0D0C10] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
                  value={bases.actressListId}
                  onChange={(e) => setBases({ ...bases, actressListId: e.target.value })}
                >
                  <option value="">— Choisir une base —</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.game_type === 'actrices' ? '★ (Auto)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Base Comédien *</label>
                <select
                  className="w-full bg-[#0D0C10] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
                  value={bases.comedianListId}
                  onChange={(e) => setBases({ ...bases, comedianListId: e.target.value })}
                >
                  <option value="">— Choisir une base —</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.game_type === 'comediens' ? '★ (Auto)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#18161E] p-3.5 rounded-xl border border-white/10">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Acteur 2 (Base A) *</label>
                  <select
                    className="w-full bg-[#0D0C10] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
                    value={bases.actor2ListId}
                    onChange={(e) => setBases({ ...bases, actor2ListId: e.target.value })}
                  >
                    <option value="">— Choisir première base —</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.game_type === 'acteurs' ? '★ (Auto)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Actrice 2 (Base B optionnelle)</label>
                  <select
                    className="w-full bg-[#0D0C10] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
                    value={bases.actor2ListIdSecondary}
                    onChange={(e) => setBases({ ...bases, actor2ListIdSecondary: e.target.value })}
                  >
                    <option value="">— Aucune (seule base A) —</option>
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} {l.game_type === 'actrices' ? '★ (Auto)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Base Réalisateur *</label>
                <select
                  className="w-full bg-[#0D0C10] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
                  value={bases.directorListId}
                  onChange={(e) => setBases({ ...bases, directorListId: e.target.value })}
                >
                  <option value="">— Choisir une base —</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.game_type === 'realisateur' ? '★ (Auto)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Base Compositeur *</label>
                <select
                  className="w-full bg-[#0D0C10] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]"
                  value={bases.composerListId}
                  onChange={(e) => setBases({ ...bases, composerListId: e.target.value })}
                >
                  <option value="">— Choisir une base —</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.game_type === 'directeur_musicale' ? '★ (Auto)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-fit mx-auto mt-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#AA771C] text-black font-extrabold text-xs uppercase tracking-widest hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
          >
            🎬 Ouvrir la Cérémonie
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. DRAFT / SÉLECTION =================
  if (phase === 'draft') {
    const activePlayerName = teams[currentPlayerIdx]?.name;
    const currentCat = CATEGORIES[currentStepIdx];
    const currentTheme = PLAYER_THEMES[currentPlayerIdx];

    return (
      <div className="bg-[#0A0A0C] min-h-[calc(100vh-2rem)] rounded-2xl p-4 md:p-6 text-[#E0E0E0] max-w-5xl mx-auto flex flex-col gap-6 border border-[#D4AF37]/30 shadow-2xl">
        <div
          className="bg-[#121115] border-2 rounded-2xl p-4 flex items-center justify-between shadow-2xl relative overflow-hidden"
          style={{
            borderColor: currentTheme.hex,
            boxShadow: `0 0 30px ${currentTheme.hex}30`,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full animate-pulse shrink-0" style={{ backgroundColor: currentTheme.hex }} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: currentTheme.hex }}>
                AFFICHE DE {activePlayerName}
              </div>
              <h2 className="text-lg md:text-xl font-serif font-black text-white flex items-center gap-2">
                <span>{currentCat.icon}</span> Choisir : <span className="text-[#D4AF37]">{currentCat.label}</span>
              </h2>
            </div>
          </div>
          <div className="bg-black/60 text-[#D4AF37] font-serif font-extrabold text-xs px-4 py-2 rounded-xl border border-[#D4AF37]/30 shrink-0">
            Étape {currentStepIdx + 1} / 7
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-auto">
          {currentChoices.map((item) => (
            <button
              key={item.id}
              onClick={() => selectItem(item)}
              className="group bg-[#141218] hover:bg-[#1C1824] border-2 border-[#D4AF37]/20 hover:border-[#D4AF37] rounded-2xl p-4 flex flex-col items-center gap-4 transition-all duration-300 text-center hover:-translate-y-1 shadow-xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#D4AF37]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="w-full h-56 bg-[#0D0C10] rounded-xl overflow-hidden relative border border-white/10 shadow-inner">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={item.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl opacity-40">🍿</div>
                )}
              </div>

              <div className="font-serif font-bold text-white text-base group-hover:text-[#D4AF37] transition-colors">
                {item.name}
              </div>

              <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                Sélectionner
              </span>
            </button>
          ))}
        </div>

        {currentChoices.length === 0 && (
          <p className="text-center text-slate-500 py-12 italic font-serif">
            Aucune carte disponible dans cette catégorie.
          </p>
        )}
      </div>
    );
  }

  // ================= 3. RÉCAPITULATIF FINAL (Red Carpet) =================
  const gridColsClass =
    playerCount === 2 ? 'grid-cols-2' : playerCount === 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div className="bg-[#0A0A0C] min-h-[calc(100vh-2rem)] rounded-2xl p-4 md:p-6 text-[#E0E0E0] flex flex-col justify-between border border-[#D4AF37]/30 shadow-2xl">
      <div className="text-center mb-2">
        <div className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] mb-0.5">
          ⚜️ PALMARÈS DU FESTIVAL ⚜️
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA771C]">
          ABSOLUTE CINEMA
        </h1>
      </div>

      <div className={`grid ${gridColsClass} gap-4 my-auto w-full max-w-7xl mx-auto`}>
        {teams.map((team, idx) => {
          const pTheme = PLAYER_THEMES[idx];
          return (
            <div
              key={idx}
              className="bg-[#121115] border-2 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xl relative overflow-hidden"
              style={{
                borderColor: pTheme.hex,
                boxShadow: `0 0 20px ${pTheme.hex}25`,
              }}
            >
              <div className="text-center pb-2 border-b border-white/10">
                <span className="text-[9px] font-black uppercase tracking-widest block" style={{ color: pTheme.hex }}>
                  Film {idx + 1} ({pTheme.label})
                </span>
                <h2 className="text-base font-serif font-black text-white truncate">{team.name}</h2>
              </div>

              <div className="flex flex-col gap-1.5">
                {[
                  ...(team.style ? [{ label: 'Style', item: team.style, icon: '🎞️' }] : []),
                  { label: 'Acteur 1', item: team.actor1, icon: '🎭' },
                  { label: 'Actrice', item: team.actress, icon: '🌟' },
                  { label: 'Comédien', item: team.comedian, icon: '🤡' },
                  { label: 'Acteur 2', item: team.actor2, icon: '🎬' },
                  { label: 'Réalisateur', item: team.director, icon: '🎥' },
                  { label: 'Compositeur', item: team.composer, icon: '🎼' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#18161E] p-1.5 rounded-xl border border-white/5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-[#0D0C10] border border-[#D4AF37]/30 flex items-center justify-center">
                      {c.item?.image_url ? (
                        <img src={c.item.image_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-xs">{c.icon}</span>
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-[8px] font-black uppercase tracking-wider text-[#D4AF37] leading-tight">
                        {c.label}
                      </div>
                      <div className="text-[11px] font-bold text-white truncate leading-tight">
                        {c.item?.name || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center mt-3">
        <button
          onClick={() => setPhase('setup')}
          className="px-6 py-2 rounded-xl bg-[#121115] border border-[#D4AF37]/40 text-[#D4AF37] font-extrabold text-xs uppercase tracking-widest hover:bg-[#D4AF37] hover:text-black transition-all duration-300"
        >
          ↺ Prochaine Édition
        </button>
      </div>
    </div>
  );
}
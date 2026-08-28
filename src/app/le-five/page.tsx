'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { pickRandom } from '@/lib/utils';

type Phase = 'setup' | 'formation_choice' | 'draft' | 'end';
type Role = 'G' | 'DEF' | 'MIL' | 'ATT';

interface Slot {
  id: string;
  label: string;
  role: Role;
  pos: { top: string; left: string };
}

interface Formation {
  id: string;
  name: string;
  description: string;
  icon: string;
  slots: Slot[];
}

const FORMATIONS: Formation[] = [
  {
    id: 'losange',
    name: '1-2-1 Losange',
    description: 'Équilibre parfait entre attaque et défense.',
    icon: '♦️',
    slots: [
      { id: 'g', label: 'G', role: 'G', pos: { top: '82%', left: '50%' } },
      { id: 'def', label: 'DEF', role: 'DEF', pos: { top: '62%', left: '50%' } },
      { id: 'mil1', label: 'MG', role: 'MIL', pos: { top: '42%', left: '22%' } },
      { id: 'mil2', label: 'MD', role: 'MIL', pos: { top: '42%', left: '78%' } },
      { id: 'att', label: 'ATT', role: 'ATT', pos: { top: '18%', left: '50%' } },
    ],
  },
  {
    id: 'carre',
    name: '2-2 Carré',
    description: 'Structure solide avec deux défenseurs et deux attaquants.',
    icon: '🔳',
    slots: [
      { id: 'g', label: 'G', role: 'G', pos: { top: '82%', left: '50%' } },
      { id: 'def1', label: 'DG', role: 'DEF', pos: { top: '58%', left: '28%' } },
      { id: 'def2', label: 'DD', role: 'DEF', pos: { top: '58%', left: '72%' } },
      { id: 'att1', label: 'AG', role: 'ATT', pos: { top: '22%', left: '28%' } },
      { id: 'att2', label: 'AD', role: 'ATT', pos: { top: '22%', left: '72%' } },
    ],
  },
  {
    id: 'attaque',
    name: '1-1-2 Attaque Totale',
    description: 'Orienté vers la pression offensive avec deux pointes.',
    icon: '🔥',
    slots: [
      { id: 'g', label: 'G', role: 'G', pos: { top: '82%', left: '50%' } },
      { id: 'def', label: 'DEF', role: 'DEF', pos: { top: '64%', left: '50%' } },
      { id: 'mil', label: 'MC', role: 'MIL', pos: { top: '44%', left: '50%' } },
      { id: 'att1', label: 'AG', role: 'ATT', pos: { top: '20%', left: '30%' } },
      { id: 'att2', label: 'AD', role: 'ATT', pos: { top: '20%', left: '70%' } },
    ],
  },
  {
    id: 'pyramide',
    name: '3-1 Pyramide',
    description: 'Défense de fer avec 3 joueurs défensifs et une pointe rapide.',
    icon: '🛡️',
    slots: [
      { id: 'g', label: 'G', role: 'G', pos: { top: '82%', left: '50%' } },
      { id: 'def1', label: 'DG', role: 'DEF', pos: { top: '60%', left: '20%' } },
      { id: 'def2', label: 'DC', role: 'DEF', pos: { top: '60%', left: '50%' } },
      { id: 'def3', label: 'DD', role: 'DEF', pos: { top: '60%', left: '80%' } },
      { id: 'att', label: 'ATT', role: 'ATT', pos: { top: '20%', left: '50%' } },
    ],
  },
  {
    id: 'inversee',
    name: '1-3 Inversée',
    description: 'Maîtrise totale du milieu de terrain.',
    icon: '🎯',
    slots: [
      { id: 'g', label: 'G', role: 'G', pos: { top: '82%', left: '50%' } },
      { id: 'def', label: 'DEF', role: 'DEF', pos: { top: '64%', left: '50%' } },
      { id: 'mil1', label: 'MG', role: 'MIL', pos: { top: '32%', left: '20%' } },
      { id: 'mil2', label: 'MC', role: 'MIL', pos: { top: '40%', left: '50%' } },
      { id: 'mil3', label: 'MD', role: 'MIL', pos: { top: '32%', left: '80%' } },
    ],
  },
  {
    id: 'polyvalent',
    name: '2-1-1 Polyvalent',
    description: 'Bloc bas compact avec transition rapide.',
    icon: '⚡',
    slots: [
      { id: 'g', label: 'G', role: 'G', pos: { top: '82%', left: '50%' } },
      { id: 'def1', label: 'DG', role: 'DEF', pos: { top: '62%', left: '30%' } },
      { id: 'def2', label: 'DD', role: 'DEF', pos: { top: '62%', left: '70%' } },
      { id: 'mil', label: 'MC', role: 'MIL', pos: { top: '40%', left: '50%' } },
      { id: 'att', label: 'ATT', role: 'ATT', pos: { top: '18%', left: '50%' } },
    ],
  },
];

const PLAYER_COLORS = [
  { border: 'border-[#e2645a]', text: 'text-[#e2645a]', bg: 'bg-[#e2645a]', hex: '#e2645a' },
  { border: 'border-[#4fc9c0]', text: 'text-[#4fc9c0]', bg: 'bg-[#4fc9c0]', hex: '#4fc9c0' },
  { border: 'border-[#10b981]', text: 'text-[#10b981]', bg: 'bg-[#10b981]', hex: '#10b981' },
  { border: 'border-[#a855f7]', text: 'text-[#a855f7]', bg: 'bg-[#a855f7]', hex: '#a855f7' },
  { border: 'border-[#f59e0b]', text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]', hex: '#f59e0b' },
  { border: 'border-[#ec4899]', text: 'text-[#ec4899]', bg: 'bg-[#ec4899]', hex: '#ec4899' },
];

interface PlayerTeam {
  name: string;
  formation: Formation | null;
  squad: Record<string, ListItem | null>;
}

export default function LeFivePage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [loading, setLoading] = useState(true);

  const [gListId, setGListId] = useState('');
  const [defListId, setDefListId] = useState('');
  const [milListId, setMilListId] = useState('');
  const [attListId, setAttListId] = useState('');

  const [rolePools, setRolePools] = useState<Record<Role, ListItem[]>>({
    G: [],
    DEF: [],
    MIL: [],
    ATT: [],
  });

  const [playerCount, setPlayerCount] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4', 'Joueur 5', 'Joueur 6',
  ]);

  const [phase, setPhase] = useState<Phase>('setup');
  const [teams, setTeams] = useState<PlayerTeam[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState<number>(0);
  const [currentSlotIdx, setCurrentSlotIdx] = useState<number>(0);

  const [formationChoices, setFormationChoices] = useState<Formation[]>([]);
  const [playerChoices, setPlayerChoices] = useState<ListItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const fetchedLists = data as GameList[];
        setLists(fetchedLists);

        // Détection et pré-sélection selon game_type
        const gTag = fetchedLists.find((l) => l.game_type === 'five_g');
        const defTag = fetchedLists.find((l) => l.game_type === 'five_def');
        const milTag = fetchedLists.find((l) => l.game_type === 'five_mil');
        const attTag = fetchedLists.find((l) => l.game_type === 'five_att');

        setGListId(gTag ? gTag.id : fetchedLists[0].id);
        setDefListId(defTag ? defTag.id : fetchedLists[0].id);
        setMilListId(milTag ? milTag.id : fetchedLists[0].id);
        setAttListId(attTag ? attTag.id : fetchedLists[0].id);
      }
      setLoading(false);
    })();
  }, []);

  async function loadItemsForList(listId: string): Promise<ListItem[]> {
    if (!listId) return [];
    const { data } = await supabase.from('items').select('*').eq('list_id', listId);
    return (data as ListItem[]) || [];
  }

  async function startGame() {
    if (!gListId || !defListId || !milListId || !attListId) {
      alert('Veuillez sélectionner une base de données pour chaque poste.');
      return;
    }

    const [gItems, defItems, milItems, attItems] = await Promise.all([
      loadItemsForList(gListId),
      loadItemsForList(defListId),
      loadItemsForList(milListId),
      loadItemsForList(attListId),
    ]);

    if (gItems.length < 3 || defItems.length < 3 || milItems.length < 3 || attItems.length < 3) {
      alert('Chaque base doit contenir au moins 3 joueurs pour la phase de draft.');
      return;
    }

    setRolePools({
      G: gItems,
      DEF: defItems,
      MIL: milItems,
      ATT: attItems,
    });

    const initialTeams: PlayerTeam[] = playerNames.slice(0, playerCount).map((name) => ({
      name: name.trim() || 'Joueur',
      formation: null,
      squad: {},
    }));

    setTeams(initialTeams);
    setCurrentPlayerIdx(0);
    setCurrentSlotIdx(0);

    setFormationChoices(pickRandom(FORMATIONS, 3));
    setPhase('formation_choice');
  }

  function selectFormation(selectedForm: Formation) {
    const updatedTeams = [...teams];
    updatedTeams[currentPlayerIdx].formation = selectedForm;

    const emptySquad: Record<string, ListItem | null> = {};
    selectedForm.slots.forEach((s) => {
      emptySquad[s.id] = null;
    });
    updatedTeams[currentPlayerIdx].squad = emptySquad;
    setTeams(updatedTeams);

    const nextPlayer = currentPlayerIdx + 1;
    if (nextPlayer < playerCount) {
      setCurrentPlayerIdx(nextPlayer);
      setFormationChoices(pickRandom(FORMATIONS, 3));
    } else {
      setCurrentPlayerIdx(0);
      setCurrentSlotIdx(0);
      setPhase('draft');
      generatePlayerChoices(0, 0, updatedTeams, rolePools);
    }
  }

  function generatePlayerChoices(
    pIdx: number,
    sIdx: number,
    currentTeams = teams,
    pools = rolePools
  ) {
    const playerFormation = currentTeams[pIdx].formation;
    if (!playerFormation) return;

    const currentSlot = playerFormation.slots[sIdx];
    const role = currentSlot.role;
    const pool = pools[role];

    const usedIds = new Set<string>();
    currentTeams.forEach((t) => {
      Object.values(t.squad).forEach((item) => {
        if (item) usedIds.add(item.id);
      });
    });

    const availablePool = pool.filter((it) => !usedIds.has(it.id));
    const choices = pickRandom(availablePool, Math.min(3, availablePool.length));
    setPlayerChoices(choices);
  }

  function selectPlayer(selectedItem: ListItem) {
    const currentTeam = teams[currentPlayerIdx];
    const currentSlot = currentTeam.formation?.slots[currentSlotIdx];
    if (!currentSlot) return;

    const updatedTeams = [...teams];
    updatedTeams[currentPlayerIdx].squad[currentSlot.id] = selectedItem;
    setTeams(updatedTeams);

    let nextPlayerIdx = currentPlayerIdx + 1;
    let nextSlotIdx = currentSlotIdx;

    if (nextPlayerIdx >= playerCount) {
      nextPlayerIdx = 0;
      nextSlotIdx += 1;
    }

    if (nextSlotIdx >= 5) {
      setPhase('end');
      return;
    }

    setCurrentPlayerIdx(nextPlayerIdx);
    setCurrentSlotIdx(nextSlotIdx);
    generatePlayerChoices(nextPlayerIdx, nextSlotIdx, updatedTeams);
  }

  if (loading) return <p className="text-muted p-8">Chargement de Le Five...</p>;

  // ================= 1. SETUP =================
  if (phase === 'setup') {
    return (
      <div>
        <div className="mb-7">
          <div className="eyebrow">Mode Foot / Five</div>
          <h1 className="font-serif text-3xl font-black text-amber">Le Five</h1>
          <p className="text-muted mt-2 text-[14.5px] max-w-xl">
            Les bases pré-configurées sont sélectionnées automatiquement. Vous pouvez toujours les modifier ci-dessous.
          </p>
        </div>

        <div className="panel flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[12.5px] font-bold text-amber block mb-1.5">🧤 Base Gardiens (G)</label>
              <select className="input" value={gListId} onChange={(e) => setGListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.game_type === 'five_g' ? '★ (Auto)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12.5px] font-bold text-amber block mb-1.5">🛡️ Base Défenseurs (DEF)</label>
              <select className="input" value={defListId} onChange={(e) => setDefListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.game_type === 'five_def' ? '★ (Auto)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12.5px] font-bold text-amber block mb-1.5">🎯 Base Milieux (MIL)</label>
              <select className="input" value={milListId} onChange={(e) => setMilListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.game_type === 'five_mil' ? '★ (Auto)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12.5px] font-bold text-amber block mb-1.5">🔥 Base Attaquants (ATT)</label>
              <select className="input" value={attListId} onChange={(e) => setAttListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.game_type === 'five_att' ? '★ (Auto)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Nombre de joueurs (1 à 6)</label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6].map((num, i) => (
                <button
                  key={num}
                  onClick={() => setPlayerCount(num)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    playerCount === num
                      ? `${PLAYER_COLORS[i].border} ${PLAYER_COLORS[i].text} bg-white/5 shadow-md`
                      : 'border-border text-text bg-surface2 opacity-60'
                  }`}
                >
                  {num} {num === 1 ? 'Joueur' : 'Joueurs'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          <button className="btn mt-2 w-fit" onClick={startGame}>
            ⚽ Lancer la sélection tactique
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. SELECTION DE LA COMPO =================
  if (phase === 'formation_choice') {
    const activePlayerName = teams[currentPlayerIdx]?.name;
    const currentColor = PLAYER_COLORS[currentPlayerIdx];

    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div
          className="bg-[#121420] border-2 rounded-2xl p-4 flex items-center justify-between shadow-2xl"
          style={{ borderColor: currentColor.hex }}
        >
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: currentColor.hex }} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: currentColor.hex }}>
                Tour de {activePlayerName}
              </div>
              <h2 className="text-xl font-bold text-white">Choisissez votre composition de Five :</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {formationChoices.map((form) => (
            <button
              key={form.id}
              onClick={() => selectFormation(form)}
              className="group bg-[#141622] hover:bg-[#1a1d2e] border-2 border-white/10 rounded-2xl p-5 flex flex-col items-center justify-between gap-4 transition-all duration-300 text-center hover:scale-105"
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = currentColor.hex)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            >
              <div className="text-5xl my-2">{form.icon}</div>
              <div>
                <h3 className="font-extrabold text-amber text-lg">{form.name}</h3>
                <p className="text-xs text-muted mt-2 leading-relaxed">{form.description}</p>
              </div>

              <div className="w-full bg-surface2/50 rounded-xl p-2.5 border border-white/5 flex flex-col gap-1 text-left">
                <span className="text-[9px] font-bold uppercase text-slate-400 block mb-1">Composition :</span>
                {form.slots.map((s, idx) => (
                  <span key={idx} className="text-[11px] font-extrabold text-white flex items-center gap-1.5">
                    <span className="text-amber">•</span> {s.label} ({s.role})
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ================= 3. DRAFT DES JOUEURS =================
  if (phase === 'draft') {
    const activePlayer = teams[currentPlayerIdx];
    const activeColor = PLAYER_COLORS[currentPlayerIdx];
    const currentSlot = activePlayer.formation?.slots[currentSlotIdx];

    return (
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div
          className="bg-[#121420] border-2 rounded-2xl p-4 flex items-center justify-between shadow-2xl"
          style={{ borderColor: activeColor.hex }}
        >
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: activeColor.hex }} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: activeColor.hex }}>
                Tour de {activePlayer.name} ({activePlayer.formation?.name})
              </div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                Choisissez votre : <span className="text-amber">{currentSlot?.label}</span>
              </h2>
            </div>
          </div>
          <div className="bg-black/40 text-amber font-bold text-xs px-3.5 py-2 rounded-xl border border-amber/30">
            Poste {currentSlotIdx + 1} / 5
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {playerChoices.map((item) => (
            <button
              key={item.id}
              onClick={() => selectPlayer(item)}
              className="group bg-[#141622] hover:bg-[#1a1d2e] border-2 border-white/10 rounded-2xl p-3.5 flex flex-col items-center gap-3 transition-all duration-300 text-center"
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = activeColor.hex)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            >
              <div className="w-full h-52 bg-surface2 rounded-xl overflow-hidden relative border border-white/5">
                {item.image_url ? (
                  <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={item.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">⚽</div>
                )}
              </div>
              <div className="font-bold text-white text-base group-hover:text-amber transition-colors">
                {item.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ================= 4. END / TERRAIN TACTIQUE =================
  const gridColsClass =
    playerCount === 1 ? 'grid-cols-1' :
    playerCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
    playerCount === 3 ? 'grid-cols-1 md:grid-cols-3' :
    playerCount === 4 ? 'grid-cols-2 md:grid-cols-4' :
    'grid-cols-2 lg:grid-cols-3';

  return (
    <div className="flex flex-col h-full justify-between rounded-2xl p-2 md:p-4 overflow-y-auto">
      <div className="text-center mb-4">
        <div className="text-[10px] font-bold text-amber uppercase tracking-wider">COMPOSITIONS FINALES</div>
        <h1 className="font-serif text-2xl md:text-3xl font-black text-amber">Le Five</h1>
        <p className="text-xs text-slate-300 mt-1">Confrontez les terrains tactiques et désignez le vainqueur !</p>
      </div>

      <div className={`grid ${gridColsClass} gap-6 my-auto w-full max-w-7xl mx-auto`}>
        {teams.map((team, idx) => {
          const pColor = PLAYER_COLORS[idx];
          return (
            <div
              key={idx}
              className="bg-[#121420]/95 border-2 rounded-2xl p-3 flex flex-col gap-3 shadow-2xl relative"
              style={{
                borderColor: pColor.hex,
                boxShadow: `0 0 20px ${pColor.hex}25`,
              }}
            >
              <div className="text-center pb-2 border-b border-white/10">
                <span className="text-[9px] uppercase font-black tracking-widest block" style={{ color: pColor.hex }}>
                  Five {idx + 1} ({team.formation?.icon})
                </span>
                <h2 className="text-base font-black text-white truncate">{team.name}</h2>
                <span className="text-[11px] font-bold text-amber block">{team.formation?.name}</span>
              </div>

              <div className="relative w-full aspect-[3/4] max-w-[320px] mx-auto bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 border-2 border-white/30 rounded-2xl overflow-hidden shadow-inner select-none">
                <div className="absolute inset-2 border border-white/20 rounded-xl pointer-events-none" />
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/20 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/20 rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-12 border-t border-x border-white/20 rounded-t-xl pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-12 border-b border-x border-white/20 rounded-b-xl pointer-events-none" />

                {team.formation?.slots.map((slot) => {
                  const card = team.squad[slot.id];
                  return (
                    <div
                      key={slot.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-10 w-16"
                      style={{ top: slot.pos.top, left: slot.pos.left }}
                    >
                      <div className="w-9 h-9 rounded-full border-2 border-amber bg-[#181a28] shadow-lg overflow-hidden flex items-center justify-center shrink-0">
                        {card?.image_url ? (
                          <img src={card.image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-xs">⚽</span>
                        )}
                      </div>

                      <div className="bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10 text-center w-full">
                        <span className="text-[8px] font-black uppercase text-amber block leading-tight">
                          {slot.label}
                        </span>
                        <span className="text-[9px] font-bold text-white truncate block leading-tight">
                          {card?.name || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center mt-4">
        <button className="btn py-2 px-6 text-xs" onClick={() => setPhase('setup')}>
          ↺ Nouvelle partie
        </button>
      </div>
    </div>
  );
}
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
  { border: 'border-[#FF5500]', text: 'text-[#FF5500]', bg: 'bg-[#FF5500]', hex: '#FF5500', label: 'Équipe Orange' },
  { border: 'border-[#38BDF8]', text: 'text-[#38BDF8]', bg: 'bg-[#38BDF8]', hex: '#38BDF8', label: 'Équipe Bleue' },
  { border: 'border-[#FACC15]', text: 'text-[#FACC15]', bg: 'bg-[#FACC15]', hex: '#FACC15', label: 'Équipe Jaune' },
  { border: 'border-[#A855F7]', text: 'text-[#A855F7]', bg: 'bg-[#A855F7]', hex: '#A855F7', label: 'Équipe Violette' },
  { border: 'border-[#4ADE80]', text: 'text-[#4ADE80]', bg: 'bg-[#4ADE80]', hex: '#4ADE80', label: 'Équipe Verte' },
  { border: 'border-[#F43F5E]', text: 'text-[#F43F5E]', bg: 'bg-[#F43F5E]', hex: '#F43F5E', label: 'Équipe Rouge' },
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

  if (loading) return <p className="text-[#FF5500] p-8 text-center font-mono font-extrabold">Préparation de l'ardoise...</p>;

  // ================= 1. SETUP (VESTIAIRE ET ARDOISE DU COACH) =================
  if (phase === 'setup') {
    return (
      <div className="bg-[#0D1B14] min-h-[calc(100vh-2rem)] rounded-2xl p-4 md:p-8 text-[#E2E8F0] border-4 border-[#1E3A2B] shadow-2xl relative font-sans">
        {/* En-tête Tableau */}
        <div className="mb-8 text-center border-b-2 border-dashed border-[#2D5A40] pb-6">
          <div className="text-xs uppercase tracking-[0.3em] font-mono font-bold text-[#FF5500] mb-1">
            📋 CONSIGNES DE VESTIAIRE 📋
          </div>
          <h1 className="font-mono text-3xl md:text-5xl font-black text-[#F8FAFC] tracking-tight">
            LE FIVE
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xl mx-auto italic">
            Fixez vos bases tactiques sur l'ardoise et préparez votre composition.
          </p>
        </div>

        <div className="bg-[#13261C] border-2 border-[#2D5A40] rounded-2xl p-6 flex flex-col gap-6 shadow-2xl max-w-4xl mx-auto relative">
          {/* Sélection des 4 bases par poste */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0F1E16] p-3 rounded-xl border border-[#2D5A40]">
              <label className="text-xs font-mono font-bold text-[#FF5500] block mb-1.5">🧤 GARDIEN (G)</label>
              <select className="w-full bg-[#182E22] border border-slate-600 rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-[#FF5500]" value={gListId} onChange={(e) => setGListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.game_type === 'five_g' ? '★ (Auto)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#0F1E16] p-3 rounded-xl border border-[#2D5A40]">
              <label className="text-xs font-mono font-bold text-[#FF5500] block mb-1.5">🛡️ DÉFENSEUR (DEF)</label>
              <select className="w-full bg-[#182E22] border border-slate-600 rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-[#FF5500]" value={defListId} onChange={(e) => setDefListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.game_type === 'five_def' ? '★ (Auto)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#0F1E16] p-3 rounded-xl border border-[#2D5A40]">
              <label className="text-xs font-mono font-bold text-[#FF5500] block mb-1.5">🎯 MILIEU (MIL)</label>
              <select className="w-full bg-[#182E22] border border-slate-600 rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-[#FF5500]" value={milListId} onChange={(e) => setMilListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.game_type === 'five_mil' ? '★ (Auto)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-[#0F1E16] p-3 rounded-xl border border-[#2D5A40]">
              <label className="text-xs font-mono font-bold text-[#FF5500] block mb-1.5">🔥 ATTAQUANT (ATT)</label>
              <select className="w-full bg-[#182E22] border border-slate-600 rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-[#FF5500]" value={attListId} onChange={(e) => setAttListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.game_type === 'five_att' ? '★ (Auto)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono uppercase tracking-wider font-extrabold text-slate-300 block mb-2">
              Nombre de tacticiens (1 à 6)
            </label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6].map((num, i) => (
                <button
                  key={num}
                  onClick={() => setPlayerCount(num)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    playerCount === num
                      ? `${PLAYER_COLORS[i].border} ${PLAYER_COLORS[i].text} bg-[#FF5500]/10 shadow-[0_0_15px_rgba(255,85,0,0.25)]`
                      : 'border-slate-700 text-slate-400 bg-white/5 hover:border-slate-500'
                  }`}
                >
                  {num} {num === 1 ? 'Joueur' : 'Joueurs'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i} className="bg-[#0F1E16] p-3 rounded-xl border border-[#2D5A40]">
                <label className="text-xs font-bold block mb-1 flex items-center justify-between" style={{ color: PLAYER_COLORS[i].hex }}>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PLAYER_COLORS[i].hex }} />
                    Coach {i + 1}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{PLAYER_COLORS[i].label}</span>
                </label>
                <input
                  className="w-full bg-[#182E22] border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-[#FF5500] outline-none"
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

          <button
            onClick={startGame}
            className="w-fit mx-auto mt-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[#FF5500] via-[#FF7733] to-[#CC4400] text-white font-mono font-black text-xs uppercase tracking-widest hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(255,85,0,0.4)]"
          >
            ✏️ Valider les bases & choisir les compos
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
      <div className="bg-[#0D1B14] min-h-[calc(100vh-2rem)] rounded-2xl p-4 md:p-6 text-[#E2E8F0] max-w-5xl mx-auto flex flex-col gap-6 border-4 border-[#1E3A2B] shadow-2xl">
        <div
          className="bg-[#13261C] border-2 rounded-2xl p-4 flex items-center justify-between shadow-2xl relative"
          style={{ borderColor: currentColor.hex, boxShadow: `0 0 25px ${currentColor.hex}30` }}
        >
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full animate-pulse shrink-0" style={{ backgroundColor: currentColor.hex }} />
            <div>
              <div className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: currentColor.hex }}>
                SCHÉMA TACTIQUE DE {activePlayerName}
              </div>
              <h2 className="text-lg md:text-xl font-mono font-black text-white">Sélectionnez le système de jeu :</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-auto">
          {formationChoices.map((form) => (
            <button
              key={form.id}
              onClick={() => selectFormation(form)}
              className="group bg-[#13261C] hover:bg-[#1A3326] border-2 border-[#2D5A40] hover:border-[#FF5500] rounded-2xl p-5 flex flex-col items-center justify-between gap-4 transition-all duration-300 text-center hover:-translate-y-1 shadow-xl relative"
            >
              <div className="text-5xl my-1 group-hover:scale-110 transition-transform">{form.icon}</div>
              <div>
                <h3 className="font-mono font-extrabold text-[#FF5500] text-lg">{form.name}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{form.description}</p>
              </div>

              <div className="w-full bg-[#0F1E16] rounded-xl p-3 border border-slate-700/50 flex flex-col gap-1 text-left">
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-slate-400 block mb-1">Alignement :</span>
                {form.slots.map((s, idx) => (
                  <span key={idx} className="text-[11px] font-bold text-white flex items-center justify-between">
                    <span>• {s.label}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#FF5500]">{s.role}</span>
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
      <div className="bg-[#0D1B14] min-h-[calc(100vh-2rem)] rounded-2xl p-4 md:p-6 text-[#E2E8F0] max-w-5xl mx-auto flex flex-col gap-6 border-4 border-[#1E3A2B] shadow-2xl">
        <div
          className="bg-[#13261C] border-2 rounded-2xl p-4 flex items-center justify-between shadow-2xl relative"
          style={{ borderColor: activeColor.hex, boxShadow: `0 0 25px ${activeColor.hex}30` }}
        >
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full animate-pulse shrink-0" style={{ backgroundColor: activeColor.hex }} />
            <div>
              <div className="text-[10px] font-mono font-black uppercase tracking-widest" style={{ color: activeColor.hex }}>
                RECRUTEMENT : {activePlayer.name} ({activePlayer.formation?.name})
              </div>
              <h2 className="text-lg md:text-xl font-mono font-black text-white">
                Assigner le poste : <span className="text-[#FF5500]">{currentSlot?.label}</span>
              </h2>
            </div>
          </div>
          <div className="bg-[#0F1E16] text-[#FF5500] font-mono font-black text-xs px-4 py-2 rounded-xl border border-[#FF5500]/30 shrink-0">
            Poste {currentSlotIdx + 1} / 5
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-auto">
          {playerChoices.map((item) => (
            <button
              key={item.id}
              onClick={() => selectPlayer(item)}
              className="group bg-[#13261C] hover:bg-[#1A3326] border-2 border-[#2D5A40] hover:border-[#FF5500] rounded-2xl p-4 flex flex-col items-center gap-4 transition-all duration-300 text-center hover:-translate-y-1 shadow-xl relative overflow-hidden"
            >
              <div className="w-full h-56 bg-[#0F1E16] rounded-xl overflow-hidden relative border border-slate-700/50">
                {item.image_url ? (
                  <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl opacity-40">⚽</div>
                )}
              </div>
              <div className="font-mono font-bold text-white text-base group-hover:text-[#FF5500] transition-colors">
                {item.name}
              </div>
              <span className="text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[#FF5500]/10 border border-[#FF5500]/30 text-[#FF5500] group-hover:bg-[#FF5500] group-hover:text-white transition-all">
                Placer sur l'ardoise
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ================= 4. END / ARDOISE TACTIQUE DE MATCH =================
  const gridColsClass =
    playerCount === 1 ? 'grid-cols-1' :
    playerCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
    playerCount === 3 ? 'grid-cols-1 md:grid-cols-3' :
    playerCount === 4 ? 'grid-cols-2 md:grid-cols-4' :
    'grid-cols-2 lg:grid-cols-3';

  return (
    <div className="bg-[#0D1B14] min-h-[calc(100vh-2rem)] rounded-2xl p-4 md:p-6 text-[#E2E8F0] flex flex-col justify-between border-4 border-[#1E3A2B] shadow-2xl overflow-y-auto font-sans">
      <div className="text-center mb-4 border-b-2 border-dashed border-[#2D5A40] pb-4">
        <div className="text-[10px] font-mono font-black text-[#FF5500] uppercase tracking-[0.3em] mb-1">
          📌 COMPOSITIONS DE DÉPART 📌
        </div>
        <h1 className="font-mono text-2xl md:text-4xl font-black text-[#F8FAFC]">
          LE FIVE - TERRAINS TACTIQUES
        </h1>
      </div>

      <div className={`grid ${gridColsClass} gap-6 my-auto w-full max-w-7xl mx-auto`}>
        {teams.map((team, idx) => {
          const pColor = PLAYER_COLORS[idx];
          return (
            <div
              key={idx}
              className="bg-[#13261C] border-2 rounded-2xl p-3 flex flex-col gap-3 shadow-2xl relative"
              style={{
                borderColor: pColor.hex,
                boxShadow: `0 0 20px ${pColor.hex}25`,
              }}
            >
              <div className="text-center pb-2 border-b border-slate-700/50">
                <span className="text-[9px] font-mono font-black uppercase tracking-widest block" style={{ color: pColor.hex }}>
                  Five {idx + 1} ({team.formation?.icon})
                </span>
                <h2 className="text-base font-mono font-black text-white truncate">{team.name}</h2>
                <span className="text-[10px] font-bold text-[#FF5500] block">{team.formation?.name}</span>
              </div>

              {/* Terrain Ardoise 2D Craie */}
              <div className="relative w-full aspect-[3/4] max-w-[320px] mx-auto bg-[#0F281E] border-2 border-slate-300/40 rounded-2xl overflow-hidden shadow-2xl select-none">
                {/* Lignes tracées à la craie */}
                <div className="absolute inset-2 border border-dashed border-slate-300/30 rounded-xl pointer-events-none" />
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-300/30 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-slate-300/30 rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-12 border-t border-x border-slate-300/30 rounded-t-xl pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-12 border-b border-x border-slate-300/30 rounded-b-xl pointer-events-none" />

                {/* Joueurs aimantés sur l'ardoise */}
                {team.formation?.slots.map((slot) => {
                  const card = team.squad[slot.id];
                  return (
                    <div
                      key={slot.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-10 w-16"
                      style={{ top: slot.pos.top, left: slot.pos.left }}
                    >
                      <div className="w-10 h-10 rounded-full border-2 border-[#FF5500] bg-[#0A1610] shadow-2xl overflow-hidden flex items-center justify-center shrink-0">
                        {card?.image_url ? (
                          <img src={card.image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-xs">⚽</span>
                        )}
                      </div>

                      <div className="bg-black/90 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-slate-700 text-center w-full">
                        <span className="text-[8px] font-mono font-black uppercase text-[#FF5500] block leading-tight">
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
        <button
          onClick={() => setPhase('setup')}
          className="px-6 py-2.5 rounded-xl bg-[#13261C] border border-[#FF5500]/40 text-[#FF5500] font-mono font-black text-xs uppercase tracking-widest hover:bg-[#FF5500] hover:text-white transition-all duration-300 shadow-lg"
        >
          ↺ Remettre à zéro l'ardoise
        </button>
      </div>
    </div>
  );
}
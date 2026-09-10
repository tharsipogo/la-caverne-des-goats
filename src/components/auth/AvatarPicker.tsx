'use client';

import { useState } from 'react';

// Valeurs officielles DiceBear 10.x "big-smile"
const EYE_OPTIONS = [
  { id: 'cheery', label: '😊 Joyeux' },
  { id: 'normal', label: '👀 Normal' },
  { id: 'confused', label: '😕 Confus' },
  { id: 'sad', label: '😢 Triste' },
  { id: 'sleepy', label: '😴 Endormi' },
  { id: 'starstruck', label: '🤩 Émerveillé' },
  { id: 'winking', label: '😉 Clin d\'œil' },
  { id: 'angry', label: '😠 Fâché' },
];

const MOUTH_OPTIONS = [
  { id: 'openedSmile', label: '😃 Grand sourire' },
  { id: 'teethSmile', label: '😁 Sourire dents' },
  { id: 'gapSmile', label: '😬 Sourire édenté' },
  { id: 'kawaii', label: '🥰 Kawaii' },
  { id: 'awkwardSmile', label: '😅 Sourire gêné' },
  { id: 'braces', label: '🦷 Bagues' },
  { id: 'unimpressed', label: '😑 Blasé' },
  { id: 'openSad', label: '😞 Triste ouvert' },
];

const HAIR_OPTIONS = [
  { id: 'shortHair', label: '👨 Court' },
  { id: 'straightHair', label: '🧑 Raide' },
  { id: 'curlyShortHair', label: '👨‍🦱 Bouclé court' },
  { id: 'curlyBob', label: '👩 Carré bouclé' },
  { id: 'wavyBob', label: '👩‍🦰 Carré ondulé' },
  { id: 'bangs', label: '💇‍♀️ Frange' },
  { id: 'braids', label: '👧 Tresses' },
  { id: 'bunHair', label: '👩‍🦳 Chignon' },
  { id: 'froBun', label: '💫 Afro chignon' },
  { id: 'bowlCutHair', label: '🥣 Coupe au bol' },
  { id: 'mohawk', label: '🎸 Mohawk' },
  { id: 'halfShavedHead', label: '✂️ Mi-rasé' },
  { id: 'shavedHead', label: '🧑‍🦲 Rasé' },
];

const SKIN_COLORS = ['f2d3b1', 'ecad80', 'd08b5b', 'ae5d29', '614335', '3a2c22'];
const HAIR_COLORS = ['0e0e0e', '3eac2c', '6a4e35', 'a55728', 'd6b370', 'f59797', 'e0679e'];
const BG_COLORS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', '1eb996', 'f5a623'];

export function buildAvatarUrl(opts: {
  eyes: string;
  mouth: string;
  hair: string;
  skin: string;
  hairColor: string;
  bg: string;
}) {
  return `https://api.dicebear.com/10.x/big-smile/svg?eyesVariant=${opts.eyes}&mouthVariant=${opts.mouth}&hairVariant=${opts.hair}&skinColor=${opts.skin}&hairColor=${opts.hairColor}&backgroundColor=${opts.bg}`;
}

interface AvatarPickerProps {
  value: string;
  onChange: (url: string) => void;
}

/**
 * Créateur de personnage DiceBear "big-smile" : yeux / bouche / cheveux
 * en select, couleurs (peau / cheveux / fond) en pastilles cliquables.
 */
export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const [eyes, setEyes] = useState(EYE_OPTIONS[0].id);
  const [mouth, setMouth] = useState(MOUTH_OPTIONS[0].id);
  const [hair, setHair] = useState(HAIR_OPTIONS[0].id);
  const [skin, setSkin] = useState(SKIN_COLORS[0]);
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [bg, setBg] = useState(BG_COLORS[0]);

  const update = (patch: Partial<{ eyes: string; mouth: string; hair: string; skin: string; hairColor: string; bg: string }>) => {
    const next = {
      eyes: patch.eyes ?? eyes,
      mouth: patch.mouth ?? mouth,
      hair: patch.hair ?? hair,
      skin: patch.skin ?? skin,
      hairColor: patch.hairColor ?? hairColor,
      bg: patch.bg ?? bg,
    };
    setEyes(next.eyes);
    setMouth(next.mouth);
    setHair(next.hair);
    setSkin(next.skin);
    setHairColor(next.hairColor);
    setBg(next.bg);
    onChange(buildAvatarUrl(next));
  };

  const selectClass =
    'w-full bg-white/[0.04] border border-white/10 rounded-lg text-xs font-semibold text-text px-2 py-1.5 focus:outline-none focus:border-amber';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center">
        <img
          src={value || buildAvatarUrl({ eyes, mouth, hair, skin, hairColor, bg })}
          alt="Avatar"
          className="w-20 h-20 rounded-2xl bg-white/5 border-2 border-amber p-1 object-cover"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-muted block mb-1">Yeux</span>
          <select className={selectClass} value={eyes} onChange={(e) => update({ eyes: e.target.value })}>
            {EYE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-[10px] text-muted block mb-1">Bouche</span>
          <select className={selectClass} value={mouth} onChange={(e) => update({ mouth: e.target.value })}>
            {MOUTH_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <span className="text-[10px] text-muted block mb-1">Coupe</span>
          <select className={selectClass} value={hair} onChange={(e) => update({ hair: e.target.value })}>
            {HAIR_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div>
          <span className="text-[10px] text-muted block mb-1">Peau</span>
          <div className="flex gap-1.5">
            {SKIN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                style={{ backgroundColor: `#${c}` }}
                className={`w-6 h-6 rounded-full border-2 ${skin === c ? 'border-amber scale-110' : 'border-transparent'}`}
                onClick={() => update({ skin: c })}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-muted block mb-1">Cheveux</span>
          <div className="flex gap-1.5">
            {HAIR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                style={{ backgroundColor: `#${c}` }}
                className={`w-6 h-6 rounded-full border-2 ${hairColor === c ? 'border-amber scale-110' : 'border-transparent'}`}
                onClick={() => update({ hairColor: c })}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="text-[10px] text-muted block mb-1">Fond</span>
          <div className="flex gap-1.5">
            {BG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                style={{ backgroundColor: `#${c}` }}
                className={`w-6 h-6 rounded-full border-2 ${bg === c ? 'border-amber scale-110' : 'border-transparent'}`}
                onClick={() => update({ bg: c })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

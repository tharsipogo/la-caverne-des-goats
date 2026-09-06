'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Valeurs officielles et à jour pour DiceBear 10.x "big-smile"
// Source: https://api.dicebear.com/10.x/big-smile/options.json
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
const BG_COLORS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', '10b981', 'f59e0b'];

interface UserProfile {
  user_id: string;
  username: string;
  avatar_url: string;
  solo_wins: number;
  online_wins: number;
}

interface Props {
  onProfileLoaded: (profile: UserProfile) => void;
}

export default function AuthModal({ onProfileLoaded }: Props) {
  const [isLoginView, setIsLoginView] = useState(false);
  const [username, setUsername] = useState('');

  // Mode de création (Smile vs Photo)
  const [avatarType, setAvatarType] = useState<'smile' | 'photo'>('smile');
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  // Caractéristiques Smile
  const [selectedEye, setSelectedEye] = useState(EYE_OPTIONS[0].id);
  const [selectedMouth, setSelectedMouth] = useState(MOUTH_OPTIONS[0].id);
  const [selectedHair, setSelectedHair] = useState(HAIR_OPTIONS[0].id);
  const [selectedSkin, setSelectedSkin] = useState(SKIN_COLORS[0]);
  const [selectedHairColor, setSelectedHairColor] = useState(HAIR_COLORS[0]);
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);

  // URL DiceBear 10.x valide — noms de paramètres avec suffixe "Variant"
  const smileAvatarUrl = `https://api.dicebear.com/10.x/big-smile/svg?eyesVariant=${selectedEye}&mouthVariant=${selectedMouth}&hairVariant=${selectedHair}&skinColor=${selectedSkin}&hairColor=${selectedHairColor}&backgroundColor=${selectedBg}`;

  // Avatar retenu
  const finalAvatarUrl = avatarType === 'photo' && photoBase64 ? photoBase64 : smileAvatarUrl;

  const handleTakePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoBase64(reader.result as string);
      setAvatarType('photo');
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = async () => {
    if (!username.trim()) return alert('Entre un pseudo !');

    const generatedUserId = 'usr_' + Math.random().toString(36).substring(2, 11);

    const newProfile = {
      user_id: generatedUserId,
      username: username.trim(),
      avatar_url: finalAvatarUrl,
      solo_wins: 0,
      online_wins: 0,
    };

    const { error } = await supabase
        .from('profiles')
        .upsert(newProfile, { onConflict: 'username' });

    if (error) {
      console.error('Détail erreur Supabase (Register) :', error);
      return alert(`Erreur de création (${error.code}) : ${error.message}`);
    }

    localStorage.setItem('caverne_user_id', generatedUserId);
    onProfileLoaded(newProfile);
  };

  const handleLogin = async () => {
    if (!username.trim()) return alert('Entre ton pseudo !');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.trim())
      .single();

    if (error || !data) {
      console.error('Détail erreur Supabase (Login) :', error);
      const msg = error ? `${error.message} (Code ${error.code})` : 'Compte introuvable.';
      return alert(`Erreur de connexion : ${msg}`);
    }

    localStorage.setItem('caverne_user_id', data.user_id);
    onProfileLoaded(data);
  };

  const selectClass =
    'w-full bg-[#0b0d16] border border-white/10 rounded-lg text-xs font-bold text-slate-200 px-2 py-1.5 focus:outline-none focus:border-amber';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#121420] border-2 border-amber/60 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 text-center my-auto">
        <div>
          <div className="eyebrow">La Caverne des GOATs</div>
          <h1 className="text-2xl font-black text-amber mt-1">
            {isLoginView ? 'Se connecter' : 'Créer ton compte'}
          </h1>
        </div>

        {!isLoginView && (
          <div className="flex flex-col items-center gap-3">
            {/* Aperçu en direct */}
            <div className="w-28 h-28 rounded-2xl border-2 border-amber bg-surface2 overflow-hidden p-1 shadow-lg flex items-center justify-center">
              <img src={finalAvatarUrl} className="w-full h-full object-cover rounded-xl" alt="Avatar" />
            </div>

            {/* Mode Personnalisation / Photo */}
            <div className="flex gap-2">
              <button
                type="button"
                className={`py-1 px-3 rounded-lg text-xs font-bold border ${
                  avatarType === 'smile' ? 'border-amber text-amber bg-amber/20' : 'border-white/10 text-slate-400'
                }`}
                onClick={() => setAvatarType('smile')}
              >
                ✏️ Personnaliser le visage
              </button>

              <label className={`py-1 px-3 rounded-lg text-xs font-bold border cursor-pointer ${
                avatarType === 'photo' ? 'border-amber text-amber bg-amber/20' : 'border-white/10 text-slate-400'
              }`}>
                📷 Photo
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleTakePhoto} />
              </label>
            </div>

            {/* Panneau des traits */}
            {avatarType === 'smile' && (
              <div className="w-full bg-surface2 p-3 rounded-xl border border-white/10 flex flex-col gap-2.5 text-left">
                {/* Yeux */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Yeux :</span>
                  <select
                    className={selectClass}
                    value={selectedEye}
                    onChange={(e) => setSelectedEye(e.target.value)}
                  >
                    {EYE_OPTIONS.map((e) => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>

                {/* Bouche */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Bouche :</span>
                  <select
                    className={selectClass}
                    value={selectedMouth}
                    onChange={(e) => setSelectedMouth(e.target.value)}
                  >
                    {MOUTH_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Cheveux */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Coupe :</span>
                  <select
                    className={selectClass}
                    value={selectedHair}
                    onChange={(e) => setSelectedHair(e.target.value)}
                  >
                    {HAIR_OPTIONS.map((h) => (
                      <option key={h.id} value={h.id}>{h.label}</option>
                    ))}
                  </select>
                </div>

                {/* Couleur de Peau */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Peau :</span>
                  <div className="flex gap-1.5">
                    {SKIN_COLORS.map((sk) => (
                      <button
                        key={sk}
                        type="button"
                        style={{ backgroundColor: `#${sk}` }}
                        className={`w-5 h-5 rounded-full border-2 ${selectedSkin === sk ? 'border-amber scale-110' : 'border-transparent'}`}
                        onClick={() => setSelectedSkin(sk)}
                      />
                    ))}
                  </div>
                </div>

                {/* Couleur de Cheveux */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Couleur cheveux :</span>
                  <div className="flex gap-1.5">
                    {HAIR_COLORS.map((hc) => (
                      <button
                        key={hc}
                        type="button"
                        style={{ backgroundColor: `#${hc}` }}
                        className={`w-5 h-5 rounded-full border-2 ${selectedHairColor === hc ? 'border-amber scale-110' : 'border-transparent'}`}
                        onClick={() => setSelectedHairColor(hc)}
                      />
                    ))}
                  </div>
                </div>

                {/* Couleur de Fond */}
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Fond :</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {BG_COLORS.map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        style={{ backgroundColor: `#${bg}` }}
                        className={`w-5 h-5 rounded-full border-2 ${selectedBg === bg ? 'border-amber scale-110' : 'border-transparent'}`}
                        onClick={() => setSelectedBg(bg)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 block mb-1 text-left">Pseudo</label>
          <input
            className="input w-full"
            placeholder="Ex: GoatMaster99"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <button className="btn w-full py-3" onClick={isLoginView ? handleLogin : handleRegister}>
          {isLoginView ? 'Se connecter' : 'Créer mon compte'}
        </button>

        <div className="border-t border-white/10 pt-2">
          <button
            type="button"
            className="text-xs text-amber underline"
            onClick={() => setIsLoginView(!isLoginView)}
          >
            {isLoginView ? 'Pas encore de compte ? En créer un' : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </div>
    </div>
  );
}
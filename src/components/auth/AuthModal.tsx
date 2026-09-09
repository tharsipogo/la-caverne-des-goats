'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { upsertProfile } from '@/lib/supabase/queries';
import { ProfileRow } from '@/types/database';

interface AuthModalProps {
  onProfileLoaded: (profile: ProfileRow) => void;
}

const DEFAULT_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Zack',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Spooky',
];

export function AuthModal({ onProfileLoaded }: AuthModalProps) {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return setError('Choisis un pseudo valide !');

    setLoading(true);
    setError('');

    try {
      const userId = localStorage.getItem('caverne_user_id') || Math.random().toString(36).substring(2, 9);
      
      const profile = await upsertProfile({
        user_id: userId,
        username: username.trim(),
        avatar_url: avatarUrl,
        online_wins: 0,
      });

      if (profile) {
        localStorage.setItem('caverne_user_id', profile.user_id);
        onProfileLoaded(profile);
      }
    } catch (err: any) {
      setError('Ce pseudo est déjà pris ou indisponible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full text-center flex flex-col gap-5">
        <div>
          <span className="text-xs text-amber font-bold tracking-widest uppercase block">Bienvenue</span>
          <h2 className="text-2xl font-black text-white mt-1">Crée ton Profil</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            placeholder="Ton pseudo GOAT..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={error}
          />

          <div className="flex flex-col gap-2 text-left">
            <span className="text-xs text-slate-400 font-bold">Choisis ton Avatar :</span>
            <div className="flex justify-between gap-2">
              {DEFAULT_AVATARS.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="avatar"
                  onClick={() => setAvatarUrl(url)}
                  className={`w-12 h-12 rounded-xl bg-surface2 p-1 cursor-pointer border-2 transition-all ${
                    avatarUrl === url ? 'border-amber scale-105' : 'border-transparent opacity-60'
                  }`}
                />
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full py-3">
            {loading ? 'Enregistrement...' : 'Valider et Jouer →'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
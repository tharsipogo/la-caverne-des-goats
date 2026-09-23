'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { AvatarPicker } from '@/components/auth/AvatarPicker';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface EditProfileModalProps {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { user, isGuest, updateMyProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await updateMyProfile({
      username,
      avatarUrl,
      ...(pin ? { pin } : {}),
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-w-md w-full">
      <Card className="max-h-[90vh] overflow-y-auto flex flex-col gap-5">
        <div>
          <button onClick={onClose} className="text-xs text-muted hover:text-white mb-2">
            ← Fermer
          </button>
          <h2 className="text-xl font-black text-white">Modifier mon profil</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-muted block mb-1">Pseudo</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} error={error} />
          </div>
          {!isGuest && (
            <div>
              <label className="text-xs text-muted block mb-1">Nouveau code (laisse vide pour ne pas changer)</label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="4 à 6 chiffres"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}
          <div className="flex flex-col gap-2 text-left">
            <span className="text-xs text-muted font-bold">Ton personnage :</span>
            <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
          </div>
          <Button type="submit" disabled={saving} className="w-full py-3">
            {saving ? 'Enregistrement…' : 'Enregistrer →'}
          </Button>
        </form>
      </Card>
      </div>
    </div>
  );
}

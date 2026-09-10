'use client';

import { FormEvent, ReactNode, useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AvatarPicker, buildAvatarUrl } from '@/components/auth/AvatarPicker';

type Screen = 'choice' | 'login' | 'register' | 'guest';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted text-sm">
        Chargement…
      </div>
    );
  }

  if (!user) {
    return <AuthScreens />;
  }

  return <>{children}</>;
}

function AuthScreens() {
  const [screen, setScreen] = useState<Screen>('choice');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {screen === 'choice' && <ChoiceScreen onSelect={setScreen} />}
      {screen === 'login' && <LoginScreen onBack={() => setScreen('choice')} />}
      {screen === 'register' && <RegisterScreen onBack={() => setScreen('choice')} />}
      {screen === 'guest' && <GuestScreen onBack={() => setScreen('choice')} />}
    </div>
  );
}

function ChoiceScreen({ onSelect }: { onSelect: (s: Screen) => void }) {
  return (
    <Card className="max-w-md w-full text-center flex flex-col gap-5">
      <div>
        <span className="text-xs text-amber font-bold tracking-widest uppercase block">Bienvenue</span>
        <h2 className="text-2xl font-black text-white mt-1">La Caverne des Goats</h2>
        <p className="text-xs text-muted mt-2">
          Un compte est nécessaire pour jouer en ligne avec tes amis. En invité, tu peux jouer en local.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Button className="w-full py-3" onClick={() => onSelect('register')}>
          Créer un compte
        </Button>
        <Button variant="secondary" className="w-full py-3" onClick={() => onSelect('login')}>
          Se connecter
        </Button>
        <Button variant="ghost" className="w-full py-3" onClick={() => onSelect('guest')}>
          Continuer en invité
        </Button>
      </div>
    </Card>
  );
}

function LoginScreen({ onBack }: { onBack: () => void }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await login(username, pin);
    if (res.error) setError(res.error);
    setLoading(false);
  };

  return (
    <Card className="max-w-md w-full flex flex-col gap-5">
      <div>
        <button onClick={onBack} className="text-xs text-muted hover:text-white mb-2">
          ← Retour
        </button>
        <h2 className="text-xl font-black text-white">Se connecter</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input placeholder="Ton pseudo" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input
          placeholder="Code (4 à 6 chiffres)"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          error={error}
        />
        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading ? 'Connexion…' : 'Se connecter →'}
        </Button>
      </form>
    </Card>
  );
}

function RegisterScreen({ onBack }: { onBack: () => void }) {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await register(username, pin, avatarUrl || buildAvatarUrl({ eyes: 'cheery', mouth: 'openedSmile', hair: 'shortHair', skin: 'f2d3b1', hairColor: '0e0e0e', bg: 'b6e3f4' }));
    if (res.error) setError(res.error);
    setLoading(false);
  };

  return (
    <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto flex flex-col gap-5">
      <div>
        <button onClick={onBack} className="text-xs text-muted hover:text-white mb-2">
          ← Retour
        </button>
        <h2 className="text-xl font-black text-white">Créer ton compte</h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input placeholder="Ton pseudo GOAT..." value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input
          placeholder="Choisis un code (4 à 6 chiffres)"
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          error={error}
        />
        <div className="flex flex-col gap-2 text-left">
          <span className="text-xs text-muted font-bold">Crée ton personnage :</span>
          <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
        </div>
        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading ? 'Création…' : 'Valider et jouer →'}
        </Button>
      </form>
    </Card>
  );
}

function GuestScreen({ onBack }: { onBack: () => void }) {
  const { continueAsGuest } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    continueAsGuest(username, avatarUrl || buildAvatarUrl({ eyes: 'cheery', mouth: 'openedSmile', hair: 'shortHair', skin: 'f2d3b1', hairColor: '0e0e0e', bg: 'b6e3f4' }));
  };

  return (
    <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto flex flex-col gap-5">
      <div>
        <button onClick={onBack} className="text-xs text-muted hover:text-white mb-2">
          ← Retour
        </button>
        <h2 className="text-xl font-black text-white">Continuer en invité</h2>
        <p className="text-xs text-muted mt-2">
          Tu pourras jouer en local, mais le mode en ligne nécessite un compte.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input placeholder="Ton pseudo" value={username} onChange={(e) => setUsername(e.target.value)} />
        <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
        <Button type="submit" className="w-full py-3">
          Continuer →
        </Button>
      </form>
    </Card>
  );
}

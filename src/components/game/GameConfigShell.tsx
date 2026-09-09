'use client';

import { ReactNode } from 'react';
import { Topbar } from '@/components/layout/Topbar';

interface GameConfigShellProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
}

/**
 * Mise en page commune à l'écran de configuration de chaque jeu :
 * topbar (retour + breadcrumb), titre, sous-titre, et carte de contenu.
 * Utilisée pour que tous les jeux (sauf Le Five, Absolute Cinema, Draft
 * Anime) aient le même style d'écran de config.
 */
export function GameConfigShell({ title, subtitle, onBack, children }: GameConfigShellProps) {
  return (
    <div className="w-full card-enter">
      <Topbar onBack={onBack} breadcrumb={`Jeux / ${title}`} />
      <div className="mb-6">
        <div className="eyebrow">Configuration</div>
        <h1 className="font-serif text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1.5 max-w-xl">{subtitle}</p>}
      </div>
      <div className="panel mt-0 flex flex-col gap-5">{children}</div>
    </div>
  );
}

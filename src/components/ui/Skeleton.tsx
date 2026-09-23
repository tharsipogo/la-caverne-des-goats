'use client';

interface SkeletonProps {
  className?: string;
}

/** Bloc gris pulsant générique, pour remplacer un texte "Chargement..." */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />;
}

/** Squelette de carte type "panel" — titre + quelques lignes. */
export function SkeletonCard() {
  return (
    <div className="panel mt-0 flex flex-col gap-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-2/3" />
    </div>
  );
}

/** Squelette de ligne de profil (avatar + texte), pour l'écran de connexion. */
export function SkeletonProfileRow() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

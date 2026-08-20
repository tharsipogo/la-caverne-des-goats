'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/lists', label: '🗃️ Mes bases', match: '/lists' },
  { href: '/blind', label: '🏆 Blind Ranking', match: '/blind' },
  { href: '/blindtest', label: '🎧 Blind Test', match: '/blindtest' },
  { href: '/tier', label: '📊 Tier List', match: '/tier' },
  { href: '/undercover', label: '🐐 Undercover', match: '/undercover' },
  { href: '/undercover-artist', label: '🎨 Undercover Artist', match: '/undercover-artist' },
  { href: '/versus', label: '⚔️ Versus', match: '/versus' },
  { href: '/absolute-cinema', label: '🎬 Absolute Cinema', match: '/absolute-cinema' }, // <-- Ajouté ici
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop : colonne fixe à gauche */}
      <div className="hidden md:flex w-[210px] shrink-0 bg-bg border-r border-border py-6 px-2.5 flex-col gap-1">
        <div className="flex flex-col gap-1 mb-6 px-2.5">
          <p className="font-sans font-bold text-text text-[17px] leading-tight">La Caverne des</p>
          <p className="font-sans font-black text-amber text-[20px] leading-tight">Goats</p>
        </div>
        {NAV.map((item) => {
          const active = pathname === item.href;
          const [icon, ...rest] = item.label.split(' ');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors border ${
                active
                  ? 'bg-amber/10 border-amber/25 text-amber'
                  : 'text-muted border-transparent hover:bg-surface2 hover:text-text'
              }`}
            >
              <span className="text-[14px]">{icon}</span>
              <span>{rest.join(' ')}</span>
            </Link>
          );
        })}
        <div className="mt-auto px-2.5 text-mutedDim text-[11px] leading-relaxed">
          Les bases sont stockées sur Supabase — modifiables directement depuis le dashboard.
        </div>
      </div>

      {/* Mobile : en-tête + barre de nav fixée en bas */}
      <div className="md:hidden sticky top-0 z-40 bg-bg border-b border-border px-4 py-3.5">
        <div className="font-sans text-lg font-bold">
          La Caverne des <span className="text-amber font-black">Goats</span>
        </div>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg border-t border-border flex justify-around px-1 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const [icon, ...rest] = item.label.split(' ');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold min-w-[64px] ${
                active ? 'text-amber' : 'text-muted'
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="truncate max-w-[68px]">{rest.join(' ')}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
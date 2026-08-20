'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/lists', label: '🗃️ Mes bases', match: '/lists' },
  { href: '/blind', label: '🏆 Blind Ranking', match: '/blind' },
  { href: '/blindtest', label: '🎧 Blind Test', match: '/blindtest' },
  { href: '/tier', label: '📊 Tier List', match: '/tier' },
  { href: '/undercover', label: '🐐 Undercover', match: '/undercover' },
  { href: '/undercover-artist', label: '🎨 Undercover Artist', match: '/undercover-artist' },
  { href: '/versus', label: '⚔️ Versus', match: '/versus' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop : colonne fixe à gauche */}
      <div className="hidden md:flex w-[210px] shrink-0 bg-bg border-r border-border py-6 px-2.5 flex-col gap-1">
        {/* En-tête avec Logo */}
        <Link href="/" className="flex items-center gap-3 mb-6 px-1.5 group select-none">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-amber/40 shadow-[0_0_15px_rgba(245,158,11,0.25)] group-hover:scale-105 transition-transform duration-200 shrink-0">
            <Image
              src="/logo.jpg"
              alt="Logo La Caverne des Goats"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <p className="font-sans font-bold text-text text-[15px] leading-tight">La Caverne des</p>
            <p className="font-sans font-black text-amber text-[18px] leading-tight">Goats</p>
          </div>
        </Link>

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
      <div className="md:hidden sticky top-0 z-40 bg-bg border-b border-border px-4 py-3 flex items-center gap-3">
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-amber/40 shrink-0">
          <Image
            src="/logo.jpg"
            alt="Logo La Caverne des Goats"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="font-sans text-base font-bold">
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
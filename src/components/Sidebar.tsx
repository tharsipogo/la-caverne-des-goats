'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/lists', label: '📋 Mes bases', match: '/lists' },
  { href: '/blind', label: '🙈 Blind Ranking', match: '/blind' },
  { href: '/blindtest', label: '🎧 Blind Test', match: '/blindtest' },
  { href: '/tier', label: '🎯 Tier List', match: '/tier' },
  { href: '/undercover', label: '🐐 Undercover', match: '/undercover' },
  { href: '/undercover-artist', label: '🎨 Undercover Artist', match: '/undercover-artist' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop : colonne fixe à gauche */}
      <div className="hidden md:flex w-[230px] shrink-0 bg-surface border-r border-border p-7 flex-col gap-1.5">
        <div className="font-serif text-[22px] font-bold mb-7">
          La Caverne des <span className="text-amber">Goats</span>
        </div>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-left px-3.5 py-2.5 rounded-lg text-[14.5px] font-medium transition ${
                active ? 'bg-surface2 text-amber' : 'text-muted hover:bg-surface2 hover:text-text'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto text-muted text-[11.5px] leading-relaxed">
          Les bases sont stockées sur Supabase — modifiables directement depuis le dashboard.
        </div>
      </div>

      {/* Mobile : en-tête + barre de nav fixée en bas */}
      <div className="md:hidden sticky top-0 z-40 bg-surface border-b border-border px-4 py-3.5">
        <div className="font-serif text-lg font-bold">
          La Caverne des <span className="text-amber">Goats</span>
        </div>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex justify-around px-1 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const [icon, ...rest] = item.label.split(' ');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10.5px] font-medium min-w-[64px] ${
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

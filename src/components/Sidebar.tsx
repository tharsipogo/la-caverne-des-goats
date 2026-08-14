'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/lists', label: '📋 Mes bases', match: '/lists' },
  { href: '/blind', label: '🙈 Blind Ranking', match: '/blind' },
  { href: '/tier', label: '🎯 Tier List', match: '/tier' },
  { href: '/undercover', label: '🐐 Undercover', match: '/undercover' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-[230px] shrink-0 bg-surface border-r border-border p-7 flex flex-col gap-1.5">
      <div className="font-serif text-[22px] font-bold mb-7">
        La Caverne des <span className="text-amber">Goats</span>
      </div>
      {NAV.map((item) => {
        const active = pathname?.startsWith(item.match);
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
  );
}

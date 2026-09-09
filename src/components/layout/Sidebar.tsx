'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useOnlineMode, ONLINE_GAMES } from '@/lib/onlineModeContext';
import { useAuth } from '@/lib/authContext';

const NAV_MAIN = [
  { href: '/', label: '🏠 Accueil & Profil' },
  { href: '/lists', label: '🗃️ Mes bases' },
];

const NAV_GAMES = [
  { href: '/blind', label: '🏆 Blind Ranking' },
  { href: '/blindtest', label: '🎧 Blind Test' },
  { href: '/tier', label: '📊 Tier List' },
  { href: '/undercover', label: '🐐 Undercover' },
  { href: '/undercover-artist', label: '🎨 Undercover Artist' },
  { href: '/versus', label: '⚔️ Versus' },
  { href: '/absolute-cinema', label: '🎬 Absolute Cinema' },
  { href: '/line-capture', label: '📐 Line Capture' },
  { href: '/draft-anime', label: '🥷 Anime Draft' },
  { href: '/le-five', label: '⚽ Le Five' },
  { href: '/qui-est-ce', label: '❓ Qui est-ce ?' },
];

function useSidebarNav() {
  const { onlineMode } = useOnlineMode();
  if (!onlineMode) return { main: NAV_MAIN, games: NAV_GAMES };
  return {
    main: [{ href: '/', label: '🏠 Accueil & Profil' }],
    games: ONLINE_GAMES.map((g) => ({ href: '/', label: `${g.icon} ${g.label}` })),
  };
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  const [icon, ...rest] = label.split(' ');
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border"
      style={
        active
          ? {
              background: 'rgba(245, 166, 35, 0.18)',
              color: '#f5a623',
              borderColor: 'rgba(245, 166, 35, 0.35)',
              boxShadow: '0 2px 8px rgba(245, 166, 35, 0.2)',
            }
          : { color: '#94a3b8', borderColor: 'transparent' }
      }
    >
      <span>{icon}</span>
      <span>{rest.join(' ')}</span>
    </Link>
  );
}

function OnlineModeToggle({ compact }: { compact?: boolean }) {
  const { onlineMode, setOnlineMode } = useOnlineMode();
  const { isGuest } = useAuth();
  const router = useRouter();

  const handleClick = () => {
    if (!onlineMode && isGuest) {
      alert('Le mode en ligne nécessite un compte. Crée-en un depuis ton profil.');
      return;
    }
    setOnlineMode(!onlineMode);
    router.push('/');
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center justify-center gap-2 font-serif font-semibold rounded-xl border-none cursor-pointer transition-transform active:translate-y-0.5 active:shadow-none ${
        compact ? 'text-xs py-2' : 'text-xs py-2.5'
      }`}
      style={{ backgroundColor: 'rgba(30, 185, 150, 0.16)', color: '#1eb996', boxShadow: '0 3px 0 rgba(30, 185, 150, 0.28)' }}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      <span>{onlineMode ? 'Mode Local' : 'Mode En Ligne'}</span>
    </button>
  );
}

function GamesLabel() {
  return (
    <div className="flex items-center gap-2 px-2.5 mt-4 mb-1.5">
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted">Jeux</span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { main, games } = useSidebarNav();

  return (
    <>
      {/* Desktop Navigation */}
      <aside
        className="hidden md:flex w-56 shrink-0 py-6 px-2.5 flex-col gap-1 h-screen sticky top-0 relative z-10 border-r border-white/[0.06]"
        style={{ background: 'rgba(8, 10, 24, 0.82)', backdropFilter: 'blur(20px)' }}
      >
        <Link href="/" className="flex items-center gap-2 mb-4 px-2.5 hover:opacity-80 transition-opacity">
          <span className="text-xl leading-none">🐐</span>
          <span className="flex flex-col leading-tight">
            <span className="font-sans text-[11px] text-muted">La Caverne des</span>
            <span className="font-serif font-semibold text-[19px]" style={{ color: '#f5a623' }}>
              Goats
            </span>
          </span>
        </Link>

        <div className="mb-3">
          <OnlineModeToggle />
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto pr-1">
          {main.map((item, i) => (
            <NavLink key={item.href + i} href={item.href} label={item.label} active={pathname === item.href} />
          ))}
          <GamesLabel />
          {games.map((item, i) => (
            <NavLink key={item.href + i} href={item.href} label={item.label} active={pathname === item.href} />
          ))}
        </nav>

        <div className="mt-auto px-2.5 text-muted text-[11px] leading-relaxed pt-2">
          Données sur <span style={{ color: '#1eb996' }}>Supabase</span>.
        </div>
      </aside>

      {/* Mobile Navigation */}
      <div
        className="md:hidden sticky top-0 z-40 border-b border-white/[0.06] px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: 'rgba(8, 10, 24, 0.82)', backdropFilter: 'blur(20px)' }}
      >
        <Link href="/" className="font-serif text-lg font-semibold text-white shrink-0 flex items-center gap-1.5">
          <span>🐐</span>
          <span style={{ color: '#f5a623' }}>Goats</span>
        </Link>
        <div className="w-36">
          <OnlineModeToggle compact />
        </div>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] flex overflow-x-auto gap-1 px-2 py-2"
        style={{ background: 'rgba(8, 10, 24, 0.82)', backdropFilter: 'blur(20px)' }}
      >
        {[...main, ...games].map((item, i) => {
          const active = pathname === item.href;
          const [icon, ...rest] = item.label.split(' ');
          return (
            <Link
              key={item.href + i}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold min-w-[64px] shrink-0"
              style={{ color: active ? '#f5a623' : '#94a3b8' }}
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

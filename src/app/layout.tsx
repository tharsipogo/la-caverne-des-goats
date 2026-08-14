import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'La Caverne des Goats',
  description: "Blind Ranking, Tier List & Undercover entre goats.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans min-h-screen flex">
        <Sidebar />
        <main className="flex-1 px-11 py-9 max-w-[1200px] overflow-y-auto h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

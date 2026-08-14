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
      <body className="font-sans min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 px-4 py-6 md:px-11 md:py-9 max-w-[1200px] w-full overflow-y-auto md:h-screen pb-24 md:pb-9">
          {children}
        </main>
      </body>
    </html>
  );
}
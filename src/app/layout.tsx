import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'La Caverne des Goats',
  description: "Blind Ranking, Tier List & Undercover entre goats.",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Caverne Goats',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icons/icon-512.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#101118',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 px-4 py-6 md:px-11 md:py-9 w-full overflow-y-auto md:h-screen pb-24 md:pb-9">
          {children}
        </main>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { AuthProvider } from '@/lib/authContext';
import { AuthGate } from '@/components/auth/AuthGate';
import { OnlineModeProvider } from '@/lib/onlineModeContext';
import { Starfield } from '@/components/Starfield';

export const metadata: Metadata = {
  title: 'La Caverne des Goats',
  description: 'Jeux et classements en ligne et local',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="text-white h-screen overflow-hidden flex flex-col md:flex-row relative">
        <Starfield />
        <AuthProvider>
          <AuthGate>
            <OnlineModeProvider>
              <Sidebar />
              <div className="relative z-10 flex-1 flex flex-col min-w-0 min-h-0 px-5 py-6 md:px-10 md:py-8 overflow-y-auto">
                {children}
              </div>
            </OnlineModeProvider>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
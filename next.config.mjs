import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true, // Force la PWA à appliquer immédiatement la nouvelle version déployée
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Garde les pages compilées en mémoire plus longtemps en dev (par défaut
  // Next.js les décharge après ~15-25s d'inactivité, ce qui oblige à tout
  // recompiler quand on revient sur un onglet resté inactif un moment).
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // 1h au lieu de ~25s
    pagesBufferLength: 8, // garde plus de pages en mémoire simultanément
  },
};

export default withPWA(nextConfig);

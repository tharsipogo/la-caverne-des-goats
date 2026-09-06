import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true, // Force la PWA à appliquer immédiatement la nouvelle version déployée
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ta config Next.js habituelle
};

export default withPWA(nextConfig);

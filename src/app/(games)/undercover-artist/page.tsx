'use client';

import UndercoverArtistContainer from '@/features/undercover-artist/UndercoverArtistContainer';
import { useRouter } from 'next/navigation';

export default function UndercoverArtistPage() {
  const router = useRouter();

  return <UndercoverArtistContainer onLeaveGame={() => router.push('/')} />;
}
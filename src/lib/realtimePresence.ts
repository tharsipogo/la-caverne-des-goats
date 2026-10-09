// Suivi de présence Supabase Realtime, partagé entre les jeux en ligne
// (Soit Connecté, Undercover Artist, Qui est-ce ?).
//
// ⚠️ Règle importante (voir REFACTO_NOTES.md, Session 29) : le canal sur
// lequel on attache ce suivi ne doit JAMAIS être redémonté en cours de
// partie (pas de `phase`/`isHost` dans le tableau de dépendances de l'effet
// qui crée le canal). Sinon la présence se perd pendant la fenêtre de
// réabonnement, exactement comme un broadcast perdu.
//
// Usage : appeler `attachPresenceTracking` juste après avoir créé le canal
// (`supabase.channel(...)`), AVANT `.subscribe()`. Puis, dans le callback
// de `.subscribe()`, une fois le statut `SUBSCRIBED` reçu, appeler la
// fonction `track()` retournée pour annoncer sa propre présence.

export interface PresenceMeta {
  userId: string;
  name: string;
  onlineAt: number;
}

export interface PresenceTrackerOptions {
  myUserId: string;
  myName: string;
  onChange?: (onlineUserIds: Set<string>) => void;
}

export function attachPresenceTracking(
  channel: any,
  { myUserId, myName, onChange }: PresenceTrackerOptions
): () => void {
  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState() as Record<string, PresenceMeta[]>;
    const online = new Set<string>();
    Object.values(state).forEach((entries) => {
      entries.forEach((e) => {
        if (e?.userId) online.add(e.userId);
      });
    });
    onChange?.(online);
  });

  return function track() {
    channel.track({ userId: myUserId, name: myName, onlineAt: Date.now() } as PresenceMeta);
  };
}

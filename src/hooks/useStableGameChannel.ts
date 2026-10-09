import { useEffect, useRef, MutableRefObject } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Crée/gère un canal Supabase Realtime de façon stable pendant toute la
 * durée de vie d'une partie en ligne : le canal n'est recréé QUE si
 * `channelName` change — jamais à cause d'un changement de phase, d'hôte,
 * etc.
 *
 * ⚠️ C'est précisément la règle dont l'absence a causé un bug réel (voir
 * REFACTO_NOTES.md, Session 29, bug n°2) : quand `phase`/`isHost` étaient
 * dans le tableau de dépendances de l'effet qui crée le canal, celui-ci se
 * redémontait à chaque tour (puisque `phase` change via les messages reçus
 * sur ce canal même), ouvrant une fenêtre où un broadcast envoyé pendant
 * le réabonnement se perdait silencieusement. Ce hook centralise la
 * mécanique correcte une bonne fois pour toutes, pour les 3 jeux en ligne
 * (Soit Connecté, Undercover Artist, Qui est-ce ?) plutôt que de la
 * dupliquer et risquer de réintroduire ce bug dans un futur jeu.
 *
 * Usage : passer un `channelRef` externe (le ref déjà utilisé ailleurs
 * dans le composant pour envoyer des messages, ex. `channelRef.current?.
 * send(...)`), le nom du canal (ou `null` tant qu'il ne doit pas encore
 * être créé), et une fonction `setup(channel)` appelée une seule fois par
 * canal, juste après sa création et AVANT `channel.subscribe()` — c'est là
 * qu'il faut enregistrer tous les `.on('broadcast', ...)` /
 * `.on('presence', ...)`. Elle peut retourner une fonction appelée à
 * chaque changement de statut d'abonnement (utile pour envoyer un message
 * une fois "SUBSCRIBED", ou démarrer le suivi de présence).
 */
export function useStableGameChannel(
  channelRef: MutableRefObject<any>,
  channelName: string | null,
  setup: (channel: any) => ((status: string) => void) | void,
  options?: { broadcastSelf?: boolean }
) {
  // Toujours la dernière version de `setup` au moment de la (re)création du
  // canal — mais la création elle-même ne dépend que de `channelName`.
  const setupRef = useRef(setup);
  setupRef.current = setup;

  const broadcastSelf = options?.broadcastSelf ?? false;

  useEffect(() => {
    if (!channelName) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: broadcastSelf } },
    });
    channelRef.current = channel;

    const onStatus = setupRef.current(channel);

    channel.subscribe((status: string) => {
      onStatus?.(status);
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);
}

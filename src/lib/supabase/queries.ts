import { supabase } from '@/lib/supabase';
import { ProfileRow, SessionPlayerRow, GameSessionRow } from '@/types/database';

/* ==================== PROFILS ==================== */

export async function fetchProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Erreur fetchProfileByUserId :', error);
    return null;
  }
  return data;
}

export async function fetchProfileByUsername(username: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username.trim())
    .single();

  if (error) {
    console.error('Erreur fetchProfileByUsername :', error);
    return null;
  }
  return data;
}

export async function upsertProfile(profile: Partial<ProfileRow>): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'username' })
    .select()
    .single();

  if (error) {
    console.error('Erreur upsertProfile :', error);
    throw error;
  }
  return data;
}

/* ==================== GAME SESSIONS (SALONS) ==================== */

export async function createGameSession(hostId: string, hostProfile: ProfileRow) {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();

  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({ code, host_id: hostId, status: 'lobby' })
    .select()
    .single();

  if (sessionError || !session) {
    console.error('Erreur createGameSession :', sessionError);
    throw sessionError;
  }

  const { error: playerError } = await supabase.from('session_players').insert({
    session_id: session.id,
    user_id: hostId,
    name: hostProfile.username,
    avatar_url: hostProfile.avatar_url,
    is_approved: true,
    score: 0,
  });

  if (playerError) {
    console.error('Erreur ajout hôte session_players :', playerError);
    throw playerError;
  }

  return { session, code };
}

export async function joinGameSession(code: string, userProfile: ProfileRow) {
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (sessionError || !session) {
    throw new Error('Salon introuvable.');
  }
  if (session.status === 'finished') {
    throw new Error('Ce salon est terminé.');
  }

  // Pas de validation par l'hôte : on rejoint directement.
  const { error: playerError } = await supabase.from('session_players').upsert(
    {
      session_id: session.id,
      user_id: userProfile.user_id,
      name: userProfile.username,
      avatar_url: userProfile.avatar_url,
      is_approved: true,
      score: 0,
    },
    { onConflict: 'session_id,user_id', ignoreDuplicates: true }
  );

  if (playerError) {
    console.error('Erreur rejoindre session_players :', playerError);
    throw playerError;
  }

  return session;
}

export async function fetchSession(sessionId: string): Promise<GameSessionRow | null> {
  const { data, error } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
  if (error) {
    console.error('Erreur fetchSession :', error);
    return null;
  }
  return data;
}

export async function fetchSessionPlayers(sessionId: string): Promise<SessionPlayerRow[]> {
  const { data, error } = await supabase
    .from('session_players')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur fetchSessionPlayers :', error);
    return [];
  }
  return data || [];
}

/** L'hôte choisit le prochain jeu à lancer pour le groupe. Réinitialise le compteur "a rejoint". */
export async function selectGameForSession(sessionId: string, gameType: string) {
  await supabase.from('session_players').update({ joined_current_game: false }).eq('session_id', sessionId);

  const { error } = await supabase
    .from('game_sessions')
    .update({ status: 'in_game', current_game: gameType })
    .eq('id', sessionId);

  if (error) console.error('Erreur selectGameForSession :', error);
}

/** Un joueur confirme qu'il rejoint la partie en cours de lancement. */
export async function markPlayerJoinedCurrentGame(sessionId: string, userId: string) {
  const { error } = await supabase
    .from('session_players')
    .update({ joined_current_game: true })
    .eq('session_id', sessionId)
    .eq('user_id', userId);

  if (error) console.error('Erreur markPlayerJoinedCurrentGame :', error);
}

/** L'hôte revient au salon (annule/termine le jeu en cours) sans changer les scores. */
export async function returnSessionToLobby(sessionId: string) {
  const { error } = await supabase
    .from('game_sessions')
    .update({ status: 'lobby', current_game: null })
    .eq('id', sessionId);

  if (error) console.error('Erreur returnSessionToLobby :', error);
}

/**
 * Distribue les points de fin de manche : 1er = nb de joueurs classés,
 * 2e = nb-1, etc. Les joueurs qui n'ont pas terminé (absents de
 * rankedUserIds) ne reçoivent aucun point mais gardent leur score cumulé.
 * Puis renvoie tout le monde au salon.
 */
export async function submitGameResults(sessionId: string, rankedUserIds: string[]) {
  const n = rankedUserIds.length;
  if (n === 0) {
    await returnSessionToLobby(sessionId);
    return;
  }

  const players = await fetchSessionPlayers(sessionId);

  await Promise.all(
    rankedUserIds.map((userId, index) => {
      const player = players.find((p) => p.user_id === userId);
      if (!player) return Promise.resolve();
      const gained = n - index;
      return supabase
        .from('session_players')
        .update({ score: player.score + gained })
        .eq('session_id', sessionId)
        .eq('user_id', userId);
    })
  );

  await returnSessionToLobby(sessionId);
}

/**
 * L'hôte met fin au salon : calcule le vainqueur (score cumulé le plus
 * haut) et met à jour le palmarès de chaque joueur ayant participé.
 */
export async function endGameSession(sessionId: string) {
  const players = await fetchSessionPlayers(sessionId);

  const { error: statusError } = await supabase
    .from('game_sessions')
    .update({ status: 'finished' })
    .eq('id', sessionId);
  if (statusError) console.error('Erreur endGameSession (status) :', statusError);

  if (players.length === 0) return;

  const topScore = Math.max(...players.map((p) => p.score));
  const winners = players.filter((p) => p.score === topScore);

  await Promise.all(
    players.map(async (p) => {
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', p.user_id).single();
      if (!profile) return;
      const isWinner = winners.some((w) => w.user_id === p.user_id);
      await supabase
        .from('profiles')
        .update({
          games_played: (profile.games_played || 0) + 1,
          online_wins: (profile.online_wins || 0) + (isWinner ? 1 : 0),
        })
        .eq('user_id', p.user_id);
    })
  );
}

/* ==================== SOIT CONNECTÉ WORDS ==================== */

export async function fetchSoitConnecteWords(): Promise<string[]> {
  const { data, error } = await supabase.from('soit_connecte_words').select('word');

  if (error) {
    console.error('Erreur fetchSoitConnecteWords :', error);
    return [];
  }
  return (data || []).map((w) => w.word);
}

export async function addSoitConnecteWord(word: string): Promise<boolean> {
  const { error } = await supabase.from('soit_connecte_words').insert({ word: word.trim() });

  if (error) {
    console.error('Erreur addSoitConnecteWord :', error);
    return false;
  }
  return true;
}
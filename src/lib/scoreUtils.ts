import { supabase } from '@/lib/supabase';

export async function addPointsToPlayer(sessionId: string, userId: string, points: number) {
  // Récupérer le score actuel
  const { data } = await supabase
    .from('session_players')
    .select('score')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .single();

  if (data) {
    const newScore = (data.score || 0) + points;
    await supabase
      .from('session_players')
      .update({ score: newScore })
      .eq('session_id', sessionId)
      .eq('user_id', userId);
  }
}
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchSoitConnecteWords, submitGameResults, returnSessionToLobby } from '@/lib/supabase/queries';
import { GamePhase, PlayerSubmission, RankedPlayer, SoitConnecteProps } from '../types';

export function useSoitConnecteEngine({ sessionCode, profile, isHost, onLeaveGame }: SoitConnecteProps) {
  const [totalRounds, setTotalRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<GamePhase>('setup');

  const [wordsDatabase, setWordsDatabase] = useState<string[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [currentSecretWord, setCurrentSecretWord] = useState('');
  const [userWords, setUserWords] = useState<string[]>(Array(7).fill(''));
  const [hasValidated, setHasValidated] = useState(false);
  const [submissions, setSubmissions] = useState<PlayerSubmission[]>([]);
  const [timeLeft, setTimeLeft] = useState(90);

  const [cumulativeScores, setCumulativeScores] = useState<Record<string, number>>({});
  const channelRef = useRef<any>(null);

  useEffect(() => {
    fetchSoitConnecteWords().then(setWordsDatabase);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('code', sessionCode)
        .single();

      if (!session) return;
      setSessionId(session.id);

      const { data: pList } = await supabase
        .from('session_players')
        .select('*')
        .eq('session_id', session.id);

      if (pList) {
        setPlayers(pList.map((p) => ({ id: p.user_id, name: p.name, avatar_url: p.avatar_url, score: p.score || 0 })));
        const initialScores: Record<string, number> = {};
        pList.forEach((p) => (initialScores[p.user_id] = 0));
        setCumulativeScores(initialScores);
      }
    })();
  }, [sessionCode]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`soit_connecte:${sessionId}`, {
      config: { broadcast: { self: true } },
    });
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'start_game' }, ({ payload }) => {
        setTotalRounds(payload.totalRounds);
        setCurrentRound(1);
        setCurrentSecretWord(payload.secretWord);
        setPhase('playing');
        resetRoundData();
      })
      .on('broadcast', { event: 'next_round' }, ({ payload }) => {
        setCurrentRound(payload.round);
        setCurrentSecretWord(payload.secretWord);
        setPhase('playing');
        resetRoundData();
      })
      .on('broadcast', { event: 'submit_words' }, ({ payload }) => {
        setSubmissions((prev) => {
          const filtered = prev.filter((s) => s.userId !== payload.userId);
          return [...filtered, payload];
        });
      })
      .on('broadcast', { event: 'return_to_lobby' }, () => {
        onLeaveGame();
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [sessionId]);

  const resetRoundData = () => {
    setUserWords(Array(7).fill(''));
    setHasValidated(false);
    setSubmissions([]);
    setTimeLeft(90);
  };

  useEffect(() => {
    if (phase !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerValidation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && players.length > 0 && submissions.length >= players.length) {
      calculateRoundScores();
    }
  }, [submissions, players, phase]);

  const triggerValidation = () => {
    if (hasValidated) return;
    setHasValidated(true);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'submit_words',
      payload: {
        userId: profile.user_id,
        userName: profile.username,
        avatarUrl: profile.avatar_url,
        words: userWords.map((w) => w.trim().toLowerCase()),
      },
    });
  };

  const handleHostStartGame = () => {
    if (wordsDatabase.length === 0) return alert('La base de mots est vide.');
    const randomWord = wordsDatabase[Math.floor(Math.random() * wordsDatabase.length)];
    channelRef.current?.send({
      type: 'broadcast',
      event: 'start_game',
      payload: { totalRounds, secretWord: randomWord },
    });
  };

  const handleNextRound = async () => {
    if (currentRound >= totalRounds) {
      if (isHost && sessionId) {
        const rankedData = getRankedPlayersWithPoints();
        const rankedUserIds = [...rankedData]
          .sort((a, b) => a.rank - b.rank)
          .map(({ player }) => player.id);
        await submitGameResults(sessionId, rankedUserIds);
      }
      setPhase('final_end');
      return;
    }

    const randomWord = wordsDatabase[Math.floor(Math.random() * wordsDatabase.length)];
    channelRef.current?.send({
      type: 'broadcast',
      event: 'next_round',
      payload: { round: currentRound + 1, secretWord: randomWord },
    });
  };

  const handleReturnToLobby = async () => {
    if (isHost && sessionId) {
      await returnSessionToLobby(sessionId);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'return_to_lobby',
      });
    }
    onLeaveGame();
  };

  const calculateRoundScores = () => {
    const wordCounts: Record<string, number> = {};
    submissions.forEach((sub) => {
      const uniqueUserWords = Array.from(new Set(sub.words.filter((w) => w.length > 0)));
      uniqueUserWords.forEach((w) => {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      });
    });

    const newScores = { ...cumulativeScores };
    submissions.forEach((sub) => {
      const uniqueUserWords = Array.from(new Set(sub.words.filter((w) => w.length > 0)));
      let roundTotal = 0;
      uniqueUserWords.forEach((w) => {
        const count = wordCounts[w] || 0;
        if (count >= 2) {
          roundTotal += count - 1;
        }
      });
      newScores[sub.userId] = (newScores[sub.userId] || 0) + roundTotal;
    });

    setCumulativeScores(newScores);
    setPhase('recap');
  };

  const getWordScoreInfo = (word: string) => {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return { word: '—', points: 0 };

    let count = 0;
    submissions.forEach((s) => {
      if (s.words.includes(cleanWord)) count++;
    });

    const pts = count >= 2 ? count - 1 : 0;
    return { word: cleanWord, points: pts };
  };

  const getRankedPlayersWithPoints = (): RankedPlayer[] => {
    const sorted = [...players].sort(
      (a, b) => (cumulativeScores[b.id] || 0) - (cumulativeScores[a.id] || 0)
    );

    const N = players.length;
    const rankedList: RankedPlayer[] = [];

    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        const prevScore = cumulativeScores[sorted[i - 1].id] || 0;
        const currentScore = cumulativeScores[sorted[i].id] || 0;

        if (currentScore < prevScore) {
          currentRank = i + 1;
        }
      }

      const pointsGiven = Math.max(1, N - currentRank + 1);
      rankedList.push({ player: sorted[i], rank: currentRank, pointsGiven });
    }

    return rankedList;
  };

  return {
    phase,
    totalRounds,
    setTotalRounds,
    currentRound,
    wordsDatabase,
    currentSecretWord,
    userWords,
    setUserWords,
    hasValidated,
    timeLeft,
    submissions,
    players,
    cumulativeScores,
    triggerValidation,
    handleHostStartGame,
    handleNextRound,
    handleReturnToLobby,
    getWordScoreInfo,
    getRankedPlayersWithPoints,
  };
}
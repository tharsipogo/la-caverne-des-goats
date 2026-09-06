'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Player {
  id: string;
  name: string;
  avatar_url: string;
  score: number;
}

interface PlayerSubmission {
  userId: string;
  userName: string;
  avatarUrl: string;
  words: string[];
}

interface ScoredWord {
  word: string;
  points: number;
}

interface Props {
  sessionCode: string;
  profile: any;
  isHost: boolean;
  onLeaveGame: () => void;
}

export default function SoitConnecteGame({ sessionCode, profile, isHost, onLeaveGame }: Props) {
  // Configuration
  const [totalRounds, setTotalRounds] = useState(3);
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<'setup' | 'playing' | 'recap' | 'final_end'>('setup');

  // Mots dynamiques Supabase
  const [wordsDatabase, setWordsDatabase] = useState<string[]>([]);
  const [newWordInput, setNewWordInput] = useState('');
  const [addSuccessMsg, setAddSuccessMsg] = useState(false);

  // Joueurs & Session
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // État du tour
  const [currentSecretWord, setCurrentSecretWord] = useState('');
  const [userWords, setUserWords] = useState<string[]>(Array(7).fill(''));
  const [hasValidated, setHasValidated] = useState(false);
  const [submissions, setSubmissions] = useState<PlayerSubmission[]>([]);
  const [timeLeft, setTimeLeft] = useState(90);

  // Score global accumulé
  const [cumulativeScores, setCumulativeScores] = useState<Record<string, number>>({});

  const channelRef = useRef<any>(null);

  // 1. Charger les mots depuis la base de données Supabase
  const fetchWords = async () => {
    const { data, error } = await supabase.from('soit_connecte_words').select('word');
    if (data && data.length > 0) {
      setWordsDatabase(data.map((w) => w.word));
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  // 2. Initialisation de la session Supabase
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
        setPlayers(pList.map((p) => ({ id: p.user_id, name: p.name, avatar_url: p.avatar_url, score: 0 })));
        const initialScores: Record<string, number> = {};
        pList.forEach((p) => (initialScores[p.user_id] = 0));
        setCumulativeScores(initialScores);
      }
    })();
  }, [sessionCode]);

  // 3. Ajouter un nouveau mot à la BDD
  const handleAddWord = async () => {
    const wordToAdd = newWordInput.trim();
    if (!wordToAdd) return;

    const { error } = await supabase.from('soit_connecte_words').insert({ word: wordToAdd });

    if (error) {
      alert('Erreur : ce mot existe déjà ou est invalide.');
      return;
    }

    setNewWordInput('');
    setAddSuccessMsg(true);
    setTimeout(() => setAddSuccessMsg(false), 2000);
    fetchWords();
  };

  // Écoute Supabase Realtime
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

  // Timer du tour (1min30)
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

  const handleNextRound = () => {
    if (currentRound >= totalRounds) {
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

  const getWordScoreInfo = (word: string): ScoredWord => {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return { word: '—', points: 0 };

    let count = 0;
    submissions.forEach((s) => {
      if (s.words.includes(cleanWord)) count++;
    });

    const pts = count >= 2 ? count - 1 : 0;
    return { word: cleanWord, points: pts };
  };

  // ================= 1. SETUP =================
  if (phase === 'setup') {
    return (
      <div className="max-w-md mx-auto p-6 bg-[#121420] border-2 border-amber/60 rounded-2xl text-center shadow-2xl flex flex-col gap-5 my-auto">
        <div>
          <div className="eyebrow">Jeu En Ligne</div>
          <h1 className="text-2xl font-black text-amber mt-1">Soit connecté 🔗</h1>
          <p className="text-xs text-slate-400 mt-1">
            Trouve des mots en lien avec le thème. Plus vous êtes nombreux à écrire le même mot, plus vous marquez de points !
          </p>
        </div>

        {/* Compteur de mots disponibles */}
        <div className="text-xs text-amber font-bold bg-amber/10 p-2 rounded-xl border border-amber/20">
          📚 Banque actuelle : <b>{wordsDatabase.length}</b> mots
        </div>

        {/* Formulaire d'ajout de mot */}
        <div className="bg-surface2 p-3 rounded-xl border border-white/10 flex flex-col gap-2 text-left">
          <span className="text-[11px] text-slate-300 font-bold">➕ Ajouter un mot à la base :</span>
          <div className="flex gap-2">
            <input
              className="input text-xs flex-1"
              placeholder="Ex: Piratage, Escalade..."
              value={newWordInput}
              onChange={(e) => setNewWordInput(e.target.value)}
            />
            <button className="btn-ghost border border-amber text-amber px-3 py-1 text-xs font-bold" onClick={handleAddWord}>
              Ajouter
            </button>
          </div>
          {addSuccessMsg && <span className="text-[10px] text-green-400 font-bold">✓ Mot ajouté avec succès !</span>}
        </div>

        {isHost ? (
          <div className="flex flex-col gap-4 bg-surface2 p-4 rounded-xl border border-white/10">
            <label className="text-xs text-slate-300 font-bold block text-left">
              Nombre de tours :
            </label>
            <div className="flex justify-center items-center gap-4">
              <button
                className="btn-ghost border border-white/20 px-4 py-2 font-bold"
                onClick={() => setTotalRounds((r) => Math.max(1, r - 1))}
              >
                -
              </button>
              <span className="text-2xl font-black text-amber">{totalRounds}</span>
              <button
                className="btn-ghost border border-white/20 px-4 py-2 font-bold"
                onClick={() => setTotalRounds((r) => Math.min(10, r + 1))}
              >
                +
              </button>
            </div>
            <button className="btn w-full py-3 mt-2" onClick={handleHostStartGame}>
              ▶ Lancer la partie
            </button>
          </div>
        ) : (
          <div className="p-4 bg-surface2 rounded-xl border border-white/10 text-xs text-slate-400 animate-pulse">
            En attente du lancement par l'hôte...
          </div>
        )}
      </div>
    );
  }

  // ================= 2. PLAYING =================
  if (phase === 'playing') {
    return (
      <div className="max-w-md mx-auto p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between bg-[#121420] p-4 rounded-2xl border border-white/10 shadow-lg">
          <div>
            <span className="text-[10px] text-amber font-bold uppercase tracking-wider block">
              Tour {currentRound} / {totalRounds}
            </span>
            <span className="text-xs text-slate-400">Mot thème :</span>
            <h2 className="text-xl font-black text-white capitalize">{currentSecretWord}</h2>
          </div>

          <div
            className={`flex items-center justify-center w-14 h-14 rounded-2xl border-2 font-black text-lg shadow-inner ${
              timeLeft <= 15
                ? 'border-red-500 bg-red-500/20 text-red-400 animate-pulse'
                : 'border-amber bg-amber/10 text-amber'
            }`}
          >
            {timeLeft}s
          </div>
        </div>

        <div className="bg-[#121420] p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-3">
          <span className="text-xs text-slate-400 font-bold">
            Écris 7 mots en lien avec "{currentSecretWord}" :
          </span>

          <div className="flex flex-col gap-2">
            {userWords.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 w-4 text-right">{idx + 1}.</span>
                <input
                  disabled={hasValidated}
                  className="input w-full text-xs py-2 disabled:opacity-50 disabled:bg-surface2"
                  placeholder={`Mot ${idx + 1}...`}
                  value={val}
                  onChange={(e) => {
                    const updated = [...userWords];
                    updated[idx] = e.target.value;
                    setUserWords(updated);
                  }}
                />
              </div>
            ))}
          </div>

          {!hasValidated ? (
            <button className="btn w-full py-3 mt-2 font-bold" onClick={triggerValidation}>
              ✓ Valider mes mots
            </button>
          ) : (
            <div className="p-3 bg-amber/20 border border-amber/40 rounded-xl text-center text-xs text-amber font-bold animate-pulse mt-2">
              Mots enregistrés ! En attente des autres joueurs ({submissions.length} / {players.length})...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= 3. RECAP =================
  if (phase === 'recap') {
    return (
      <div className="max-w-3xl mx-auto p-4 flex flex-col gap-6">
        <div className="text-center">
          <div className="eyebrow">Récapitulatif du Tour {currentRound}</div>
          <h1 className="text-2xl font-black text-amber mt-1">
            Mots associés à "{currentSecretWord}"
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {submissions.map((sub) => (
            <div
              key={sub.userId}
              className="bg-[#121420] p-4 rounded-2xl border border-white/10 flex flex-col gap-3 shadow-xl"
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                <img
                  src={sub.avatarUrl}
                  className="w-10 h-10 rounded-xl bg-surface2 border border-amber object-cover"
                  alt=""
                />
                <span className="font-bold text-white text-sm">{sub.userName}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {sub.words.map((w, idx) => {
                  const info = getWordScoreInfo(w);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface2 text-xs"
                    >
                      <span className="font-medium text-slate-200 capitalize">{info.word}</span>
                      {info.points > 0 ? (
                        <span className="font-black text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full border border-green-500/40">
                          +{info.points} pt{info.points > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">0 pt</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {isHost ? (
          <button className="btn w-full py-4 text-sm font-black" onClick={handleNextRound}>
            {currentRound < totalRounds ? 'Tour suivant →' : 'Voir le classement final 🏆'}
          </button>
        ) : (
          <div className="p-4 bg-surface2 rounded-xl border border-white/10 text-center text-xs text-slate-400 animate-pulse">
            En attente de l'hôte pour la suite...
          </div>
        )}
      </div>
    );
  }

  // ================= 4. FINAL =================
  const sortedPlayers = [...players].sort(
    (a, b) => (cumulativeScores[b.id] || 0) - (cumulativeScores[a.id] || 0)
  );

  return (
    <div className="max-w-md mx-auto p-6 bg-[#121420] border-2 border-amber/60 rounded-2xl text-center shadow-2xl flex flex-col gap-6 my-auto">
      <div>
        <div className="eyebrow">Fin de la partie</div>
        <h1 className="text-3xl font-black text-amber mt-1">Classement Final 🏆</h1>
      </div>

      <div className="flex flex-col gap-2">
        {sortedPlayers.map((p, idx) => {
          const finalRankPoints = players.length - idx;

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                idx === 0
                  ? 'bg-amber/20 border-amber text-amber font-bold scale-105'
                  : 'bg-surface2 border-white/10 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-black text-sm w-4">{idx + 1}.</span>
                <img
                  src={p.avatar_url}
                  className="w-9 h-9 rounded-xl border border-white/20 object-cover"
                  alt=""
                />
                <span className="text-sm font-bold">{p.name}</span>
              </div>

              <div className="text-right">
                <span className="block text-xs font-black">
                  {cumulativeScores[p.id] || 0} pts
                </span>
                <span className="text-[10px] text-amber font-bold">
                  +{finalRankPoints} pts au classement
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn-ghost border border-white/20 w-full py-3 text-xs" onClick={onLeaveGame}>
        ← Retour au menu
      </button>
    </div>
  );
}
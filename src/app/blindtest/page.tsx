'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { shuffle } from '@/lib/utils';

type Phase = 'setup' | 'playing' | 'revealed' | 'end';

interface ScorePlayer {
  name: string;
  score: number;
}

export default function BlindTestPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [duration, setDuration] = useState<10 | 15 | 20 | 30>(15);
  const [loading, setLoading] = useState(true);

  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['Joueur 1', 'Joueur 2']);
  const [winningScore, setWinningScore] = useState(10);

  const [pool, setPool] = useState<ListItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('setup');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [listName, setListName] = useState('');
  const [players, setPlayers] = useState<ScorePlayer[]>([]);
  const [outOfTracks, setOutOfTracks] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').eq('type', 'audio').order('created_at', { ascending: false });
      const withEnough: GameList[] = [];
      if (data) {
        for (const l of data as GameList[]) {
          const { count: c } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('list_id', l.id);
          if (c && c > 0) withEnough.push(l);
        }
      }
      setLists(withEnough);
      if (withEnough.length > 0) setListId(withEnough[0].id);
      setLoading(false);
    })();
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setCount(n: number) {
    const clamped = Math.max(1, Math.min(30, n));
    setPlayerCount(clamped);
    setPlayerNames((prev) => {
      const next = [...prev];
      while (next.length < clamped) next.push(`Joueur ${next.length + 1}`);
      return next.slice(0, clamped);
    });
  }

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function reveal() {
    clearTimer();
    const audio = audioRef.current;
    if (audio) audio.pause();
    setPhase('revealed');
  }

  function playTrack(index: number, tracks: ListItem[]) {
    const audio = audioRef.current;
    const track = tracks[index];
    if (!audio || !track?.audio_url) return;
    clearTimer();
    audio.src = track.audio_url;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setCurrentIndex(index);
    setPhase('playing');
    setSecondsLeft(duration);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          reveal();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function start() {
    if (!listId) return;
    const { data: items } = await supabase.from('items').select('*').eq('list_id', listId);
    if (!items || items.length < 1) {
      alert('Il faut au moins 1 extrait dans cette base.');
      return;
    }
    const shuffled = shuffle(items as ListItem[]);
    const list = lists.find((l) => l.id === listId);
    setListName(list?.name || '');
    setPool(shuffled);
    setPlayers(playerNames.map((n, i) => ({ name: n.trim() || `Joueur ${i + 1}`, score: 0 })));
    setOutOfTracks(false);
    playTrack(0, shuffled);
  }

  function awardPoint(playerIndex: number | null) {
    const updated = players.map((p, i) => (i === playerIndex ? { ...p, score: p.score + 1 } : p));
    setPlayers(updated);

    const winnerFound = playerIndex !== null && updated[playerIndex].score >= winningScore;
    if (winnerFound) {
      setPhase('end');
      return;
    }
    if (currentIndex + 1 >= pool.length) {
      setOutOfTracks(true);
      setPhase('end');
      return;
    }
    playTrack(currentIndex + 1, pool);
  }

  function reset() {
    clearTimer();
    const audio = audioRef.current;
    if (audio) audio.pause();
    setPool([]);
    setPlayers([]);
    setPhase('setup');
  }

  if (loading) return <p className="text-muted">Chargement...</p>;

  const audioEl = <audio ref={audioRef} onEnded={reveal} className="hidden" />;

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const champion = sortedPlayers.length > 0 && sortedPlayers[0].score >= winningScore ? sortedPlayers[0] : null;

  // -------- Fin --------
  if (phase === 'end') {
    return (
      <div className="max-w-3xl mx-auto py-8">
        {audioEl}
        <button className="text-muted text-[13px] mb-4 hover:text-amber transition" onClick={reset}>
          ← Recommencer
        </button>
        <div className="mb-7 text-center">
          <div className="eyebrow">Terminé</div>
          <h1 className="font-serif text-3xl font-bold">
            {champion ? <>🏆 <span className="text-amber">{champion.name}</span> gagne !</> : 'Blind Test terminé'}
          </h1>
          {!champion && outOfTracks && (
            <p className="text-muted mt-2 text-[14.5px]">Plus d'extraits disponibles avant que quelqu'un atteigne {winningScore} points.</p>
          )}
        </div>
        <div className="flex flex-col gap-2.5 max-w-md mx-auto">
          {sortedPlayers.map((p, i) => (
            <div
              key={p.name}
              className={`flex items-center gap-3.5 bg-surface border rounded-xl px-4 py-3 ${
                i === 0 ? 'border-amber shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-border'
              }`}
            >
              <div className="font-serif font-bold text-xl text-amber w-8 text-center shrink-0">{i + 1}</div>
              <div className="flex-1 text-[14.5px] font-medium">{p.name}</div>
              <div className="font-serif text-lg text-amber font-bold">{p.score} pts</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <button className="btn mt-6" onClick={reset}>↺ Nouveau blind test</button>
        </div>
      </div>
    );
  }

  // -------- En cours (playing / revealed) --------
  if (phase === 'playing' || phase === 'revealed') {
    const current = pool[currentIndex];
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const progress = (secondsLeft / duration) * circumference;

    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col min-h-[80vh] justify-between pb-8">
        {audioEl}

        {/* Barre supérieure */}
        <div className="w-full flex items-center justify-between pt-2">
          {/* Joueurs et scores à gauche */}
          <div className="flex items-center gap-3 flex-wrap">
            {players.map((p) => (
              <div
                key={p.name}
                className="bg-[#151824] border border-[#232a3f] rounded-full px-4 py-1.5 text-xs md:text-sm font-medium flex items-center gap-2"
              >
                <span className="text-white/80">{p.name}</span>
                <span className="text-amber font-extrabold">{p.score}</span>
              </div>
            ))}
          </div>

          {/* Avancement à droite */}
          <div className="text-indigo-200/50 text-xs md:text-sm font-medium">
            Extrait {currentIndex + 1} / {pool.length} • objectif {winningScore} pts
          </div>
        </div>

        {/* Zone centrale */}
        <div className="flex flex-col items-center justify-center my-auto py-8">
          {phase === 'playing' ? (
            <div className="flex flex-col items-center gap-6">
              {/* Carte noire centrale */}
              <div className="w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] bg-[#141622] border border-[#222638] rounded-3xl flex flex-col items-center justify-center p-6 shadow-2xl relative">
                
                {/* Chrono circulaire SVG avec les 2 cercles fins d'arrière-plan */}
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    {/* Grand cercle extérieur très fin */}
                    <circle
                      cx="100"
                      cy="100"
                      r="82"
                      stroke="#f59e0b"
                      strokeWidth="1"
                      strokeOpacity="0.25"
                      fill="transparent"
                    />

                    {/* Petit cercle intérieur très fin */}
                    <circle
                      cx="100"
                      cy="100"
                      r="40"
                      stroke="#f59e0b"
                      strokeWidth="1"
                      strokeOpacity="0.2"
                      fill="transparent"
                    />

                    {/* Anneau de fond principal (sombre) */}
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke="#222638"
                      strokeWidth="6"
                      fill="transparent"
                    />

                    {/* Anneau de progression principal (jaune ambre) */}
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke="#f59e0b"
                      strokeWidth="6"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - progress}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>

                  {/* Temps restant au centre */}
                  <span className="absolute font-serif text-5xl font-black text-white">
                    {secondsLeft}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-indigo-300/60 text-xs font-semibold mt-4">
                  <span>🎵</span> en cours...
                </div>
              </div>

              {/* Bouton pour révéler */}
              <button
                className="bg-[#202538] hover:bg-[#2a314a] text-white font-semibold text-sm px-6 py-3 rounded-xl border border-white/10 transition shadow-md"
                onClick={reveal}
              >
                Révéler maintenant
              </button>
            </div>
          ) : (
            /* Phase Révélée */
            <div className="flex flex-col items-center gap-6 w-full max-w-md">
              <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] bg-[#141622] border-2 border-amber/80 shadow-[0_0_30px_rgba(245,158,11,0.25)] rounded-3xl overflow-hidden flex flex-col items-center justify-center p-4">
                {current.image_url ? (
                  <img src={current.image_url} className="w-full h-full object-cover rounded-2xl" alt="" />
                ) : (
                  <div className="text-6xl">🎵</div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 text-center">
                  <div className="font-serif text-2xl font-bold text-white">{current.name}</div>
                </div>
              </div>

              {/* Nouveau design des boutons "Qui a trouvé ?" */}
              <div className="w-full text-center flex flex-col items-center gap-4">
                <p className="text-slate-300 text-sm font-semibold">Qui a trouvé ?</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {players.map((p, i) => (
                    <button
                      key={p.name}
                      onClick={() => awardPoint(i)}
                      className="bg-amber hover:brightness-105 active:scale-95 text-[#101118] font-bold text-sm px-6 py-3 rounded-xl shadow-[0_4px_14px_rgba(245,158,11,0.3)] transition"
                    >
                      {p.name}
                    </button>
                  ))}
                  <button
                    onClick={() => awardPoint(null)}
                    className="bg-[#1a1d2d] hover:bg-[#23273c] active:scale-95 text-slate-300 font-semibold text-sm px-6 py-3 rounded-xl border border-[#2d334a] transition"
                  >
                    Personne
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer avec bouton Annuler */}
        <div className="flex justify-start">
          <button className="text-muted text-sm hover:text-amber transition" onClick={reset}>
            ← Annuler
          </button>
        </div>
      </div>
    );
  }

  // -------- Setup --------
  return (
    <div>
      <div className="mb-7">
        <div className="eyebrow">Mode</div>
        <h1 className="font-serif text-3xl">Blind Test</h1>
        <p className="text-muted mt-2 text-[14.5px] max-w-xl">
          Un extrait audio minuté est joué puis révélé automatiquement. Le premier qui trouve marque un point ; premier au score gagnant remporte la partie.
        </p>
      </div>

      {lists.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">
          Crée d'abord une base de type "Audio" dans "Mes bases" et ajoute-y des extraits.
        </p>
      ) : (
        <div className="panel flex flex-col gap-6 max-w-2xl">
          <div className="flex gap-3.5 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[12.5px] text-muted block mb-1.5">Base audio</label>
              <select className="input" value={listId} onChange={(e) => setListId(e.target.value)}>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[12.5px] text-muted block mb-1.5">Durée par extrait</label>
              <div className="flex gap-2">
                {[10, 15, 20, 30].map((s) => (
                  <button
                    key={s}
                    onClick={() => setDuration(s as 10 | 15 | 20 | 30)}
                    className={`px-3.5 py-2.5 rounded-lg text-sm border ${
                      duration === s ? 'border-amber text-amber' : 'border-border text-text bg-surface2'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Nombre de joueurs</label>
            <div className="flex items-center gap-3">
              <button className="btn-secondary btn-small" onClick={() => setCount(playerCount - 1)}>−</button>
              <span className="font-serif text-xl w-8 text-center">{playerCount}</span>
              <button className="btn-secondary btn-small" onClick={() => setCount(playerCount + 1)}>+</button>
            </div>
          </div>

          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Noms des joueurs</label>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              {playerNames.map((name, i) => (
                <input
                  key={i}
                  className="input"
                  value={name}
                  onChange={(e) => {
                    const next = [...playerNames];
                    next[i] = e.target.value;
                    setPlayerNames(next);
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">
              Score gagnant : <b className="text-amber">{winningScore}</b> point{winningScore > 1 ? 's' : ''}
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={winningScore}
              onChange={(e) => setWinningScore(Number(e.target.value))}
              className="w-full max-w-md accent-amber"
            />
            <div className="flex justify-between text-[11px] text-muted max-w-md">
              <span>1</span>
              <span>20</span>
            </div>
          </div>

          <button className="btn w-fit" onClick={start} disabled={!listId}>▶ Démarrer</button>
        </div>
      )}
      {audioEl}
    </div>
  );
}
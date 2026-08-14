'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { pickRandom } from '@/lib/utils';

type Phase = 'setup' | 'playing' | 'revealed' | 'end';

export default function BlindTestPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [listId, setListId] = useState('');
  const [count, setCount] = useState<5 | 10 | 20>(5);
  const [duration, setDuration] = useState<10 | 15 | 20 | 30>(15);
  const [loading, setLoading] = useState(true);

  const [pool, setPool] = useState<ListItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('setup');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [listName, setListName] = useState('');

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
    audio.play().catch(() => {
      /* lecture bloquée par le navigateur : le bouton "Réessayer" gère ce cas */
    });
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
    const n = Math.min(count, items.length);
    const selected = pickRandom(items as ListItem[], n);
    const list = lists.find((l) => l.id === listId);
    setListName(list?.name || '');
    setPool(selected);
    playTrack(0, selected);
  }

  function nextTrack() {
    if (currentIndex + 1 >= pool.length) {
      const audio = audioRef.current;
      if (audio) audio.pause();
      setPhase('end');
    } else {
      playTrack(currentIndex + 1, pool);
    }
  }

  function reset() {
    clearTimer();
    const audio = audioRef.current;
    if (audio) audio.pause();
    setPool([]);
    setPhase('setup');
  }

  if (loading) return <p className="text-muted">Chargement...</p>;

  const audioEl = <audio ref={audioRef} onEnded={reveal} className="hidden" />;

  // -------- Fin --------
  if (phase === 'end') {
    return (
      <div>
        {audioEl}
        <button className="text-muted text-[13px] mb-4 hover:text-amber" onClick={reset}>← Recommencer</button>
        <div className="mb-7">
          <div className="eyebrow">Terminé</div>
          <h1 className="font-serif text-3xl">Blind Test — {listName}</h1>
          <p className="text-muted mt-2 text-[14.5px]">{pool.length} extrait{pool.length > 1 ? 's' : ''} passé{pool.length > 1 ? 's' : ''}.</p>
        </div>
        <div className="flex flex-col gap-2.5">
          {pool.map((it, i) => (
            <div key={it.id} className="flex items-center gap-3.5 bg-surface border border-border rounded-lg px-4 py-3">
              <div className="font-serif font-bold text-amber w-7 text-center shrink-0">{i + 1}</div>
              {it.image_url && <img src={it.image_url} className="w-11 h-11 object-cover rounded-md" alt="" />}
              <div className="text-[14.5px] font-medium">{it.name}</div>
            </div>
          ))}
        </div>
        <button className="btn mt-6" onClick={reset}>↺ Nouveau blind test</button>
      </div>
    );
  }

  // -------- En cours (playing / revealed) --------
  if (phase === 'playing' || phase === 'revealed') {
    const current = pool[currentIndex];
    return (
      <div>
        {audioEl}
        <button className="text-muted text-[13px] mb-4 hover:text-amber" onClick={reset}>← Annuler</button>
        <div className="mb-7">
          <div className="eyebrow">{listName} — {currentIndex + 1} / {pool.length}</div>
          <h1 className="font-serif text-3xl">{phase === 'playing' ? 'Devinez !' : 'C\'était...'}</h1>
        </div>

        <div className="flex flex-col items-center gap-6 mt-6">
          {phase === 'playing' ? (
            <>
              <div className="w-[220px] h-[220px] rounded-full border-4 border-amber flex items-center justify-center relative">
                <div className="font-serif text-5xl font-bold text-amber">{secondsLeft}</div>
              </div>
              <p className="text-muted text-sm">🔊 Extrait en cours de lecture...</p>
              <button className="btn-secondary" onClick={reveal}>⏭ Couper et révéler maintenant</button>
            </>
          ) : (
            <>
              <div className="w-[260px] min-h-[180px] bg-gradient-to-br from-surface2 to-surface border border-amberDim rounded-2xl flex flex-col items-center justify-center p-6 text-center gap-4">
                {current.image_url && <img src={current.image_url} className="w-full max-h-[140px] object-contain rounded-lg" alt="" />}
                <div className="font-serif text-2xl font-semibold">{current.name}</div>
              </div>
              <button className="btn" onClick={nextTrack}>
                {currentIndex + 1 >= pool.length ? '🏁 Voir le récap' : '▶ Extrait suivant'}
              </button>
            </>
          )}
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
          Un extrait audio est joué, minuté. Il se coupe automatiquement et révèle le titre à la fin du temps.
        </p>
      </div>

      {lists.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">
          Crée d'abord une base de type "Audio" dans "Mes bases" et ajoute-y des extraits.
        </p>
      ) : (
        <div className="panel flex gap-3.5 flex-wrap items-end">
          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Base audio</label>
            <select className="input" value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Nombre d'extraits</label>
            <div className="flex gap-2">
              {[5, 10, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n as 5 | 10 | 20)}
                  className={`px-3.5 py-2.5 rounded-lg text-sm border ${
                    count === n ? 'border-amber text-amber' : 'border-border text-text bg-surface2'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
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
          <button className="btn" onClick={start} disabled={!listId}>▶ Démarrer</button>
        </div>
      )}
      {audioEl}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GameList, ListItem } from '@/lib/types';
import { pickRandom } from '@/lib/utils';

type Slot = ListItem | null;

const AUDIO_CLIP_DURATION = 30; // secondes

export default function BlindPage() {
  const [lists, setLists] = useState<GameList[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [count, setCount] = useState<5 | 10 | 20>(5);
  const [loading, setLoading] = useState(true);

  const [pool, setPool] = useState<ListItem[]>([]);
  const [revealedIndex, setRevealedIndex] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [listName, setListName] = useState('');
  const [listType, setListType] = useState<'text' | 'image' | 'audio'>('text');

  // Lecture audio (bases de type "Audio")
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lists').select('*').order('created_at', { ascending: false });
      if (data) setLists(data as GameList[]);
      setLoading(false);
    })();
  }, []);

  const inGame = pool.length > 0;
  const done = inGame && revealedIndex >= pool.length;

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopClip() {
    clearTimer();
    const audio = audioRef.current;
    if (audio) audio.pause();
    setIsPlaying(false);
  }

  function playCurrentClip() {
    const audio = audioRef.current;
    const track = pool[revealedIndex];
    if (!audio || !track?.audio_url) return;
    clearTimer();
    audio.src = track.audio_url;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setIsPlaying(true);
    setSecondsLeft(AUDIO_CLIP_DURATION);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopClip();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // Lance automatiquement l'extrait à chaque nouvel item révélé, si la base est audio
  useEffect(() => {
    if (inGame && !done && listType === 'audio') {
      playCurrentClip();
    }
    return () => stopClip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedIndex, inGame, done, listType]);

  async function start() {
    if (!selectedListId) return;
    const { data: items } = await supabase.from('items').select('*').eq('list_id', selectedListId);
    if (!items || items.length < 2) {
      alert('Il faut au moins 2 items dans cette base.');
      return;
    }
    const n = Math.min(count, items.length);
    const selected = pickRandom(items as ListItem[], n);
    const list = lists.find((l) => l.id === selectedListId);
    setListName(list?.name || '');
    setListType(list?.type || 'text');
    setPool(selected);
    setSlots(Array(n).fill(null));
    setRevealedIndex(0);
  }

  function placeAt(slotIndex: number) {
    const current = pool[revealedIndex];
    const next = [...slots];
    next[slotIndex] = current;
    setSlots(next);
    setRevealedIndex(revealedIndex + 1);
  }

  function reset() {
    stopClip();
    setPool([]);
    setSlots([]);
    setRevealedIndex(0);
  }

  if (loading) return <p className="text-muted">Chargement...</p>;

  const audioEl = <audio ref={audioRef} className="hidden" />;

  // -------- Résultats --------
  if (done) {
    return (
      <div>
        {audioEl}
        <button className="text-muted text-[13px] mb-4 hover:text-amber" onClick={reset}>← Recommencer</button>
        <div className="mb-7">
          <div className="eyebrow">Résultat</div>
          <h1 className="font-serif text-3xl">Ton classement — {listName}</h1>
        </div>
        <div className="flex flex-col gap-2.5">
          {slots.map((it, i) => (
            <div
              key={it?.id || i}
              className={`flex items-center gap-3.5 bg-surface border rounded-lg px-4 py-3 ${
                i === 0 ? 'border-amber bg-gradient-to-r from-amber/10 to-transparent' : 'border-border'
              }`}
            >
              <div className="font-serif font-bold text-xl text-amber w-8 text-center shrink-0">{i + 1}</div>
              {it?.image_url && <img src={it.image_url} className="w-11 h-11 object-cover rounded-md" alt="" />}
              <div className="text-[14.5px] font-medium">{it?.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -------- En cours --------
  if (inGame) {
    const current = pool[revealedIndex];
    const isAudio = listType === 'audio' && !!current.audio_url;
    return (
      <div>
        {audioEl}
        <button className="text-muted text-[13px] mb-4 hover:text-amber" onClick={reset}>← Annuler</button>
        <div className="mb-7">
          <div className="eyebrow">{listName}</div>
          <h1 className="font-serif text-3xl">Quel rang pour cet item ?</h1>
          <p className="text-muted mt-2 text-[14.5px]">Choisis une position de 1 à {slots.length} pour l'item révélé.</p>
        </div>

        <div className="flex gap-9 items-start flex-wrap">
          <div className="flex flex-col items-center gap-4 w-[280px] shrink-0">
            <div className="w-[260px] min-h-[260px] bg-gradient-to-br from-surface2 to-surface border border-border rounded-2xl flex flex-col items-center justify-center p-5 text-center gap-3">
              {current.image_url ? (
                <img src={current.image_url} className="w-full max-h-[190px] object-contain rounded-lg" alt="" />
              ) : (
                <div className="text-4xl">{isAudio ? '🎧' : '🎴'}</div>
              )}
              <div className="font-serif text-xl font-semibold">{current.name}</div>

              {isAudio && (
                <div className="flex flex-col items-center gap-2 mt-1">
                  {isPlaying ? (
                    <div className="w-16 h-16 rounded-full border-4 border-amber flex items-center justify-center">
                      <span className="font-serif text-xl font-bold text-amber">{secondsLeft}</span>
                    </div>
                  ) : (
                    <button className="btn-secondary btn-small" onClick={playCurrentClip}>🔁 Réécouter</button>
                  )}
                </div>
              )}
            </div>
            <div className="text-muted text-[12.5px]">
              <b className="text-amber">{revealedIndex + 1}</b> / {pool.length} révélés
            </div>
          </div>

          <div className="flex-1 grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-2.5 min-w-[260px]">
            {slots.map((s, i) => (
              <button
                key={i}
                disabled={!!s}
                onClick={() => placeAt(i)}
                className={`aspect-square rounded-lg border text-sm font-semibold flex flex-col items-center justify-center gap-1 transition ${
                  s
                    ? 'bg-surface2 border-border text-muted cursor-not-allowed'
                    : 'bg-surface border-border hover:border-amber hover:text-amber cursor-pointer'
                }`}
                title={s ? s.name : `Placer en position ${i + 1}`}
              >
                <span className="font-serif text-lg">{i + 1}</span>
                {s && <span className="text-[9px] px-1 truncate max-w-[60px]">{s.name}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------- Setup --------
  const validLists = lists; // filtré côté start()
  return (
    <div>
      <div className="mb-7">
        <div className="eyebrow">Mode</div>
        <h1 className="font-serif text-3xl">Blind Ranking</h1>
        <p className="text-muted mt-2 text-[14.5px] max-w-xl">
          On tire des items au hasard dans une base. Un par un, tu choisis directement leur rang. Pour une base audio,
          un extrait de {AUDIO_CLIP_DURATION}s se lance automatiquement à chaque item.
        </p>
      </div>
      {validLists.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">Crée d'abord une base dans "Mes bases".</p>
      ) : (
        <div className="panel flex gap-3.5 flex-wrap items-end">
          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Base</label>
            <select className="input" value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
              <option value="">— Choisir une base —</option>
              {validLists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}{l.type === 'audio' ? ' 🎵' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12.5px] text-muted block mb-1.5">Nombre d'items</label>
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
          <button className="btn" onClick={start} disabled={!selectedListId}>▶ Démarrer</button>
        </div>
      )}
      {audioEl}
    </div>
  );
}

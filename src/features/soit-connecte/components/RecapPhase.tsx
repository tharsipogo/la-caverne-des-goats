import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlayerSubmission } from '../types';

interface RecapPhaseProps {
  currentRound: number;
  totalRounds: number;
  currentSecretWord: string;
  submissions: PlayerSubmission[];
  isHost: boolean;
  onNextRound: () => void;
  getWordScoreInfo: (word: string) => { word: string; points: number };
}

export function RecapPhase({
  currentRound,
  totalRounds,
  currentSecretWord,
  submissions,
  isHost,
  onNextRound,
  getWordScoreInfo,
}: RecapPhaseProps) {
  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col gap-6">
      <div className="text-center">
        <span className="text-xs text-amber font-bold uppercase">Récapitulatif Tour {currentRound}</span>
        <h1 className="text-2xl font-black text-white mt-1">Mots associés à "{currentSecretWord}"</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {submissions.map((sub) => (
          <Card key={sub.userId} className="flex flex-col gap-3">
            <div className="flex items-center gap-3 border-b border-white/10 pb-2">
              <img src={sub.avatarUrl} className="w-10 h-10 rounded-xl bg-surface2 border border-amber object-cover" alt="" />
              <span className="font-bold text-white text-sm">{sub.userName}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {sub.words.map((w, idx) => {
                const info = getWordScoreInfo(w);
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#1c1e26] text-xs">
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
          </Card>
        ))}
      </div>

      {isHost ? (
        <Button onClick={onNextRound} className="w-full py-4 text-sm font-black">
          {currentRound < totalRounds ? 'Tour suivant →' : 'Voir le classement final 🏆'}
        </Button>
      ) : (
        <div className="p-4 bg-[#1c1e26] rounded-xl border border-white/10 text-center text-xs text-slate-400 animate-pulse">
          En attente de l'hôte pour la suite...
        </div>
      )}
    </div>
  );
}
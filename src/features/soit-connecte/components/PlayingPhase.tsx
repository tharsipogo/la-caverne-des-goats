import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Timer } from '@/components/ui/Timer';

interface PlayingPhaseProps {
  currentRound: number;
  totalRounds: number;
  currentSecretWord: string;
  timeLeft: number;
  userWords: string[];
  setUserWords: (words: string[]) => void;
  hasValidated: boolean;
  onValidate: () => void;
  submissionsCount: number;
  playersCount: number;
}

export function PlayingPhase({
  currentRound,
  totalRounds,
  currentSecretWord,
  timeLeft,
  userWords,
  setUserWords,
  hasValidated,
  onValidate,
  submissionsCount,
  playersCount,
}: PlayingPhaseProps) {
  return (
    <div className="max-w-md mx-auto p-4 flex flex-col gap-4">
      <Card className="flex items-center justify-between">
        <div>
          <span className="text-[10px] text-amber font-bold uppercase tracking-wider block">
            Tour {currentRound} / {totalRounds}
          </span>
          <span className="text-xs text-slate-400">Mot thème :</span>
          <h2 className="text-xl font-black text-white capitalize">{currentSecretWord}</h2>
        </div>
        <Timer seconds={timeLeft} />
      </Card>

      <Card className="flex flex-col gap-3">
        <span className="text-xs text-slate-400 font-bold">Écris 7 mots en lien avec "{currentSecretWord}" :</span>
        <div className="flex flex-col gap-2">
          {userWords.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 w-4 text-right">{idx + 1}.</span>
              <Input
                disabled={hasValidated}
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
          <Button onClick={onValidate} className="w-full py-3 mt-2 font-bold">
            ✓ Valider mes mots
          </Button>
        ) : (
          <div className="p-3 bg-amber/20 border border-amber/40 rounded-xl text-center text-xs text-amber font-bold animate-pulse mt-2">
            Mots enregistrés ! En attente des autres joueurs ({submissionsCount} / {playersCount})...
          </div>
        )}
      </Card>
    </div>
  );
}
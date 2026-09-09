import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface SetupPhaseProps {
  isHost: boolean;
  wordsDatabaseCount: number;
  totalRounds: number;
  setTotalRounds: React.Dispatch<React.SetStateAction<number>>;
  onStartGame: () => void;
}

export function SetupPhase({ isHost, wordsDatabaseCount, totalRounds, setTotalRounds, onStartGame }: SetupPhaseProps) {
  return (
    <Card glow className="max-w-md mx-auto text-center flex flex-col gap-5 my-auto">
      <div>
        <span className="text-xs text-amber font-bold tracking-widest uppercase block">Jeu En Ligne</span>
        <h1 className="text-2xl font-black text-amber mt-1">Soit connecté 🔗</h1>
        <p className="text-xs text-slate-400 mt-1">
          Trouve des mots en lien avec le thème. Plus vous êtes nombreux à écrire le même mot, plus vous marquez de points !
        </p>
      </div>

      <div className="text-xs text-amber font-bold bg-amber/10 p-2 rounded-xl border border-amber/20">
        📚 Banque actuelle : <b>{wordsDatabaseCount}</b> mots
      </div>

      {isHost ? (
        <div className="flex flex-col gap-4 bg-[#1c1e26] p-4 rounded-xl border border-white/10">
          <label className="text-xs text-slate-300 font-bold block text-left">Nombre de tours :</label>
          <div className="flex justify-center items-center gap-4">
            <Button variant="ghost" onClick={() => setTotalRounds((r) => Math.max(1, r - 1))}>-</Button>
            <span className="text-2xl font-black text-amber">{totalRounds}</span>
            <Button variant="ghost" onClick={() => setTotalRounds((r) => Math.min(10, r + 1))}>+</Button>
          </div>
          <Button onClick={onStartGame} className="w-full py-3 mt-2">
            ▶ Lancer la partie
          </Button>
        </div>
      ) : (
        <div className="p-4 bg-[#1c1e26] rounded-xl border border-white/10 text-xs text-slate-400 animate-pulse">
          En attente du lancement par l'hôte...
        </div>
      )}
    </Card>
  );
}
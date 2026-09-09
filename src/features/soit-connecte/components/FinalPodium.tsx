import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RankedPlayer } from '../types';

interface FinalPodiumProps {
  rankedData: RankedPlayer[];
  cumulativeScores: Record<string, number>;
  isHost: boolean;
  onReturnToLobby: () => void;
}

export function FinalPodium({ rankedData, cumulativeScores, isHost, onReturnToLobby }: FinalPodiumProps) {
  return (
    <Card glow className="max-w-md mx-auto text-center flex flex-col gap-6 my-auto">
      <div>
        <span className="text-xs text-amber font-bold uppercase">Fin de la partie</span>
        <h1 className="text-3xl font-black text-amber mt-1">Classement Final 🏆</h1>
      </div>

      <div className="flex flex-col gap-2">
        {rankedData.map(({ player, rank, pointsGiven }) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-xl border ${
              rank === 1
                ? 'bg-amber/20 border-amber text-amber font-bold scale-105'
                : 'bg-[#1c1e26] border-white/10 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-black text-sm w-4">{rank}.</span>
              <img src={player.avatar_url} className="w-9 h-9 rounded-xl border border-white/20 object-cover" alt="" />
              <span className="text-sm font-bold">{player.name}</span>
            </div>

            <div className="text-right">
              <span className="block text-xs font-black">{cumulativeScores[player.id] || 0} pts</span>
              <span className="text-[10px] text-amber font-bold">+{pointsGiven} pts au classement</span>
            </div>
          </div>
        ))}
      </div>

      {isHost ? (
        <Button onClick={onReturnToLobby} className="w-full py-3 text-xs font-bold">
          👑 Retourner au salon (Choix du jeu)
        </Button>
      ) : (
        <div className="p-3 bg-[#1c1e26] rounded-xl border border-white/10 text-xs text-slate-400 animate-pulse">
          En attente de l'hôte pour revenir au salon...
        </div>
      )}
    </Card>
  );
}
'use client';

import { useSoitConnecteEngine } from './hooks/useSoitConnecteEngine';
import { SetupPhase } from './components/SetupPhase';
import { PlayingPhase } from './components/PlayingPhase';
import { RecapPhase } from './components/RecapPhase';
import { FinalPodium } from './components/FinalPodium';
import { SoitConnecteProps } from './types';
import { HostBadge } from '@/components/game/HostBadge';
import { DisconnectBanner } from '@/components/game/DisconnectBanner';

export default function SoitConnecteContainer(props: SoitConnecteProps) {
  const engine = useSoitConnecteEngine(props);
  // Le premier joueur ajouté à la session est toujours l'hôte (il crée
  // le salon avant que quiconque puisse le rejoindre).
  const hostName = engine.players[0]?.name;

  // Joueurs (hors moi-même) absents du dernier "sync" de présence reçu —
  // tant qu'on n'a reçu aucune synchro, on ne sait rien (évite un faux
  // positif juste après le montage du canal).
  const disconnectedNames =
    engine.onlineUserIds.size === 0
      ? []
      : engine.players
          .filter((p) => p.id !== props.profile.user_id && !engine.onlineUserIds.has(p.id))
          .map((p) => p.name);

  return (
    <div className="w-full">
      <HostBadge hostName={hostName} />
      <DisconnectBanner names={disconnectedNames} />
      {engine.phase === 'setup' && (
        <SetupPhase
          isHost={props.isHost}
          wordsDatabaseCount={engine.wordsDatabase.length}
          totalRounds={engine.totalRounds}
          setTotalRounds={engine.setTotalRounds}
          onStartGame={engine.handleHostStartGame}
        />
      )}

      {engine.phase === 'playing' && (
        <PlayingPhase
          currentRound={engine.currentRound}
          totalRounds={engine.totalRounds}
          currentSecretWord={engine.currentSecretWord}
          timeLeft={engine.timeLeft}
          userWords={engine.userWords}
          setUserWords={engine.setUserWords}
          hasValidated={engine.hasValidated}
          onValidate={engine.triggerValidation}
          submissionsCount={engine.submissions.length}
          playersCount={engine.players.length}
        />
      )}

      {engine.phase === 'recap' && (
        <RecapPhase
          currentRound={engine.currentRound}
          totalRounds={engine.totalRounds}
          currentSecretWord={engine.currentSecretWord}
          submissions={engine.submissions}
          isHost={props.isHost}
          onNextRound={engine.handleNextRound}
          getWordScoreInfo={engine.getWordScoreInfo}
        />
      )}

      {engine.phase !== 'setup' && engine.phase !== 'playing' && engine.phase !== 'recap' && (
        <FinalPodium
          rankedData={engine.getRankedPlayersWithPoints()}
          cumulativeScores={engine.cumulativeScores}
          isHost={props.isHost}
          onReturnToLobby={engine.handleReturnToLobby}
        />
      )}
    </div>
  );
}

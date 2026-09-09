'use client';

import { useSoitConnecteEngine } from './hooks/useSoitConnecteEngine';
import { SetupPhase } from './components/SetupPhase';
import { PlayingPhase } from './components/PlayingPhase';
import { RecapPhase } from './components/RecapPhase';
import { FinalPodium } from './components/FinalPodium';
import { SoitConnecteProps } from './types';

export default function SoitConnecteContainer(props: SoitConnecteProps) {
  const engine = useSoitConnecteEngine(props);

  if (engine.phase === 'setup') {
    return (
      <SetupPhase
        isHost={props.isHost}
        wordsDatabaseCount={engine.wordsDatabase.length}
        totalRounds={engine.totalRounds}
        setTotalRounds={engine.setTotalRounds}
        onStartGame={engine.handleHostStartGame}
      />
    );
  }

  if (engine.phase === 'playing') {
    return (
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
    );
  }

  if (engine.phase === 'recap') {
    return (
      <RecapPhase
        currentRound={engine.currentRound}
        totalRounds={engine.totalRounds}
        currentSecretWord={engine.currentSecretWord}
        submissions={engine.submissions}
        isHost={props.isHost}
        onNextRound={engine.handleNextRound}
        getWordScoreInfo={engine.getWordScoreInfo}
      />
    );
  }

  return (
    <FinalPodium
      rankedData={engine.getRankedPlayersWithPoints()}
      cumulativeScores={engine.cumulativeScores}
      isHost={props.isHost}
      onReturnToLobby={engine.handleReturnToLobby}
    />
  );
}
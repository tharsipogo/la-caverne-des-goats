'use client';

import { useUndercoverArtistEngine } from './hooks/useUndercoverArtistEngine';
import { CanvasBoard } from './components/CanvasBoard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { UndercoverArtistProps } from './types';
import { GameConfigShell } from '@/components/game/GameConfigShell';
import { PlayerNameField } from '@/components/game/PlayerNameField';

export default function UndercoverArtistContainer({ onLeaveGame }: UndercoverArtistProps) {
  const engine = useUndercoverArtistEngine();

  // 1. MENU PRINCIPAL
  if (engine.gameMode === 'menu') {
    return (
      <Card glow className="max-w-md mx-auto my-auto w-full flex flex-col gap-6 text-center">
        <div>
          <span className="text-xs text-amber font-bold uppercase tracking-widest block">Jeu de dessin & rôle</span>
          <h1 className="text-3xl font-black text-amber mt-1">Undercover Artist</h1>
          <p className="text-xs text-slate-400 mt-2">Retrouve l'imposteur qui dessine sans connaître le mot !</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => engine.setGameMode('local')}
            className="p-4 rounded-xl border border-amber/40 bg-amber/10 hover:bg-amber/20 text-white flex items-center justify-between transition-all group"
          >
            <div className="text-left">
              <div className="font-bold text-sm text-amber">🎮 Mode Local (1 écran)</div>
              <div className="text-[11px] text-slate-400">Passe le téléphone à tour de rôle</div>
            </div>
            <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <button
            onClick={() => engine.setGameMode('online')}
            className="p-4 rounded-xl border border-[#4fc9c0]/40 bg-[#4fc9c0]/10 hover:bg-[#4fc9c0]/20 text-white flex items-center justify-between transition-all group"
          >
            <div className="text-left">
              <div className="font-bold text-sm text-[#4fc9c0]">🌐 Mode En Ligne</div>
              <div className="text-[11px] text-slate-400">Joue sur ton écran avec tes amis</div>
            </div>
            <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </Card>
    );
  }

  // 2. SETUP
  if (engine.phase === 'setup') {
    return (
      <GameConfigShell
        title="Configuration"
        subtitle={engine.gameMode === 'local' ? 'Mode Local' : 'Mode En Ligne'}
        onBack={() => engine.setGameMode('menu')}
      >
          <div>
            <label className="text-xs text-muted block mb-1.5">Base de mots</label>
            <select
              className="input"
              value={engine.listId}
              onChange={(e) => engine.setListId(e.target.value)}
            >
              {engine.lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5">Nombre de joueurs</label>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => engine.setCount(engine.playerCount - 1)}>
                −
              </Button>
              <span className="text-xl font-bold w-8 text-center">{engine.playerCount}</span>
              <Button variant="secondary" size="sm" onClick={() => engine.setCount(engine.playerCount + 1)}>
                +
              </Button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5">Noms des joueurs</label>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2.5">
              {engine.playerNames.map((name, i) => (
                <PlayerNameField
                  key={i}
                  index={i}
                  value={name}
                  onChange={(v) => {
                    const next = [...engine.playerNames];
                    next[i] = v;
                    engine.setPlayerNames(next);
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-8 flex-wrap items-end">
            <div>
              <label className="text-xs text-muted block mb-1.5">Nombre d'undercover</label>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => engine.setUndercoverCount(Math.max(1, engine.undercoverCount - 1))}
                >
                  −
                </Button>
                <span className="text-xl font-bold w-6 text-center">{engine.undercoverCount}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => engine.setUndercoverCount(Math.min(engine.maxUndercover, engine.undercoverCount + 1))}
                >
                  +
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted pb-2">
              → <b className="text-amber">{engine.civilCount}</b> civil{engine.civilCount > 1 ? 's' : ''}
            </div>
          </div>

          {engine.gameMode === 'local' ? (
            <Button className="w-full mt-2 py-3" onClick={engine.startLocalGame}>
              ▶ Distribuer les cartes
            </Button>
          ) : (
            <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
              <Button className="w-full" onClick={engine.createOnlineRoom}>
                👑 Créer un salon
              </Button>
              <div className="flex gap-2">
                <Input
                  className="uppercase flex-1"
                  placeholder="Code à 4 lettres"
                  maxLength={4}
                  value={engine.joinCodeInput}
                  onChange={(e) => engine.setJoinCodeInput(e.target.value)}
                />
                <Button variant="ghost" onClick={engine.joinOnlineRoom}>
                  Rejoindre
                </Button>
              </div>
            </div>
          )}
      </GameConfigShell>
    );
  }

  // 3. WAITING (ONLINE)
  if (engine.phase === 'waiting') {
    return (
      <div className="my-auto text-center flex flex-col items-center gap-4 p-4">
        <h2 className="text-xl text-white">Code du salon :</h2>
        <span className="text-4xl font-black text-amber tracking-widest bg-[#1c1e26] px-6 py-2 rounded-xl border border-amber/40 shadow-lg">
          {engine.roomCode}
        </span>
        <p className="text-sm text-slate-400 animate-pulse">En attente des autres joueurs...</p>
        {engine.isHost && (
          <Button className="mt-4 px-8 py-3" onClick={engine.startOnlineGame}>
            ▶ Lancer la partie
          </Button>
        )}
      </div>
    );
  }

  // 4. REVEAL
  if (engine.phase === 'reveal') {
    const seenCount = engine.players.filter((p) => p.seen).length;
    const allSeen = engine.players.length > 0 && seenCount === engine.players.length;

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[75vh] gap-6 text-center py-6">
        {engine.gameMode === 'online' ? (
          <Card glow className="max-w-sm w-full flex flex-col items-center gap-4">
            <span className="text-xs text-amber font-bold uppercase tracking-wider">TA CARTE SECRÈTE</span>
            <div className="text-xl font-bold text-white">
              {engine.myRole === 'civil' ? 'CIVIL 😇' : 'UNDERCOVER 🕵️'}
            </div>
            {engine.myRole === 'civil' ? (
              <div className="bg-[#1c1e26] p-3 rounded-xl w-full border border-white/10">
                <span className="text-xs text-slate-400 block">Mot à dessiner :</span>
                <span className="text-lg font-black text-amber">{engine.mySecretWord}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-300 italic">
                Tu n'as pas de mot. Observe les traits des autres pour deviner !
              </p>
            )}
            {engine.isHost && (
              <Button className="w-full mt-2" onClick={engine.startDrawingPhase}>
                Lancer le dessin →
              </Button>
            )}
          </Card>
        ) : (
          <>
            <span className="text-amber font-bold text-xs tracking-widest uppercase">DISTRIBUTION LOCAL</span>
            <div className="flex flex-wrap justify-center gap-4 max-w-3xl my-4">
              {engine.players.map((p) => {
                const isBeingViewed = engine.activePlayerId === p.id;
                const isCivil = p.role === 'civil';

                if (p.seen) {
                  return (
                    <div
                      key={p.id}
                      className="w-36 h-48 bg-[#12141f] border border-[#1d2133] rounded-2xl flex flex-col items-center justify-center text-slate-600 opacity-60"
                    >
                      <span className="text-3xl font-bold">✓</span>
                    </div>
                  );
                }

                if (isBeingViewed) {
                  return (
                    <div
                      key={p.id}
                      className="w-36 h-48 bg-[#171a29] border-2 border-amber rounded-2xl flex flex-col justify-between p-2.5"
                    >
                      <div className="text-amber font-bold text-xs truncate">{p.name}</div>
                      <div className="flex flex-col items-center gap-1 my-auto">
                        <span className="text-[10px] text-indigo-300 font-bold uppercase">
                          {isCivil ? 'CIVIL' : 'UNDERCOVER'}
                        </span>
                        {isCivil && engine.word ? (
                          <span className="text-white font-black text-sm">{engine.word.name}</span>
                        ) : (
                          <span className="text-slate-300 text-xs italic">Tu n'as pas de mot</span>
                        )}
                      </div>
                      <Button size="sm" onClick={() => engine.toggleCard(p)}>
                        J'ai vu ✓
                      </Button>
                    </div>
                  );
                }

                return (
                  <div
                    key={p.id}
                    onClick={() => engine.toggleCard(p)}
                    className="w-36 h-48 rounded-2xl border flex flex-col items-center justify-center p-3 gap-2 cursor-pointer bg-[#171a2b] border-[#252a42]"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#252a42] flex items-center justify-center text-amber font-bold">
                      ?
                    </div>
                    <span className="text-amber text-xs">Tap pour voir</span>
                  </div>
                );
              })}
            </div>

            {allSeen && engine.firstPlayer && (
              <Button className="px-8 py-3" onClick={engine.startDrawingPhase}>
                Commencer le dessin →
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  // 5. DRAW
  if (engine.phase === 'draw') {
    const drawer = engine.drawQueue[engine.drawIdx];
    const isMyTurnToDraw = engine.gameMode === 'online' ? drawer?.userId === engine.myUserId : true;

    return (
      <div className="p-2 sm:p-4 max-w-4xl mx-auto w-full">
        <div className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <span className="text-xs text-amber font-bold uppercase block">
              Manche {engine.roundNumber} — Tour {engine.turnInRound}/2 — Dessin {engine.drawIdx + 1} /{' '}
              {engine.drawQueue.length}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Au tour de <span className="text-amber">{drawer?.name}</span>
            </h1>
            {engine.gameMode === 'online' && (
              <p className="text-xs text-slate-400 mt-1">
                {isMyTurnToDraw
                  ? "🟢 C'est ton tour ! Fais un seul trait continu."
                  : "🔴 Attends que l'adversaire dessine..."}
              </p>
            )}
          </div>

          {engine.strokeHistory.length > 0 && engine.gameMode === 'local' && (
            <Button size="sm" variant="ghost" onClick={engine.undoLastStroke}>
              ↩ Annuler le trait
            </Button>
          )}
        </div>

        <div className="flex justify-center">
          <CanvasBoard
            canvasRef={engine.canvasRef}
            drawerReady={engine.drawerReady}
            onPointerDown={engine.handlePointerDown}
            onPointerMove={engine.handlePointerMove}
            onPointerUp={engine.endStroke}
            onPointerLeave={engine.endStroke}
          />
        </div>

        {engine.gameMode === 'local' && !engine.drawerReady && (
          <div className="flex justify-center mt-4">
            <Button onClick={() => engine.setDrawerReady(true)}>
              ✏️ Je suis prêt(e), commencer mon trait
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 6. ELIM
  if (engine.phase === 'elim') {
    return (
      <div className="p-4 max-w-4xl mx-auto w-full">
        <div className="mb-6 text-center">
          <span className="text-xs text-amber font-bold uppercase block">Discussion après 2 tours de dessin</span>
          <h1 className="text-3xl font-black text-white">Sélectionnez le joueur à éliminer</h1>
          <p className="text-xs text-slate-400 mt-1">Attention, vous n'avez droit qu'à un seul vote pour cette manche !</p>
        </div>

        <div className="flex justify-center mb-6">
          <CanvasBoard
            canvasRef={engine.canvasRef}
            drawerReady={false}
            onPointerDown={() => {}}
            onPointerMove={() => {}}
            onPointerUp={() => {}}
            onPointerLeave={() => {}}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {engine.players.map((p) => (
            <div
              key={p.id}
              onClick={() =>
                p.alive && (engine.gameMode === 'local' || engine.isHost) && engine.setEliminationTarget(p)
              }
              className={`border rounded-xl p-3 text-center transition-all ${
                p.alive
                  ? 'bg-[#1c1e26] border-white/10 cursor-pointer hover:border-red-500 hover:scale-105'
                  : 'bg-[#121420] border-white/5 opacity-40'
              }`}
            >
              <div className="font-bold text-sm text-white">{p.name}</div>
              {!p.alive && (
                <div className="text-[10px] text-slate-500 mt-1">{p.role === 'civil' ? 'Civil' : 'Undercover'}</div>
              )}
            </div>
          ))}
        </div>

        {engine.eliminationTarget && (
          <Modal isOpen={!!engine.eliminationTarget} onClose={() => engine.setEliminationTarget(null)}>
            <p className="mb-4 text-center text-sm text-white">
              Éliminer <b className="text-amber">{engine.eliminationTarget.name}</b> et exécuter le vote ?
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="danger" size="sm" onClick={engine.confirmElimination}>
                Confirmer le vote
              </Button>
              <Button variant="ghost" size="sm" onClick={() => engine.setEliminationTarget(null)}>
                Annuler
              </Button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // 7. ULTIME TENTATIVE DE L'UNDERCOVER
  if (engine.phase === 'undercover_guess') {
    const isEliminatedPlayer =
      engine.gameMode === 'online' ? engine.eliminatedUndercover?.userId === engine.myUserId : true;

    return (
      <div className="p-4 max-w-md mx-auto text-center flex flex-col items-center gap-5 my-auto">
        <Card glow className="w-full flex flex-col items-center gap-4">
          <span className="text-xs text-amber font-bold uppercase tracking-wider">🕵️ ULTIME CHANCE !</span>
          <h2 className="text-xl font-bold text-white">
            <span className="text-amber">{engine.eliminatedUndercover?.name}</span> a été démasqué !
          </h2>
          <p className="text-xs text-slate-300">
            S'il/elle parvient à deviner le mot exact des civils, l'Undercover remporte la partie malgré tout !
          </p>

          {isEliminatedPlayer ? (
            <div className="w-full flex flex-col gap-3 mt-2">
              <Input
                className="text-center font-bold"
                placeholder="Tape le mot mystère..."
                value={engine.undercoverGuessInput}
                onChange={(e) => engine.setUndercoverGuessInput(e.target.value)}
              />
              <Button className="w-full py-3" onClick={engine.handleUndercoverGuessSubmit}>
                🎯 Valider ma tentative
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-[#1c1e26] rounded-xl border border-white/10 w-full animate-pulse text-xs text-slate-400">
              En attente de l'ultime proposition de l'Undercover...
            </div>
          )}
        </Card>
      </div>
    );
  }

  // 8. FIN DE PARTIE
  return (
    <div className="flex flex-col items-center gap-6 mt-10 text-center p-4 max-w-md mx-auto">
      <Card glow className="w-full flex flex-col items-center gap-4">
        <span className="text-xs text-amber font-bold uppercase">Partie terminée</span>
        <h1 className="text-2xl font-black text-amber">
          {engine.winner === 'civils' ? 'Les civils gagnent 🎉' : "L'undercover gagne 🕵️"}
        </h1>
        <p className="text-xs text-slate-300">
          Le mot était <b className="text-amber">{engine.word?.name}</b>.
        </p>
        <div className="flex justify-center w-full my-2">
          <CanvasBoard
            canvasRef={engine.canvasRef}
            drawerReady={false}
            onPointerDown={() => {}}
            onPointerMove={() => {}}
            onPointerUp={() => {}}
            onPointerLeave={() => {}}
          />
        </div>
        <Button className="w-full mt-2" onClick={onLeaveGame || engine.resetAll}>
          ↺ Retour au menu
        </Button>
      </Card>
    </div>
  );
}
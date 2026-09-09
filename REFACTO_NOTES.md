# Notes de refacto — La Caverne des Goats

Vérifié avec `npm install && npx next build` : le build passe désormais
sans erreur (0 erreur TypeScript, 16 routes générées). Avant ce nettoyage,
le build de prod échouait dès la première étape (route dupliquée).

## Corrections critiques

1. **Route dupliquée `/lists`**
   `src/app/lists/page.tsx` (fichier vide) entrait en conflit avec
   `src/app/(games)/lists/page.tsx`. Next.js refusait de build.
   → Fichier vide supprimé.

2. **Deux clients Supabase indépendants**
   `src/lib/supabase.ts` et `src/lib/supabase/client.ts` créaient chacun
   leur propre instance `createClient()`. Selon le fichier importé, l'app
   utilisait une session/auth différente — cause probable du bug RLS
   ("new row violates row-level security policy") et d'incohérences sur
   le chat temps réel.
   → Un seul client conservé (`src/lib/supabase.ts`), tous les imports
   pointent dessus, `src/lib/supabase/client.ts` supprimé.

3. **`type.ts` vs imports `'../types'`**
   Dans `features/soit-connecte/` et `features/undercover-artist/`, le
   fichier de types s'appelait `type.ts` (singulier) alors que tout le
   code l'importait en `'../types'` (pluriel) → module introuvable,
   build cassé.
   → Fichiers renommés en `types.ts`.

4. **Types manquants / props fantômes**
   - `DrawPoint` (undercover-artist) : type utilisé dans `useCanvas.ts`
     mais jamais déclaré → ajouté dans `types.ts`.
   - `UndercoverArtistContainer` était appelé depuis `app/page.tsx` avec
     des props (`mode`, `sessionCode`, `profile`, `isHost`) qu'il n'a
     jamais acceptées ni utilisées → props fantômes retirées de l'appel.
   - Cast de ref sur `<canvas>` pour matcher le typage React 18.3.31
     (`RefObject<T | null>` vs `LegacyRef<T>`).

## Code mort supprimé

- `src/components/SoitConnecteGame.tsx` (514 lignes) — jamais importé,
  remplacé depuis longtemps par `src/features/soit-connecte/`.
- `src/features/undercover-artist/components/CardReveal.tsx` et
  `VotingPhase.tsx` — référençaient un type `UndercoverPlayer`
  inexistant et n'étaient importés nulle part. Toute la logique de
  reveal/vote vit en fait directement dans `UndercoverArtistContainer.tsx`.
- 9 fichiers stubs à 0 octet, jamais implémentés ni utilisés :
  `src/hooks/useAuth.ts`, `useRealtimeChannel.ts`, `useSound.ts`,
  `src/lib/constants.ts`, `src/components/layout/Header.tsx`,
  `src/components/lobby/GamePicker.tsx`, `PlayerList.tsx`, `RoomCode.tsx`,
  `src/components/ui/Avatar.tsx`,
  `src/features/undercover-artist/components/DrawingPhase.tsx`,
  `UndercoverGuessModal.tsx`.
- Doublon de types `ListItem`/`GameList` : deux définitions différentes
  coexistaient (`src/types/index.ts` en version simplifiée, jamais
  utilisée ; `src/lib/types.ts` en version complète, utilisée partout).
  → Doublon retiré de `src/types/index.ts`, un seul import canonique
  (`@/lib/types`) désormais utilisé partout, y compris dans
  `features/undercover-artist`.

## Point d'attention non touché

Le mode **"En ligne"** de Undercover Artist, lancé depuis le lobby,
reçoit `sessionCode` / `profile` / `isHost` mais le container les
ignore et repart sur son propre écran menu local (choix
local/en ligne interne, saisie manuelle des joueurs). Le multi-joueur
temps réel de ce jeu ne semble pas branché sur la session créée dans le
lobby. Je n'ai pas touché à cette logique métier — comportement à
clarifier/refaire selon l'intention d'origine.

## Ce qui n'a pas changé

- Aucune logique de jeu modifiée (scoring, règles, phases).
- Aucun changement de schéma Supabase.
- Le style/l'UI est identique partout.

## Session 2 — Homogénéisation des écrans de config + couleurs joueurs

### Nouveaux fichiers partagés
- `src/lib/playerColors.ts` — palette fixe (Rouge, Bleu, Vert, Jaune, Violet,
  Orange, Rose, Cyan). `getPlayerColor(index)` renvoie toujours la même
  couleur pour le même index, dans tous les jeux.
- `src/components/game/GameConfigShell.tsx` — mise en page commune des
  écrans de configuration (titre, sous-titre, bouton retour, carte).
- `src/components/game/PlayerNameField.tsx` — champ de nom de joueur avec
  pastille de couleur assortie (`PlayerNameField`) + pastille seule
  (`PlayerColorDot`) pour l'affichage en jeu si besoin.

### Jeux migrés vers le style commun
Versus, Undercover, Qui est-ce ? (écran de config uniquement — le menu
Local/En ligne reste tel quel), Blind Test, Line Capture, Undercover Artist.
Chacun garde ses options propres (nombre de joueurs, mode de sélection,
budget, etc.) — seule la mise en page et la couleur des joueurs sont
uniformisées.

`Tier` n'a pas d'écran de configuration séparé (le tableau de tier list
EST l'écran, sans bouton "Démarrer") — non concerné par ce chantier.
`Le Five`, `Absolute Cinema`, `Draft Anime` exclus comme demandé.

### Espacement avec la sidebar
Padding ajouté globalement dans `src/app/layout.tsx`
(`px-5 py-6 md:px-10 md:py-8`) — profite à toutes les pages sans avoir à
toucher chacune individuellement.

### Lenteur au changement d'onglet
Pas de fuite trouvée côté souscriptions temps réel (les canaux Supabase
sont bien nettoyés au démontage). Cause la plus probable : en mode `next
dev`, Next.js décharge de la mémoire les pages compilées après ~15-25s
d'inactivité — revenir sur un onglet resté inactif déclenche une
recompilation complète, perçue comme un ralentissement. Ce comportement
n'existe pas en production (`next build && next start`).
→ `onDemandEntries` ajouté dans `next.config.js` pour garder les pages
compilées 1h au lieu de ~25s en dev. Si la lenteur persiste aussi en
production buildée, il faudra regarder ailleurs (à tester après ce
correctif).

## Session 3 — Largeur des écrans de config

`GameConfigShell` était bridé à `max-w-2xl`, ce qui écrasait les champs en
colonne et forçait à scroller. Retiré le plafond de largeur pour matcher
Blind Ranking (qui n'en a pas) — les champs profitent maintenant de toute
la largeur disponible et se répartissent en ligne grâce aux `flex-wrap`
déjà en place dans chaque jeu.

## Session 4 — Champs joueur : contour coloré au lieu de la pastille

`PlayerNameField` n'affiche plus de pastille ronde à côté du champ — c'est
le contour de l'input lui-même qui prend la couleur du joueur (bordure +
léger halo assorti).

## Session 5 — Mode en ligne : socle complet + Soit Connecté branché

### ⚠️ Migration SQL à exécuter d'abord
`supabase/migration_online_mode.sql` — à coller dans Supabase SQL Editor
avant de tester. Ajoute `profiles.pin`, `profiles.games_played`,
`session_players.joined_current_game`, et les tables `game_sessions` /
`session_players` / `soit_connecte_words` si elles n'existaient pas
encore (tout est idempotent, sûr à relancer).

### Ce qui a été construit
- **Auth à l'ouverture** (`src/components/auth/AuthGate.tsx` +
  `src/lib/authContext.tsx`) : Se connecter / Créer un compte (pseudo +
  code à 4-6 chiffres, pas de vrai mot de passe chiffré — cohérent avec
  le reste du projet, app entre amis) / Continuer en invité (local
  uniquement, pas de ligne Supabase créée). Gate toute l'application via
  `layout.tsx`.
- **Toggle Mode en ligne / Mode local dans la Sidebar**
  (`src/lib/onlineModeContext.tsx`) : en mode en ligne, la liste ne montre
  plus que les 3 jeux qui ont un vrai mode en ligne (Soit connecté, Qui
  est-ce ?, Undercover Artist) + Accueil. Bloqué pour les invités (message
  + invite à créer un compte).
- **Salon (`OnlineLobby.tsx`, réécrit)** : plus d'étape de validation
  (rejoindre un salon = rejoint direct). L'hôte choisit un jeu → il est
  envoyé directement à l'écran de configuration de ce jeu. Les autres
  joueurs reçoivent une modale "Rejoindre / Passer ce tour" avec un
  compteur "X/Y ont rejoint" en direct. Bouton "Terminer le salon" côté
  hôte → écran de classement final.
- **Scoring** (`queries.ts`, déjà en place, vérifié et rebranché) :
  `submitGameResults(sessionId, rankedUserIds)` distribue les points
  (1er = nb de joueurs classés, 2e = nb-1, ...) — un joueur absent du
  classement (n'a pas terminé / a quitté) ne reçoit aucun point mais
  garde son score cumulé. Renvoie tout le monde au salon avec le tableau
  à jour. `endGameSession` calcule le(s) vainqueur(s) au score cumulé le
  plus haut et incrémente `profiles.games_played` (tous les
  participants) et `profiles.online_wins` (le·s vainqueur·s) — c'est le
  palmarès.

### Entièrement branché : Soit Connecté
Déjà conçu pour recevoir `sessionCode`/`profile`/`isHost` — juste
reconnecté aux nouvelles fonctions `submitGameResults` /
`returnSessionToLobby` (les anciennes `updatePlayerScoresInSession` /
`updateSessionGameStatus` qu'il utilisait avaient disparu de
`queries.ts`, cassant le build — corrigé).

### ⚠️ Pas branchés : Qui est-ce ? et Undercover Artist
Ces deux jeux ont chacun leur **propre système de salon indépendant**
(leur propre code de partie, leur propre canal realtime), complètement
déconnecté de `game_sessions`/`session_players`. Actuellement, si l'hôte
les choisit depuis le salon, l'écran de configuration s'affiche mais le
jeu ne rapporte aucun score au salon à la fin, et Undercover Artist
republie même son propre mini-menu Local/En ligne interne (bug déjà
signalé en session 1). Rebrancher ces deux jeux proprement demande de
rentrer dans ~1500 lignes de logique de jeu existante (qui fonctionne
en elle-même) — prévu en suivi dédié plutôt que risqué ici à l'aveugle.

### Simplification assumée
Le compteur "X/Y ont rejoint" est visible dans l'écran du salon (pour
les joueurs qui décident de rejoindre ou non), mais pas encore affiché
en direct DANS l'écran de configuration de l'hôte (qui a déjà quitté le
salon à ce moment). À ajouter si besoin.

## Session 6 — Warning "MODULE_TYPELESS_PACKAGE_JSON"

`next.config.js` utilisait la syntaxe ESM (`import`/`export default`)
mais l'extension `.js` fait que Node le traite par défaut comme
CommonJS, d'où le warning "Reparsing as ES module" à chaque démarrage
de `npm run dev` (inoffensif mais bruyant, et légèrement plus lent au
démarrage). Renommé en `next.config.mjs` — Next.js le reconnaît
nativement sans reparsing. `postcss.config.js` reste en `.js` classique
(lui est en CommonJS `module.exports`), donc pas touché.

## Session 7 — Refonte visuelle (Starfield, glassmorphism, boutons "push")

### Fondations (fichiers partagés — impact global immédiat)
- Polices Google Fonts Fredoka (titres/boutons, via `font-serif`) et
  Nunito (corps, via `font-sans`) — branchées dans `tailwind.config.ts`,
  importées dans `globals.css`. Comme `font-serif` était déjà utilisé
  pour les titres dans la plupart des jeux, ce changement se propage
  sans toucher aux fichiers individuels.
- `src/components/Starfield.tsx` — canvas fixe (z-0) : dégradé bleu nuit,
  2 lueurs de nébuleuse radiales, étoiles fixes qui scintillent
  (`Math.sin`), pas d'étoiles filantes. Monté une seule fois dans
  `layout.tsx`.
- `globals.css` retravaillé : `.btn`/`.btn-secondary`/`.btn-danger` ont
  maintenant l'effet "push" (`box-shadow: 0 4px 0 ...` qui s'aplatit au
  clic), `.panel` est en verre dépoli (`rgba(255,255,255,0.05)` +
  ombre portée plate), nouvelle classe utilitaire `.glass-surface`.
  Ces classes étant utilisées partout, l'effet est automatique sur
  tous les jeux qui les utilisent déjà.
- `src/components/ui/PushButton.tsx` — composant générique demandé dans
  le brief, réutilisable partout où un bouton coloré à la volée est
  nécessaire (ex: compteurs +/-).
- `src/components/layout/Topbar.tsx` — barre h-14 glassmorphism,
  bouton "← Retour" à effet push, breadcrumb à droite. Branché dans
  `GameConfigShell` (donc automatique sur Versus, Qui est-ce ?, Blind
  Test, Line Capture, Undercover Artist) et directement dans Undercover.
- Sidebar réécrite : logo 🐐 + "Goats" en Fredoka ambre, bouton
  "Mode En Ligne"/"Mode Local" avec point vert `animate-pulse`, deux
  sections séparées par une ligne + label "JEUX".
- Palette joueurs (`src/lib/playerColors.ts`) alignée sur le brief :
  rouge, bleu (#3b82f6), vert, ambre, violet, rose, orange, teal
  (#1eb996) — `PlayerNameField` a maintenant un badge numéroté coloré +
  fond teinté en plus du contour.

### Page Undercover — implémentation de référence du brief
Écran de config entièrement reconstruit à la structure exacte demandée :
titre + description sur la même ligne, ligne de 4 cartes en verre
(`grid-cols-4` : Base de mots / Joueurs (compteur bleu) / Undercovers
(compteur rouge) / Mister White + nombre de civils en grand ambre),
grille de joueurs avec badges colorés, CTA pleine largeur avec l'effet
push. `overflow-hidden` : tient sur l'écran sans scroll.

### Pages non couvertes (styles bespoke indépendants)
`Tier` et `Draft Anime` ont chacune leur propre thème câblé en dur
(couleurs hex spécifiques, mise en page propre à chaque jeu — Draft
Anime a par exemple son propre thème Naruto/One Piece) et n'utilisent
aucune des classes partagées (`.btn`, `.panel`, `font-serif`) : elles
n'ont donc pas hérité automatiquement du nouveau look. Comme elles
n'étaient pas explicitement exclues, à traiter en suivi si tu veux
qu'elles matchent aussi le nouveau système — c'est un travail page par
page vu leur style déjà très personnalisé.

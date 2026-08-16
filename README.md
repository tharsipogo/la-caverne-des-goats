# La Caverne des Goats

App perso pour classer des trucs entre amis : **Blind Ranking**, **Tier List** et **Undercover**, avec vos propres bases (persos, jeux, films...).

Stack : **Next.js (React + TypeScript)** pour le site, **Supabase** (Postgres gratuit + stockage d'images) comme base de données.

---

## 1. Créer le projet Supabase (gratuit)

1. Va sur [supabase.com](https://supabase.com) → crée un compte → **New project** (gratuit).
2. Une fois le projet créé, va dans **SQL Editor** → colle le contenu de `supabase/schema.sql` → **Run**.
   Ça crée les tables `lists`, `items`, `tier_assignments`.
3. Va dans **Storage** → **New bucket** → nomme-le exactement `item-images` → coche **Public bucket** → Créer.
   (C'est là que les images uploadées seront stockées.)
4. Va dans **Project Settings → API** → note :
   - `Project URL`
   - `anon public` key

## 2. Configurer le projet local

```bash
npm install
cp .env.local.example .env.local
```

Ouvre `.env.local` et colle tes valeurs Supabase :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 3. Lancer en local

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) — l'appli tourne en local sur ton PC, mais toutes les données (listes, items, tier lists) sont stockées sur Supabase dans le cloud, donc rien n'est perdu si tu fermes le PC.

## 4. Modifier la base de données directement (sans passer par l'appli)

Dans le dashboard Supabase → **Table Editor** → tu retrouves `lists` et `items` sous forme de tableur : tu peux ajouter, modifier ou supprimer des lignes directement à la main, exactement comme dans Excel. Les changements apparaissent immédiatement dans l'appli au prochain chargement de page.

## 4bis. Déjà une base Supabase existante ? Ajoute le support audio (Blind Test)

Si tu avais déjà exécuté `supabase/schema.sql` avant l'ajout du mode Blind Test, exécute en plus, une seule fois, `supabase/migration_audio.sql` dans le SQL Editor. Puis crée un nouveau bucket **`item-audio`** (Storage > New bucket > Public bucket coché), comme tu l'as fait pour `item-images`.

## 4ter. Déjà une base Supabase existante ? Ajoute le réordonnancement de la Tier List

Exécute aussi, une seule fois, `supabase/migration_tier_position.sql` dans le SQL Editor — il ajoute la colonne nécessaire pour mémoriser l'ordre des items dans chaque ligne de la Tier List.

## 5. Accès mobile — déployer en ligne gratuitement (Vercel)

L'appli est déjà adaptée aux petits écrans (barre de navigation en bas sur mobile). Pour y accéder depuis ton téléphone n'importe où (même PC éteint), déploie-la sur Vercel — gratuit, et connecté à la **même base Supabase** :

1. Va sur [vercel.com](https://vercel.com) → connecte-toi (tu peux utiliser GitHub).
2. Mets ce dossier de projet sur GitHub (crée un repo, `git init` / `git add .` / `git commit` / `git push` — ou utilise GitHub Desktop si tu préfères une interface).
3. Sur Vercel → **Add New → Project** → importe ce repo GitHub.
4. Dans les réglages du projet Vercel, section **Environment Variables**, ajoute les deux mêmes variables que dans ton `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Clique **Deploy**. Au bout d'une minute, Vercel te donne une URL du type `https://la-caverne-des-goats.vercel.app`.
6. Ouvre cette URL sur ton téléphone (tu peux l'ajouter à l'écran d'accueil pour un accès en un tap, comme une appli).

Comme la base de données est sur Supabase et pas sur ton PC, la version Vercel (mobile) et la version locale (PC) pointent vers **les mêmes listes, items et parties** — tout ce que tu ajoutes d'un côté est visible de l'autre.

Après ce premier déploiement, chaque `git push` sur ce repo republie automatiquement la nouvelle version.

## Structure du projet

```
src/
  app/
    layout.tsx          → mise en page + sidebar
    lists/page.tsx       → gestion des bases (créer, ajouter des items, upload multi-fichiers)
    blind/page.tsx        → Blind Ranking (choix direct du rang 1..N)
    tier/page.tsx          → Tier List (drag & drop, tiers renommables)
    undercover/page.tsx    → Undercover (distribution, tours, élimination)
  lib/
    supabase.ts          → client Supabase
    types.ts              → types partagés
    utils.ts               → shuffle, upload d'image, etc.
supabase/
  schema.sql             → schéma SQL à exécuter une fois dans Supabase
```

## Modes de jeu, en bref

- **Mes bases** : crée une base texte ou image ; pour une base image, tu peux sélectionner **plusieurs fichiers en une fois** (le nom de fichier devient le nom de l'item, modifiable ensuite dans Supabase). Pour une base texte, tu peux aussi coller une liste de noms (un par ligne) pour tout ajouter d'un coup.
- **Blind Ranking** : choisis une base, un nombre (5 / 10 / 20), puis pour chaque item révélé tu cliques directement sur sa position finale (1 à N). Si la base choisie est de type "Audio", un extrait de 20 secondes se lance automatiquement à chaque item révélé (avec un bouton "Réécouter"), pour classer en te fiant au son plutôt qu'au seul titre.
- **Tier List** : glisse-dépose les items dans les rangées, ou dépose-les directement sur un autre item pour choisir leur place exacte dans la ligne. Clique sur le nom d'une ligne pour le renommer (texte libre, plus de limite à 4 caractères). Une pastille à côté de chaque ligne permet de changer sa couleur, et un bouton "✕" la supprime (les items repassent en "Non classés"). Un bouton "+ Ajouter une ligne" permet d'en créer autant que voulu. Tout est sauvegardé automatiquement par base.
- **Undercover** : choisis une base de mots/images, le nombre de joueurs, leurs noms, le nombre d'undercover, et active Mister White à partir de 5 joueurs. Le joueur qui commence la distribution des cartes est tiré au hasard à chaque partie (jamais Mister White). Chaque joueur voit sa carte seul (mode "passe l'appareil"). Ensuite, à chaque tour, on élimine un joueur en cliquant dessus : son rôle est révélé, jamais son mot. Si Mister White est éliminé, il peut tenter de deviner le mot des civils pour gagner.
- **Undercover Artist** : variante dessinée de l'Undercover. Les civils reçoivent tous le même mot, l'undercover n'a rien. Le joueur qui commence à dessiner est tiré au hasard, et cet ordre de départ est retiré au sort à chaque nouvelle manche. À tour de rôle (mode "passe l'appareil"), chaque joueur ajoute **un seul trait continu** sur un dessin commun — dès qu'il relâche, c'est au joueur suivant. Une fois que tout le monde a dessiné pour la manche, on élimine un joueur (rôle révélé, mot jamais révélé), et le dessin continue à la manche suivante avec les joueurs restants, jusqu'à la victoire des civils ou de l'undercover.
- **Blind Test** : crée une base de type "Audio" dans "Mes bases" et uploade tes propres extraits (l'appli ne fournit aucune musique). Choisis une base, une durée par extrait (10/15/20/30s), le nombre de joueurs (1 ou plus, avec leurs noms) et un **score gagnant réglable de 1 à 20** via une barre. L'extrait est joué et se coupe automatiquement à la fin du temps, puis le titre s'affiche tout seul. Tu cliques ensuite sur le joueur qui a trouvé pour lui donner un point (ou "Personne n'a trouvé"). Premier joueur à atteindre le score gagnant remporte la partie ; si les extraits s'épuisent avant, le classement final s'affiche quand même.
- **Versus** : choisis une base d'au moins 10 items, un budget de départ identique pour les deux joueurs, et leurs noms. Optionnellement, choisis une **base de coachs** (n'importe quelle base texte ou image que tu fournis) : pour chaque joueur, tire un coach au hasard dans cette base, ou choisis-en un précisément dans une liste déroulante — affiché ensuite pendant la partie et dans le récap final. Optionnellement aussi, une **base de terrains** : un terrain est tiré au hasard une seule fois au début de la partie et reste affiché tout du long. À chaque manche, une carte est tirée au hasard ; le joueur désigné pour commencer (l'ordre alterne à chaque manche) est obligé d'ouvrir les enchères, puis l'autre joueur peut surenchérir ou laisser la carte. La manche se termine dès qu'un joueur laisse — l'autre remporte la carte au prix de sa dernière mise. Si un joueur a 0 restant quand c'est à lui de commencer, sa mise obligatoire est automatiquement 0. La partie continue jusqu'à ce que chacun ait une équipe de 5 cartes, puis un récap stylé affiche les deux équipes (et leurs coachs) côte à côte avec un "VS" au centre et le terrain en bannière.

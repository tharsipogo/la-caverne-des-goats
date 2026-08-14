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

## Points notables par mode

- **Mes bases** : crée une base texte ou image ; pour une base image, tu peux sélectionner **plusieurs fichiers en une fois** (le nom de fichier devient le nom de l'item, modifiable ensuite dans Supabase). Pour une base texte, tu peux aussi coller une liste de noms (un par ligne) pour tout ajouter d'un coup.
- **Blind Ranking** : choisis une base, un nombre (5 / 10 / 20), puis pour chaque item révélé tu cliques directement sur sa position finale (1 à N).
- **Tier List** : glisse-dépose les items dans les rangées ; clique sur la lettre d'un tier pour la renommer (ex. remplacer "S/A/B/C/D/E" par tes propres noms). Sauvegardé par base.
- **Undercover** : choisis une base de mots/images, le nombre de joueurs, leurs noms, le nombre d'undercover, et active Mister White à partir de 5 joueurs. Chaque joueur voit sa carte seul (mode "passe l'appareil"). Ensuite, à chaque tour, on élimine un joueur en cliquant dessus : son rôle est révélé, jamais son mot. Si Mister White est éliminé, il peut tenter de deviner le mot des civils pour gagner.

## Déploiement (optionnel, plus tard)

Le projet reste 100% gratuit en local. Si un jour tu veux y accéder depuis ton téléphone sans allumer ton PC, tu pourras déployer gratuitement sur [Vercel](https://vercel.com) en connectant juste ce dossier (mêmes variables d'environnement à renseigner dans les settings Vercel).

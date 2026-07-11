# SpeakUp CI

Plateforme d'apprentissage de l'anglais oral pour jeunes ivoiriens, basée sur leurs centres d'intérêt.

## Démarrage rapide

### 1. Clé API Claude (obligatoire)

```bash
cd server
cp .env.example .env
# Ouvrir .env et coller ta clé ANTHROPIC_API_KEY
```

### 2. Lancer le backend

```bash
cd server
npm install
npm run dev
# → tourne sur http://localhost:3001
```

### 3. Lancer le frontend

```bash
cd client
npm install
npm run dev
# → ouvre http://localhost:5173
```

---

## Ajouter un nouveau sujet

Ouvrir `client/src/data/topics.json` et ajouter un objet dans le tableau :

```json
{
  "id": "music",
  "label": "Music",
  "emoji": "🎵",
  "color": "#ec4899",
  "forUsers": ["abdoul-karim", "aboubakar"],
  "modules": [
    {
      "id": "music-1",
      "title": "Your favorite genre",
      "intro": "Music is universal. Let's talk about the genres and artists you love.",
      "vocab": ["rhythm", "lyrics", "genre", "album", "concert", "track", "playlist"],
      "coachSeed": "Start a friendly conversation about music. Ask what genres the user likes and why, and what songs they listen to when they want to feel energized."
    }
  ]
}
```

**Règles :**
- `id` : unique, kebab-case
- `forUsers` : liste des IDs utilisateurs qui verront ce sujet (`aboubakar`, `abdoul-karim`)
- `vocab` : 5 à 8 mots clés que le coach va intégrer naturellement
- `coachSeed` : instruction pour le coach — décrit le ton et les sujets à aborder

---

## Ajouter un nouvel utilisateur

Ouvrir `client/src/data/users.json` :

```json
{
  "id": "nouveau-prenom",
  "name": "Nouveau Prénom",
  "emoji": "🧑",
  "level": "beginner-intermediate",
  "interests": ["football", "music"]
}
```

Puis ouvrir `server/routes/chat.js` et ajouter le profil dans l'objet `USERS` :

```js
'nouveau-prenom': {
  name: 'Nouveau Prénom',
  level: 'beginner-intermediate',
  levelDesc: 'Use simple, clear sentences. Be very encouraging.',
  interests: ['football', 'music'],
},
```

---

## Architecture

```
speakup-ci/
├── client/                  # React + Vite (frontend)
│   ├── src/
│   │   ├── data/
│   │   │   ├── topics.json  ← MODIFIER ICI pour ajouter des sujets
│   │   │   └── users.json   ← MODIFIER ICI pour ajouter des utilisateurs
│   │   ├── lib/
│   │   │   ├── coach.js     # Appels API + synthèse vocale
│   │   │   └── storage.js   # localStorage (progression, sessions, historique)
│   │   └── pages/
│   │       ├── SelectProfile.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Topics.jsx
│   │       ├── ModuleDetail.jsx
│   │       └── Coach.jsx    # Le cœur : conversation audio avec le coach
├── server/                  # Express (backend — protège la clé API)
│   ├── index.js
│   ├── routes/chat.js       # Proxy vers l'API Claude
│   └── .env                 # ANTHROPIC_API_KEY (ne jamais committer)
└── README.md
```

## Sécurité

- La clé API Claude est **uniquement côté serveur** — jamais exposée au navigateur.
- Les données de chaque utilisateur sont **isolées dans localStorage** par profil.
- En production, ajouter une authentification et remplacer localStorage par une base de données avec Row Level Security (ex: Supabase).
- Configurer `robots.txt` pour désindexer le site en production.

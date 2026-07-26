# Shopify AI SaaS — Générateur de contenu de boutique

Étape 1 du projet : un backend qui, à partir d'une simple description de business,
génère via **Groq** (IA rapide) tout le contenu nécessaire à une boutique Shopify :
nom, slogan, palette de couleurs, textes des pages, fiches produits, SEO.

## 🚀 Lancer en local

1. Installer [Node.js](https://nodejs.org) (version 18 ou plus) si tu ne l'as pas.
2. Ouvrir un terminal dans ce dossier, puis :

```bash
npm install
cp .env.example .env
```

3. Va sur [console.groq.com](https://console.groq.com), crée un compte gratuit, génère une clé API.
4. Colle cette clé dans le fichier `.env` créé (remplace `ta_cle_groq_ici`).
5. Lance le serveur :

```bash
npm start
```

Le serveur tourne sur `http://localhost:3000`.

## 🧪 Tester

Avec un outil comme Postman, ou simplement dans un terminal :

```bash
curl -X POST http://localhost:3000/api/generate-store \
  -H "Content-Type: application/json" \
  -d '{"businessDescription": "Boutique de bijoux artisanaux faits main, style minimaliste", "nbProducts": 3}'
```

Tu reçois en réponse un JSON complet avec nom de boutique, textes, produits, couleurs, etc.

## ☁️ Déployer sur Render

1. Crée un dépôt Git (GitHub/GitLab) et pousse ce dossier dedans.
2. Va sur [render.com](https://render.com) → "New +" → "Web Service".
3. Connecte ton dépôt.
4. Configuration :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
5. Dans l'onglet "Environment", ajoute la variable `GROQ_API_KEY` avec ta clé.
6. Render te donne une URL publique (ex: `https://ton-projet.onrender.com`) — c'est ton API en ligne.

## 📌 Prochaine étape

Une fois ce générateur validé, l'étape suivante sera de connecter ce JSON à
l'**API Admin Shopify** pour créer réellement la boutique (thème, produits, pages)
à partir de ce contenu généré.

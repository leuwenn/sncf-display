# Tableau d'Affichage SNCF en Temps Réel

Une application web qui affiche en temps réel les tableaux des départs de trains des gares SNCF, avec des données authentiques issues directement de l'API SNCF.

![Capture d'écran du tableau d'affichage](https://via.placeholder.com/800x400?text=Tableau+d%27Affichage+SNCF)

## Fonctionnalités

- 🚅 Affichage des départs de trains en temps réel via l'API SNCF officielle
- 🕒 Horloge en temps réel synchronisée
- 🔄 Mise à jour automatique des données toutes les 60 secondes
- 🚉 Mise en évidence spéciale pour les TGV et affichage visuel des voies
- 🔊 Annonces sonores lors des changements de statut des trains
- 🔍 Recherche et changement de gare
- 📱 Interface responsive qui s'adapte à toutes les tailles d'écran

## Démarrage

### Prérequis

- Node.js 18+
- Une clé API SNCF (obtenue sur [SNCF Open Data](https://numerique.sncf.com/startup/api/))

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/votre-username/sncf-display.git
cd sncf-display

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditez le fichier .env pour ajouter votre clé API SNCF

# Lancer le serveur de développement
npm run dev
```

L'application sera disponible à l'adresse [http://localhost:5173](http://localhost:5173).

## Utilisation

### Données en temps réel uniquement

Cette application utilise exclusivement des données en temps réel issues de l'API SNCF. **Une clé API valide est requise** pour le fonctionnement du tableau d'affichage. Sans clé API configurée, l'application affichera un message d'erreur avec un lien pour obtenir une clé.

### Utilisation de l'API SNCF

La clé API SNCF est configurée exclusivement via le fichier `.env`. Vous ne pouvez pas la modifier via l'interface.

#### Configuration de la clé API

##### Utilisation du script de configuration

La façon la plus simple est d'utiliser le script de configuration fourni :

```bash
npm run config-api votre_clé_api_ici
```

Ce script va automatiquement créer ou mettre à jour le fichier `.env` avec votre clé API.

##### Configuration manuelle

Vous pouvez également configurer manuellement le fichier :

1. Exécutez `npm run setup-env` pour créer le fichier `.env` s'il n'existe pas déjà
2. Ajoutez votre clé API SNCF dans le fichier `.env` :
   ```
   VITE_SNCF_API_KEY=votre_clé_api_ici
   ```
3. Par défaut, la gare de Lille Flandres est configurée. Pour changer de gare par défaut, modifiez les variables suivantes dans le fichier `.env` :
   ```
   VITE_DEFAULT_STATION_ID=identifiant_de_la_gare
   VITE_DEFAULT_STATION_NAME=nom_de_la_gare
   ```
4. Redémarrez l'application pour prendre en compte les changements

#### Changement de gare via l'interface

Vous pouvez changer de gare sans modifier le fichier `.env` :

1. Cliquez sur l'icône 🚉 en haut à gauche de l'écran
2. Saisissez le nom de la gare dans le champ de recherche
3. Cliquez sur "Rechercher"
4. Sélectionnez la gare dans les résultats
5. Cliquez sur "Enregistrer la gare"

La préférence de gare sera sauvegardée dans le navigateur et utilisée lors de vos prochaines visites.

Les données sont automatiquement mises à jour toutes les 60 secondes, mais vous pouvez forcer une mise à jour en cliquant sur le bouton 🔄 en bas de l'écran.

### Annonces sonores

Vous pouvez activer/désactiver les annonces sonores en cliquant sur le bouton 🔊/🔇 en bas à droite de l'écran. Lorsqu'elles sont activées, des annonces seront jouées aléatoirement lors des changements de statut des trains.

## Développement

### Structure du projet

```
sncf-display/
├── src/
│   ├── lib/
│   │   ├── AnnouncementPlayer.svelte  # Composant pour les annonces sonores
│   │   ├── ApiConfig.svelte           # Composant de configuration API
│   │   ├── sncfApi.ts                 # Service d'interaction avec l'API SNCF
│   │   └── index.ts                   # Exports de la bibliothèque
│   ├── routes/
│   │   └── +page.svelte              # Page principale de l'application
│   ├── app.html                      # Template HTML de base
│   └── app.d.ts                      # Types de l'application
├── static/
│   └── favicon.png                   # Favicon
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

### Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Compile l'application pour la production
- `npm run preview` - Prévisualise la version compilée

## Licence

MIT

## Remerciements

- [SNCF Open Data](https://numerique.sncf.com/startup/api/) pour l'accès à l'API
- [SvelteKit](https://kit.svelte.dev/) pour le framework web
- [Vite](https://vitejs.dev/) pour le bundler
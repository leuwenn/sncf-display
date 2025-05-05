""
# Tableau d'Affichage SNCF en Temps Réel

Une application web qui affiche en temps réel les tableaux des départs de trains des gares SNCF, avec des données authentiques issues directement de l'API SNCF.

![Capture d'écran du tableau d'affichage](https://via.placeholder.com/800x400?text=Tableau+d%27Affichage+SNCF)

## Fonctionnalités

- 🚅 Affichage des départs de trains en temps réel via l'API SNCF officielle
- 🕒 Horloge en temps réel synchronisée
- 🔄 Mise à jour automatique des données toutes les 60 secondes
- 🚉 Mise en évidence spéciale pour les TGV et affichage visuel des voies
- 🔊 Annonces sonores lors des changements de statut des trains (optionnel)
- 🔍 Recherche et changement de gare
- 📱 Interface responsive qui s'adapte à toutes les tailles d'écran

## Démarrage

### Prérequis

- Node.js 18+
- Une clé API SNCF (obtenue sur [SNCF Open Data](https://data.sncf.com/connexion))

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/votre-username/sncf-display.git
cd sncf-display

# Installer les dépendances
npm install
```

### Configuration de l'API SNCF

Pour que l'application fonctionne, vous devez configurer votre clé API SNCF.

**Méthode recommandée (via script) :**

Utilisez le script de configuration fourni. Il créera le fichier `.env` s'il n'existe pas (à partir de `.env.example`) et y insérera votre clé.

```bash
# Exécutez cette commande en remplaçant par votre clé réelle
npm run config-api votre_clé_api_ici
```

**Méthode manuelle :**

1.  Créez le fichier `.env` à partir de l'exemple s'il n'existe pas :
    ```bash
    npm run setup-env
    ```
2.  Ouvrez le fichier `.env` à la racine du projet et ajoutez votre clé API SNCF :
    ```
    VITE_SNCF_API_KEY=votre_clé_api_ici
    ```
3.  (Optionnel) Pour changer la gare par défaut (initialement Lille Flandres), modifiez les variables suivantes dans le fichier `.env` :
    ```
    VITE_DEFAULT_STATION_ID=identifiant_de_la_gare
    VITE_DEFAULT_STATION_NAME=nom_de_la_gare
    ```

### Lancement

```bash
# Lancer le serveur de développement
npm run dev
```

L'application sera disponible à l'adresse [http://localhost:5173](http://localhost:5173).

## Utilisation

### Données en temps réel uniquement

Cette application utilise exclusivement des données en temps réel issues de l'API SNCF. **Une clé API valide est requise** pour le fonctionnement du tableau d'affichage. Sans clé API configurée dans le fichier `.env`, l'application affichera un message d'erreur avec un lien pour en obtenir une.

### Changement de gare via l'interface

Vous pouvez changer de gare sans modifier le fichier `.env` :

1.  Cliquez sur l'icône 🚉 en haut à gauche de l'écran.
2.  Saisissez le nom de la gare dans le champ de recherche.
3.  Cliquez sur "Rechercher".
4.  Sélectionnez la gare dans les résultats.
5.  Cliquez sur "Enregistrer la gare".

La préférence de gare sera sauvegardée dans le navigateur et utilisée lors de vos prochaines visites.

Les données sont automatiquement mises à jour toutes les 60 secondes, mais vous pouvez forcer une mise à jour en cliquant sur le bouton 🔄 en bas de l'écran.

### Annonces sonores

Vous pouvez activer/désactiver les annonces sonores en cliquant sur le bouton 🔊/🔇 en bas à droite de l'écran.

## Développement

### Structure du projet

```
sncf-display/
├── scripts/
│   └── setup-api-key.js         # Script de configuration de la clé API
├── src/
│   ├── lib/
│   │   ├── AnnouncementPlayer.svelte  # Composant pour les annonces sonores
│   │   ├── ApiConfig.svelte           # Composant de configuration de la gare
│   │   └── sncfApi.ts                 # Service d'interaction avec l'API SNCF
│   ├── routes/
│   │   └── +page.svelte              # Page principale de l'application
│   ├── app.html                      # Template HTML de base
│   └── app.d.ts                      # Types globaux de l'application
├── static/
│   └── favicon.png                   # Favicon
├── .env.example                      # Fichier d'exemple pour les variables d'environnement
├── .env                              # Fichier pour vos variables (NON VERSIONNÉ)
├── package.json
├── svelte.config.js
├── tsconfig.json
└── vite.config.ts
```

### Scripts disponibles

-   `npm run dev` - Lance le serveur de développement.
-   `npm run build` - Compile l'application pour la production.
-   `npm run preview` - Prévisualise la version compilée.
-   `npm run config-api <VOTRE_CLE_API>` - Configure la clé API dans `.env`.
-   `npm run setup-env` - Copie `.env.example` vers `.env` s'il n'existe pas.
-   `npm run check` - Vérifie les types Svelte/TypeScript.

## Licence

MIT

## Remerciements

-   [SNCF Open Data](https://data.sncf.com/pages/api/) pour l'accès à l'API
-   [SvelteKit](https://kit.svelte.dev/) pour le framework web
-   [Vite](https://vitejs.dev/) pour le bundler
""
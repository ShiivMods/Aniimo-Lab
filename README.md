# Aniimo Matchup Lab

Petit outil statique FR/EN pour analyser les affinités élémentaires des Aniimo, gérer une collection locale et proposer des compositions d'équipe.

## Structure

```text
Aniimo Lab/
├── index.html              # Trouver une faiblesse
├── analyse.html            # Analyser un Aniimo
├── team.html               # Votre compo idéale
├── collection.html         # Collection + code de référencement
├── assets/
│   ├── data.js             # Base canonique Aniimo et données de matchup
│   ├── i18n.js             # Textes d'interface FR/EN
│   ├── common.js           # UI commune, langue, recherche, collection, codes
│   ├── matchups.js         # Calculs de matchup
│   ├── weakness.js         # Logique de index.html
│   ├── analyse.js          # Logique de analyse.html
│   ├── team.js             # Logique de team.html
│   ├── collection.js       # Logique de collection.html
│   ├── styles.css          # Styles partagés
│   └── icons/elements/     # Icônes locales des neuf éléments
└── .gitattributes
```

Le dossier dupliqué `site/`, les métadonnées `.git/` et le `package-lock.json` vide ont été retirés de cette version propre. Ils ne sont pas nécessaires au fonctionnement du site.

## Modèle des Aniimo

Un Aniimo n'existe qu'une seule fois dans `assets/data.js`. Chaque fiche possède une clé interne stable et des identités par source/langue sous `sources.fr` et `sources.en`. Les noms et identifiants peuvent donc changer selon la langue sans dupliquer la créature dans la base.

## Collection et confidentialité

La collection est enregistrée localement dans le navigateur via `localStorage` lorsque celui-ci est disponible. Aucun compte ni cookie n'est requis. Le code `AML1` représente uniquement les Aniimo sélectionnés et ne contient aucune donnée de compte ou information personnelle.

## GitHub Pages

Publier le contenu de ce dossier directement à la racine du dépôt. `index.html` doit rester à la racine et le dossier `assets/` doit conserver son arborescence.

## Références des icônes

Les sources des icônes élémentaires sont indiquées dans `assets/icons/elements/SOURCES.txt`. Les fichiers sont servis localement afin d'éviter une dépendance d'affichage à un site tiers.

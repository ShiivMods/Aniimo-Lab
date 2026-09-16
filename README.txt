Aniimo Matchup Lab v5.2

Structure
- index.html: Trouver une faiblesse / Find a weakness
- analyse.html: Analyser un Aniimo / Analyze an Aniimo
- team.html: Votre compo idéale / Ideal team
- collection.html: Collection + code de référencement
- assets/data.js: base canonique Aniimo + IDs/noms propres à chaque source/langue + matchups
- assets/i18n.js: textes d'interface FR/EN
- assets/common.js: UI partagée, langue, autocomplétion, collection et codes portables
- assets/matchups.js: calculs de matchups
- assets/weakness.js, analyse.js, team.js, collection.js: logique de chaque page
- assets/styles.css: styles partagés
- assets/icons/elements/: icônes des neuf éléments, stockées localement

Modèle des Aniimo
Un Aniimo n'existe qu'une seule fois dans la base. Chaque fiche possède une clé interne stable et, sous sources.fr / sources.en, l'identifiant et le nom utilisés par la source de la langue affichée. Cela permet notamment de gérer Somniwing (#084 FR / #030 EN), Irisalis (#083 FR / #10001 EN), Witchin / Hexxin et Little Fire Spirit / Sparkelf sans créer de doublons.

Sources de référence au 16 septembre 2026
- Français : https://aniimofrance.com/aniimos.html (98 Aniimo)
- Anglais : https://aniidex.com/aniimo/ (98 Aniimo)
Les Aniimo qui ne figurent pas dans la source d'une langue ne sont pas affichés dans cette langue.

Collection et confidentialité
La collection est enregistrée localement dans le navigateur lorsque localStorage est disponible. Aucun cookie ni compte n'est requis. Le code AML1 représente uniquement les Aniimo sélectionnés et ne contient aucune donnée de compte ou information personnelle.

GitHub Pages
Placez le contenu de ce dossier à la racine du dépôt publié. index.html doit rester à la racine et le dossier assets/ doit conserver son arborescence.

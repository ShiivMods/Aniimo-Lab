Aniimo Matchup Lab v5

Structure
- index.html: Find a weakness / Trouver une faiblesse
- analyse.html: Analyze an Aniimo / Analyser un Aniimo
- team.html: Ideal team / Compo idéale
- collection.html: Collection + reference code restore
- assets/data.js: Aniimo database and matchup constants
- assets/i18n.js: FR/EN interface text
- assets/common.js: shared UI, language, autocomplete, collection storage and portable codes
- assets/matchups.js: matchup math
- assets/weakness.js, analyse.js, team.js, collection.js: page-specific logic
- assets/styles.css: shared styles

Collection privacy
The collection is stored locally in the browser when localStorage is available. No cookie is required. The portable AML1 reference code only represents the Aniimo selected in the collection; it contains no account or personal data.

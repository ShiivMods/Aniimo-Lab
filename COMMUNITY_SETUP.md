# Shared online features: Supabase setup

Aniimo Lab is hosted as a static GitHub Pages site. Static files alone cannot persist community teams, votes, reports or uploaded translation files for every visitor. The site therefore has two modes.

## Local mode

With the default `assets/community-config.js`, community teams and votes are stored in the current browser only. This is useful for interface testing, but nothing is shared with other visitors and report/translation uploads cannot reach the project owner.

## Online mode with Supabase

1. Create a Supabase project.
2. Open the SQL editor and run `SUPABASE_SETUP.sql`.
3. Copy the project URL and the public anonymous key.
4. Open `assets/community-config.js` and fill:

```js
window.AML_COMMUNITY_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-PUBLIC-ANON-KEY',
  contactEmail: 'your@email.example',
  discordHandle: '@Shiiv14'
};
```

5. Commit and deploy the site normally on GitHub Pages.

The public anonymous key is designed for browser applications. Access is restricted by the Row Level Security policies and RPC functions created by `SUPABASE_SETUP.sql`. Never put a Supabase service-role key in the website.

## Where submissions arrive

The site does not expose a public admin area. You receive submissions in the Supabase dashboard:

- `community_teams`: community team submissions.
- `site_reports`: missing/incorrect information reports.
- `translation_proposals`: translation contribution metadata.
- Storage bucket `feedback-uploads`: screenshots and submitted Excel translation files.

The bucket is private. Public visitors may upload through the site but do not receive public read access to uploaded files.

`contactEmail` is only used to display the optional email contact link under the language selector. No automatic email notification is sent by this version. If email alerts become useful later, add a Supabase Edge Function/webhook rather than exposing mail credentials in the frontend.

## Upvotes without accounts

Aniimo Lab creates a random anonymous token in `localStorage` and sends only its SHA-256 hash to the shared database. Visitors can add or remove their own upvote. Vote rows are not directly readable by the public API; public clients use dedicated RPC functions for vote counts, personal vote state and vote toggling.

This deliberately avoids fingerprinting, email addresses and user accounts. It is not a perfect anti-abuse mechanism: someone can clear browser storage, use private windows or another device to obtain another token. Preventing that completely without an account or stronger identifying data is not realistically possible. If abuse becomes a real problem, prefer server-side rate limiting/moderation over browser fingerprinting.

## Automatic description translation

Only the community team's description is translated. Team name, season, Aniimo names and the rest of the interface are not modified.

The target language defaults to the current site language, but visitors can independently choose another supported target language on each team card. For example, someone using the English interface can translate a description into French.

The current implementation uses the public MyMemory translation endpoint when the visitor explicitly requests a translation. The public community description is therefore sent to that service for translation.

## Translation contribution template

The downloadable template is stored at:

`assets/downloads/Aniimo_Lab_translation_template.xlsx`

It contains:

- English Aniimo IDs/names and technical keys.
- Element keys.
- Spatial profile keys/hints.
- Role values.
- Current English site translation keys.

Aniimo Lab does not yet include a canonical skill database, so skill keys cannot be included until that data is added to the project.

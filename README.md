# Aniimo Lab

Static FR/EN web application for Aniimo matchup and team analysis.

## Pages

- `index.html`: find an Aniimo weakness.
- `analyse.html`: analyze one Aniimo.
- `equipe.html`: analyze a four-Aniimo team.
- `team.html`: generate ideal teams and show matching community teams.
- `communaute.html`: browse, publish, translate and upvote community teams.
- `collection.html`: manage the local collection and portable reference code.

## Main scripts

- `assets/data.js`: canonical Aniimo data with source-specific FR/EN IDs and names.
- `assets/common.js`: shared UI, sidebar, language, autocomplete and collection helpers.
- `assets/matchups.js`: elemental and optional spatial matchup math.
- `assets/team-evaluator.js`: shared four-member team evaluation.
- `assets/community.js`: community storage abstraction, local or Supabase.
- `assets/community-config.js`: optional Supabase public configuration.

## Community backend

The site works without a server. In that default mode, community data is local to the browser. For a real shared community, follow `COMMUNITY_SETUP.md` and run `SUPABASE_SETUP.sql`.

## Development

The project has no build step. Open the folder in VS Code and use Live Server, or run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Feedback and translation contributions

The sidebar now exposes two contribution flows: data/error reports and translation proposals. Shared submissions require the same Supabase setup as the community module; see `COMMUNITY_SETUP.md` and `SUPABASE_SETUP.sql`.

The translation template is available at `assets/downloads/Aniimo_Lab_translation_template.xlsx`.

# Aniimo Lab - current update

- Replaced the single “Analyze an Aniimo” sidebar item with an “Analyzer” disclosure menu.
- Added two Analyzer entries: Aniimo and My Team.
- Added four-member team analysis with coverage, roles, shared weaknesses and discreet replacement suggestions.
- Added autocomplete/selectable Aniimo suggestions to every Aniimo search field, including collection and community searches.
- Added a Community Teams page with seasons, team names, four Aniimo, descriptions, automatic translation and upvotes.
- Added local community storage for development and a Supabase-ready online storage adapter for real cross-user persistence.
- Added anonymous browser voting tokens with one normal vote per browser/team and database uniqueness support.
- Split Ideal Team results into “Suggested by the site” and “Seen in the community”.
- Community suggestions are filtered by selected favorite Aniimo and ranked primarily by upvotes.
- Added backend setup documentation and SQL for Supabase.

## 2026-09-18 - Feedback, translations and community vote controls

- French element label `Ténèbres` renamed to `Ombre`.
- Improved spatial-profile and selected-element contrast in the dark interface.
- Community upvotes can now be removed as well as added.
- Account-free remote voting moved behind Supabase RPCs; browser vote tokens are SHA-256 hashed and vote rows are no longer directly public.
- Community description translation now affects the description only.
- Translation target defaults to the current site language but can be changed independently per team card.
- Added global “Report incorrect/missing information” dialog with subject, language, description and screenshot uploads.
- Added “Propose your translation” dialog with language selection, downloadable Excel template and completed-workbook upload.
- Added private Supabase storage/table setup for reports and translation submissions.
- Added optional Discord/email translator contact information below the language selector.
- Added `assets/downloads/Aniimo_Lab_translation_template.xlsx`.

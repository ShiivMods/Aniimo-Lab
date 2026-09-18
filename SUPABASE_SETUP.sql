-- Aniimo Lab shared backend for community teams, votes, reports and translation proposals.
-- Run in the Supabase SQL editor. Safe to rerun.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Community teams
-- -----------------------------------------------------------------------------
create table if not exists public.community_teams (
  id uuid primary key default gen_random_uuid(),
  season varchar(60) not null check (char_length(trim(season)) between 1 and 60),
  name varchar(80) not null check (char_length(trim(name)) between 1 and 80),
  aniimos text[] not null check (
    cardinality(aniimos) = 4
    and aniimos[1] <> aniimos[2]
    and aniimos[1] <> aniimos[3]
    and aniimos[1] <> aniimos[4]
    and aniimos[2] <> aniimos[3]
    and aniimos[2] <> aniimos[4]
    and aniimos[3] <> aniimos[4]
  ),
  description varchar(1500) not null default '',
  language varchar(2) not null default 'en' check (language in ('fr', 'en')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_votes (
  team_id uuid not null references public.community_teams(id) on delete cascade,
  voter_id varchar(100) not null check (char_length(voter_id) between 8 and 100),
  created_at timestamptz not null default now(),
  primary key (team_id, voter_id)
);

alter table public.community_teams enable row level security;
alter table public.community_votes enable row level security;

drop policy if exists "community teams are public" on public.community_teams;
create policy "community teams are public"
on public.community_teams for select
to anon, authenticated
using (true);

drop policy if exists "any visitor may publish a team" on public.community_teams;
create policy "any visitor may publish a team"
on public.community_teams for insert
to anon, authenticated
with check (
  cardinality(aniimos) = 4
  and char_length(trim(season)) between 1 and 60
  and char_length(trim(name)) between 1 and 80
  and char_length(description) <= 1500
  and language in ('fr', 'en')
);

-- Votes are intentionally NOT directly readable/writable by visitors.
-- Public clients only use the SECURITY DEFINER RPCs below. The browser token is
-- SHA-256 hashed before it reaches the database and is not exposed by the API.
drop policy if exists "community votes are readable" on public.community_votes;
drop policy if exists "any visitor may upvote once per token" on public.community_votes;
revoke all on public.community_votes from anon, authenticated;

create or replace function public.community_vote_counts()
returns table(team_id uuid, votes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select v.team_id, count(*)::bigint as votes
  from public.community_votes v
  group by v.team_id;
$$;

create or replace function public.community_vote_state(p_voter_hash text)
returns table(team_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select v.team_id
  from public.community_votes v
  where v.voter_id = p_voter_hash;
$$;

create or replace function public.toggle_community_vote(p_team_id uuid, p_voter_hash text)
returns table(voted boolean, votes bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voted boolean;
  v_votes bigint;
begin
  if p_voter_hash is null or char_length(p_voter_hash) not between 8 and 100 then
    raise exception 'invalid voter token';
  end if;

  if exists (
    select 1 from public.community_votes
    where team_id = p_team_id and voter_id = p_voter_hash
  ) then
    delete from public.community_votes
    where team_id = p_team_id and voter_id = p_voter_hash;
    v_voted := false;
  else
    insert into public.community_votes(team_id, voter_id)
    values (p_team_id, p_voter_hash)
    on conflict do nothing;
    v_voted := true;
  end if;

  select count(*)::bigint into v_votes
  from public.community_votes
  where team_id = p_team_id;

  return query select v_voted, v_votes;
end;
$$;

grant select, insert on public.community_teams to anon, authenticated;
grant execute on function public.community_vote_counts() to anon, authenticated;
grant execute on function public.community_vote_state(text) to anon, authenticated;
grant execute on function public.toggle_community_vote(uuid, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- User reports and translation contributions
-- These tables have INSERT-only access for public visitors. Nothing is exposed
-- back to the public site; submissions are reviewed in the Supabase dashboard.
-- -----------------------------------------------------------------------------
create table if not exists public.site_reports (
  id uuid primary key default gen_random_uuid(),
  category varchar(32) not null check (category in ('data_issue', 'other')),
  language varchar(16) not null check (language in ('all', 'fr', 'en')),
  description varchar(3000) not null check (char_length(trim(description)) between 1 and 3000),
  screenshot_paths text[] not null default '{}',
  page_path varchar(500) not null default '',
  ui_language varchar(16) not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.translation_proposals (
  id uuid primary key default gen_random_uuid(),
  language varchar(80) not null check (char_length(trim(language)) between 1 and 80),
  notes varchar(1500) not null default '',
  file_path varchar(500) not null,
  page_path varchar(500) not null default '',
  ui_language varchar(16) not null default 'en',
  created_at timestamptz not null default now()
);

alter table public.site_reports enable row level security;
alter table public.translation_proposals enable row level security;

drop policy if exists "visitors may submit reports" on public.site_reports;
create policy "visitors may submit reports"
on public.site_reports for insert
to anon, authenticated
with check (
  category in ('data_issue', 'other')
  and language in ('all', 'fr', 'en')
  and char_length(trim(description)) between 1 and 3000
);

drop policy if exists "visitors may submit translations" on public.translation_proposals;
create policy "visitors may submit translations"
on public.translation_proposals for insert
to anon, authenticated
with check (
  char_length(trim(language)) between 1 and 80
  and char_length(notes) <= 1500
  and char_length(file_path) between 1 and 500
);

grant insert on public.site_reports to anon, authenticated;
grant insert on public.translation_proposals to anon, authenticated;

-- Private storage bucket for screenshots and translation spreadsheets.
insert into storage.buckets (id, name, public)
values ('feedback-uploads', 'feedback-uploads', false)
on conflict (id) do update set public = false;

drop policy if exists "visitors may upload feedback files" on storage.objects;
create policy "visitors may upload feedback files"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'feedback-uploads');

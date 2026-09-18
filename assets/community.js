/* Community team storage. Uses Supabase when configured, otherwise localStorage. */
(function() {
  'use strict';

  const A = window.AML;
  const config = window.AML_COMMUNITY_CONFIG || {};
  const localTeamsKey = 'aml_community_teams_v1';
  const localVotesKey = 'aml_community_votes_v1';
  const voterKey = 'aml_voter_id';

  const remote = Boolean(config.supabaseUrl && config.anonKey);
  let voterHashPromise = null;

  function parse(key, fallback) {
    try {
      return JSON.parse(A.safeGet(key, JSON.stringify(fallback)));
    } catch {
      return fallback;
    }
  }

  function voterId() {
    let value = A.safeGet(voterKey, '');
    if (!value) {
      value = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      A.safeSet(voterKey, value);
    }
    return value;
  }

  async function voterHash() {
    if (voterHashPromise) return voterHashPromise;
    voterHashPromise = (async () => {
      const raw = voterId();
      if (!globalThis.crypto?.subtle) return raw;
      const bytes = new TextEncoder().encode(raw);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
    })();
    return voterHashPromise;
  }

  function headers(extra = {}) {
    return {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      ...extra
    };
  }

  async function request(path, options = {}) {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: headers(options.headers || {})
    });
    if (!response.ok) throw new Error(`Community API ${response.status}`);
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function rpc(name, body = {}) {
    return request(`rpc/${name}`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  function normalizeTeam(team, votes = 0, voted = false) {
    return {
      id: String(team.id),
      season: String(team.season || '').slice(0, 60),
      name: String(team.name || '').slice(0, 80),
      aniimos: Array.isArray(team.aniimos) ? team.aniimos.slice(0, 4) : [],
      description: String(team.description || '').slice(0, 1500),
      language: team.language === 'fr' ? 'fr' : 'en',
      createdAt: team.created_at || team.createdAt || new Date().toISOString(),
      votes,
      voted
    };
  }

  async function listTeams() {
    if (!remote) {
      const teams = parse(localTeamsKey, []);
      const votes = parse(localVotesKey, {});
      const id = voterId();
      return teams.map(team => normalizeTeam(
        team,
        Array.isArray(votes[team.id]) ? votes[team.id].length : 0,
        Array.isArray(votes[team.id]) && votes[team.id].includes(id)
      )).sort((a, b) => b.votes - a.votes || new Date(b.createdAt) - new Date(a.createdAt));
    }

    const hash = await voterHash();
    const [teams, counts, mine] = await Promise.all([
      request('community_teams?select=id,season,name,aniimos,description,language,created_at&order=created_at.desc'),
      rpc('community_vote_counts'),
      rpc('community_vote_state', { p_voter_hash: hash })
    ]);

    const voteMap = new Map((counts || []).map(row => [String(row.team_id), Number(row.votes) || 0]));
    const mineSet = new Set((mine || []).map(row => String(row.team_id)));
    return (teams || []).map(team => normalizeTeam(
      team,
      voteMap.get(String(team.id)) || 0,
      mineSet.has(String(team.id))
    )).sort((a, b) => b.votes - a.votes || new Date(b.createdAt) - new Date(a.createdAt));
  }

  async function createTeam(payload) {
    const clean = normalizeTeam({
      id: globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...payload,
      language: A.lang,
      createdAt: new Date().toISOString()
    });

    if (clean.aniimos.length !== 4 || new Set(clean.aniimos).size !== 4) throw new Error('TEAM_SIZE');
    if (!clean.season.trim() || !clean.name.trim()) throw new Error('REQUIRED');

    if (!remote) {
      const teams = parse(localTeamsKey, []);
      teams.unshift(clean);
      A.safeSet(localTeamsKey, JSON.stringify(teams));
      return clean;
    }

    const created = await request('community_teams', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        season: clean.season,
        name: clean.name,
        aniimos: clean.aniimos,
        description: clean.description,
        language: clean.language
      })
    });
    return normalizeTeam(created[0]);
  }

  async function toggleVote(teamId) {
    if (!remote) {
      const id = voterId();
      const votes = parse(localVotesKey, {});
      const list = Array.isArray(votes[teamId]) ? votes[teamId] : [];
      const index = list.indexOf(id);
      let voted;

      if (index >= 0) {
        list.splice(index, 1);
        voted = false;
      } else {
        list.push(id);
        voted = true;
      }

      votes[teamId] = list;
      A.safeSet(localVotesKey, JSON.stringify(votes));
      return { voted, votes: list.length };
    }

    const result = await rpc('toggle_community_vote', {
      p_team_id: teamId,
      p_voter_hash: await voterHash()
    });
    return result?.[0] || { voted: false, votes: 0 };
  }

  function splitTranslationText(text, max = 420) {
    const source = String(text || '').trim();
    if (!source) return [];
    const chunks = [];
    let remaining = source;

    while (remaining.length > max) {
      let cut = Math.max(
        remaining.lastIndexOf('\n', max),
        remaining.lastIndexOf('. ', max),
        remaining.lastIndexOf('! ', max),
        remaining.lastIndexOf('? ', max),
        remaining.lastIndexOf(' ', max)
      );
      if (cut < Math.floor(max * 0.55)) cut = max;
      const end = cut < remaining.length && remaining[cut] === ' ' ? cut : cut + 1;
      chunks.push(remaining.slice(0, end).trim());
      remaining = remaining.slice(end).trimStart();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  }

  async function translateDescription(text, sourceLanguage, targetLanguage) {
    if (!text || sourceLanguage === targetLanguage) return text;
    const chunks = splitTranslationText(text);
    const translated = [];

    for (const chunk of chunks) {
      const url = new URL('https://api.mymemory.translated.net/get');
      url.searchParams.set('q', chunk);
      url.searchParams.set('langpair', `${sourceLanguage}|${targetLanguage}`);
      const response = await fetch(url.href);
      if (!response.ok) throw new Error('TRANSLATE');
      const data = await response.json();
      translated.push(data?.responseData?.translatedText || chunk);
    }

    return translated.join(' ');
  }

  window.AML_COMMUNITY = {
    remote,
    listTeams,
    createTeam,
    toggleVote,
    translateDescription
  };
})();

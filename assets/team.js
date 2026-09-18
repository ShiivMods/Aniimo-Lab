/* Page logic: suggest four-member teams and surface matching community teams. */
(function() {
  'use strict';

  const A = window.AML;
  const D = A.data;
  const T = window.AML_TEAM;
  const C = window.AML_COMMUNITY;
  let favorites = [];
  let communityTeams = [];

  const empty = text => `<div class="empty">${text}</div>`;

  function updateFavorites() {
    document.getElementById('fav-limit').textContent = `${favorites.length} / 3`;
    document.getElementById('favchips').innerHTML = favorites.length
      ? favorites.map(key => {
          const aniimo = A.getAniimoByKey(key);
          return `
            <div class="favchip">
              ${A.iconGroup(aniimo.elements, 'sm')}
              <div>
                <strong>${A.esc(A.nameOf(aniimo))}</strong>
                <div class="row-meta">${A.esc(aniimo.role)}</div>
              </div>
              <button data-remove="${aniimo.key}" aria-label="${A.esc(A.t('remove'))}">×</button>
            </div>
          `;
        }).join('')
      : empty(A.t('selectFavorite'));

    document.querySelectorAll('[data-remove]').forEach(button => {
      button.onclick = () => {
        favorites = favorites.filter(key => key !== button.dataset.remove);
        updateFavorites();
      };
    });

    renderTeams();
    renderCommunityTeams();
  }

  function add(aniimo) {
    if (!aniimo) return;
    if (favorites.includes(aniimo.key)) {
      document.getElementById('team-search').value = '';
      return;
    }
    if (favorites.length >= 3) {
      document.getElementById('team-notice').innerHTML = `<div class="notice">${A.t('maxFavorites')}</div>`;
      return;
    }
    favorites.push(aniimo.key);
    document.getElementById('team-search').value = '';
    updateFavorites();
  }

  function combinations(arr, k, cb, start = 0, pick = []) {
    if (k === 0) {
      cb([...pick]);
      return;
    }
    for (let i = start; i <= arr.length - k; i++) {
      pick.push(arr[i]);
      combinations(arr, k - 1, cb, i + 1, pick);
      pick.pop();
    }
  }

  function teamCard(result, rank, useRoles) {
    return `
      <div class="teamcard">
        <div class="teamtop">
          <strong>${A.t('suggestion', rank)}</strong>
          <div class="teammeta">${A.t('analysisScore', result.metrics.score)} · ${A.t('coverage', result.metrics.coverage.length)}</div>
        </div>
        <div class="team-members">
          ${result.team.map(aniimo => `
            <div class="member ${favorites.includes(aniimo.key) ? 'favorite' : ''}">
              ${favorites.includes(aniimo.key) ? '<span class="star">★</span>' : ''}
              <div class="member-icons">${aniimo.elements.map(e => A.iconSvg(e, 'sm')).join('')}</div>
              <div class="member-name" title="${A.esc(A.nameOf(aniimo))}">${A.esc(A.nameOf(aniimo))}</div>
              <div class="member-role">${A.esc(aniimo.role)}</div>
            </div>
          `).join('')}
        </div>
        <div class="coverage">
          <span class="metric">${A.t('coverage', result.metrics.coverage.length)}</span>
          ${useRoles ? `<span class="metric">${result.metrics.roles.hasDps && result.metrics.roles.hasBreak ? A.t('rolesOk') : A.t('rolesPartial')}</span>` : ''}
        </div>
      </div>
    `;
  }

  function renderTeams() {
    const results = document.getElementById('team-results');
    const notice = document.getElementById('team-notice');
    notice.innerHTML = '';
    results.innerHTML = '';

    const favs = favorites.map(A.getAniimoByKey).filter(Boolean);
    const ownedOnly = document.getElementById('owned-only').checked;
    const useRoles = document.getElementById('use-roles').checked;
    document.getElementById('team-context').textContent = `${favs.length}/3 · ${ownedOnly ? A.t('ownedOnly') : A.t('teamSize')}`;

    if (!favs.length) {
      notice.innerHTML = `<div class="notice subtle-notice">${A.t('selectFavorite')}</div>`;
      return;
    }
    if (ownedOnly && favs.some(a => !A.owned.has(a.key))) {
      notice.innerHTML = `<div class="notice">${A.t('favoriteNotOwned')}</div>`;
      return;
    }

    const pool = A.visibleAniimos.filter(a => !favorites.includes(a.key) && (!ownedOnly || A.owned.has(a.key)));
    if (pool.length + favs.length < 4) {
      notice.innerHTML = `<div class="notice">${A.t('needFour')}</div>`;
      return;
    }

    const needed = 4 - favs.length;
    const best = [];
    combinations(pool, needed, extra => {
      const team = [...favs, ...extra];
      const metrics = T.evaluateTeam(team, useRoles);
      const item = { team, metrics };
      let pos = best.findIndex(x => metrics.score > x.metrics.score);
      if (pos < 0) pos = best.length;
      best.splice(pos, 0, item);
      if (best.length > 8) best.pop();
    });

    results.innerHTML = best.length
      ? best.map((item, index) => teamCard(item, index + 1, useRoles)).join('')
      : `<div class="notice">${A.t('noTeam')}</div>`;
  }

  function communityCard(team) {
    const members = team.aniimos.map(A.getAniimoByKey).filter(a => a && A.sourceOf(a));
    return `
      <article class="community-card compact-community-card">
        <div class="community-card-head">
          <div>
            <span class="community-season">${A.esc(team.season)}</span>
            <h3>${A.esc(team.name)}</h3>
          </div>
          <button
            class="upvote-button ${team.voted ? 'voted' : ''}"
            data-team-upvote="${A.esc(team.id)}"
            type="button"
            title="${A.esc(team.voted ? A.t('removeUpvote') : A.t('upvote'))}"
            aria-pressed="${team.voted ? 'true' : 'false'}"
          >▲ <span>${team.votes}</span></button>
        </div>
        <div class="community-members">
          ${members.map(aniimo => `
            <div class="community-member">
              ${A.iconGroup(aniimo.elements, 'sm')}
              <div><strong>${A.esc(A.nameOf(aniimo))}</strong><small>${A.esc(aniimo.role)}</small></div>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  }

  function renderCommunityTeams() {
    const root = document.getElementById('team-community-results');
    const notice = document.getElementById('team-community-notice');
    notice.innerHTML = '';

    if (!favorites.length) {
      root.innerHTML = '';
      notice.innerHTML = `<div class="notice subtle-notice">${A.t('communityNeedsFavorite')}</div>`;
      return;
    }

    const ownedOnly = document.getElementById('owned-only').checked;
    const matches = communityTeams.filter(team => {
      const hasFavorites = favorites.every(key => team.aniimos.includes(key));
      const ownedMatch = !ownedOnly || team.aniimos.every(key => A.owned.has(key));
      return hasFavorites && ownedMatch;
    }).sort((a, b) => b.votes - a.votes || new Date(b.createdAt) - new Date(a.createdAt));

    root.innerHTML = matches.length
      ? matches.slice(0, 6).map(communityCard).join('')
      : '';
    if (!matches.length) notice.innerHTML = `<div class="notice subtle-notice">${A.t('noCommunityMatch')}</div>`;

    document.querySelectorAll('[data-team-upvote]').forEach(button => {
      button.onclick = async () => {
        button.disabled = true;
        try {
          await C.toggleVote(button.dataset.teamUpvote);
          await loadCommunity();
        } catch {
          button.disabled = false;
        }
      };
    });
  }

  async function loadCommunity() {
    try {
      communityTeams = await C.listTeams();
    } catch {
      communityTeams = [];
    }
    renderCommunityTeams();
  }

  const input = document.getElementById('team-search');
  let pending = null;
  A.autocomplete(input, aniimo => {
    pending = aniimo;
    add(aniimo);
  }, { openEmpty: false });
  input.addEventListener('input', () => { pending = null; });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && pending) {
      event.preventDefault();
      add(pending);
    }
  });

  document.getElementById('team-add').onclick = () => add(A.exactAniimo(input.value));
  document.getElementById('owned-only').onchange = () => { renderTeams(); renderCommunityTeams(); };
  document.getElementById('use-roles').onchange = renderTeams;
  document.addEventListener('aml:collection-changed', () => { renderTeams(); renderCommunityTeams(); });

  updateFavorites();
  loadCommunity();
})();

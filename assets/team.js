/* Page logic: suggest four-member teams. */
(function() {
  'use strict';
  const A = window.AML, D = A.data, M = window.AML_MATCH;
  let favorites = [];
  const empty = x => `<div class="empty">${x}</div>`;

  function updateFavorites() {
    document.getElementById('fav-limit').textContent = `${favorites.length} / 3`;
    document.getElementById('favchips').innerHTML = favorites.length ? favorites.map(k => {
      const a = D.aniimos.find(x => x.key === k);
      return `<div class="favchip">${A.iconGroup(a.elements,'sm')}<div><strong>${A.esc(A.nameOf(a))}</strong><div class="row-meta">${A.esc(a.role)}</div></div><button data-remove="${a.key}" aria-label="Remove">×</button></div>`
    }).join(''): empty(A.t('selectFavorite'));
    document.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {
      favorites = favorites.filter(x => x !== b.dataset.remove);
      updateFavorites()
    });
    renderTeams()
  }

  function add(a) {
    if (!a) return;
    if (favorites.includes(a.key)) {
      document.getElementById('team-search').value = '';
      return
    }
    if (favorites.length >= 3) {
      document.getElementById('team-notice').innerHTML = `<div class="notice">${A.t('maxFavorites')}</div>`;
      return
    }
    favorites.push(a.key);
    document.getElementById('team-search').value = '';
    updateFavorites()
  }

  function teamScore(team, useRoles) {
    let score = 0, coverage = 0;
    for (const d of D.elementOrder) {
      let best = 1;
      for (const a of team) best = Math.max(best, M.bestOffenseScore(a.elements, [d]));
      if (best > 1.001) {
        coverage++;
        score += 12
      } else score += 2
    }
    score += new Set(team.flatMap(a => a.elements)).size * 3;
    for (const incoming of D.elementOrder) {
      let weakN = 0, resN = 0;
      for (const a of team) {
        const v = M.defenseElementScore(incoming, a.elements);
        if (v > 1.001) weakN++;
        else if (v < .999) resN++
      }
      if (weakN >= 3) score -= 10 + (weakN - 3) * 6;
      if (resN >= 2) score += 2
    }
    let roleOk = true;
    if (useRoles) {
      const rs = team.map(a => a.role), hasD = rs.includes('DPS'), hasB = rs.includes('BREAK'), hasS = rs.some(r => ['SUPPORT', 'HEAL', 'REGEN', 'TANK'].includes(r));
      score += (hasD ? 28: - 32) + (hasB ? 28: - 32) + (hasS ? 16: - 8) + new Set(rs).size * 3;
      roleOk = hasD && hasB
    }
    return {
      score, coverage, roleOk
    }
  }

  function combinations(arr, k, cb, start = 0, pick = []) {
    if (k === 0) {
      cb(pick);
      return
    }
    for (let i = start; i <= arr.length - k; i++) {
      pick.push(arr[i]);
      combinations(arr, k - 1, cb, i + 1, pick);
      pick.pop()
    }
  }

  function teamCard(r, rank, useRoles) {
    return `<div class="teamcard"><div class="teamtop"><strong>${A.t('suggestion',rank)}</strong><div class="teammeta">${A.t('coverage',r.coverage)}</div></div><div class="team-members">${r.team.map(a=>`<div class="member ${favorites.includes(a.key)?'favorite':''}">${favorites.includes(a.key)?'<span class="star">★</span>':''}<div class="member-icons">${a.elements.map(e=>A.iconSvg(e,'sm')).join('')}</div><div class="member-name" title="${A.esc(A.nameOf(a))}">${A.esc(A.nameOf(a))}</div><div class="member-role">${A.esc(a.role)}</div></div>`).join('')}</div><div class="coverage"><span class="metric">${A.t('coverage',r.coverage)}</span>${useRoles?`<span class="metric">${r.roleOk?A.t('rolesOk'):A.t('rolesPartial')}</span>`:''}</div></div>`
  }

  function renderTeams() {
    const results = document.getElementById('team-results'), notice = document.getElementById('team-notice');
    notice.innerHTML = '';
    results.innerHTML = '';
    const favs = favorites.map(k => D.aniimos.find(a => a.key === k)).filter(Boolean), ownedOnly = document.getElementById('owned-only').checked, useRoles = document.getElementById('use-roles').checked;
    document.getElementById('team-context').textContent = `${favs.length}/3 · ${ownedOnly?A.t('ownedOnly'):A.t('teamSize')}`;
    if (!favs.length) {
      notice.innerHTML = `<div class="notice">${A.t('selectFavorite')}</div>`;
      return
    }
    if (ownedOnly && favs.some(a => !A.owned.has(a.key))) {
      notice.innerHTML = `<div class="notice">${A.t('favoriteNotOwned')}</div>`;
      return
    }
    const pool = A.visibleAniimos.filter(a => !favorites.includes(a.key) && (!ownedOnly || A.owned.has(a.key)));
    if (pool.length + favs.length < 4) {
      notice.innerHTML = `<div class="notice">${A.t('needFour')}</div>`;
      return
    }
    const needed = 4 - favs.length, best = [];
    combinations(pool, needed, extra => {
      const team = [...favs, ...extra], m = teamScore(team, useRoles), item = {
        team, ...m
      };
      let pos = best.findIndex(x => item.score > x.score);
      if (pos < 0) pos = best.length;
      best.splice(pos, 0, item);
      if (best.length > 8) best.pop()
    });
    results.innerHTML = best.length ? best.map((r, i) => teamCard(r, i + 1, useRoles)).join(''): `<div class="notice">${A.t('noTeam')}</div>`
  }
  const input = document.getElementById('team-search');
  let pending = null;
  A.autocomplete(input, a => {
    pending = a;
    add(a)
  }, {
    openEmpty: false
  });
  input.addEventListener('input', () => pending = null);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && pending) {
      e.preventDefault();
      add(pending)
    }
  });
  document.getElementById('team-add').onclick = () => add(A.exactAniimo(input.value));
  document.getElementById('owned-only').onchange = renderTeams;
  document.getElementById('use-roles').onchange = renderTeams;
  document.addEventListener('aml:collection-changed', renderTeams);
  updateFavorites();
})();
